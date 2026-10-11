#!/usr/bin/env node
/**
 * Backend load-test runner.
 *
 *   # against a backend you already have running
 *   npm run test:load -- --profile=smoke  --target=problem
 *   npm run test:load -- --profile=normal --target=submission --user-id=<id> --problem-id=<id>
 *
 *   # self-contained: boots the isolated test infrastructure + the target
 *   # service(s), seeds fixtures, measures, then tears everything down
 *   npm run test:load -- --infra --profile=smoke --target=all
 *
 * Profiles (concurrency / total requests, overridable with --concurrency /
 * --requests):
 *   smoke   -  10 concurrent,   100 requests  (fast sanity check)
 *   normal  -  50 concurrent, 1,000 requests  (expected production-ish load)
 *   stress  - 200 concurrent, 5,000 requests  (find the breaking point)
 *
 * It reports latency percentiles, throughput and a status-code breakdown, and
 * writes a JSON artifact under test-artifacts/load/ for comparison across runs.
 * Numbers are measured, never estimated: the summary reflects one real run.
 *
 * Note: the submission target measures submission INGESTION (HTTP + Mongo +
 * RabbitMQ publish). The evaluation worker is intentionally left out of the load
 * path, so queued work does not distort the latency sample.
 */
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import {
    ROOT,
    TEST_MONGO_URL,
    TEST_RABBITMQ_URL,
    awaitService,
    compose,
    dockerAvailable,
    makeLogger,
    startService,
    stopServices,
    tailLog,
} from "../lib/harness.mjs";

const log = makeLogger("load");

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const valueOf = (flag) => {
    const match = args.find((arg) => arg.startsWith(`${flag}=`));
    if (match) return match.slice(flag.length + 1);

    const index = args.indexOf(flag);
    if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
        return args[index + 1];
    }

    return undefined;
};

if (hasFlag("--help") || hasFlag("-h")) {
    console.log(
        `Usage: node scripts/load/run-load.mjs [options]

Options:
  --profile=smoke|normal|stress   load profile (default: smoke)
  --target=problem|submission|all which endpoint to drive (default: problem)
  --infra                         boot isolated infra + services automatically
  --url=<base-url>                override the target service base URL
  --concurrency=<n>               override the profile concurrency
  --requests=<n>                  override the profile request count
  --user-id=<mongo-object-id>     x-user-id for the submission target
  --problem-id=<mongo-object-id>  problemId for the submission target
  --max-error-rate=<0..1>         fail the run above this failure ratio (default 0.01)
  --timeout=<ms>                  hard wall-clock cap for the run
  --keep                          with --infra, leave the stack running
  --json-out=<path>               where to write the JSON artifact`
    );
    process.exit(0);
}

const PROFILES = {
    smoke: { concurrency: 10, requests: 100 },
    normal: { concurrency: 50, requests: 1_000 },
    stress: { concurrency: 200, requests: 5_000 },
};

const profileName = valueOf("--profile") || "smoke";
const profile = PROFILES[profileName];

if (!profile) {
    console.error(
        `Unknown profile "${profileName}". Choose one of: ${Object.keys(PROFILES).join(", ")}`
    );
    process.exit(2);
}

const concurrency = Number(valueOf("--concurrency") || profile.concurrency);
const totalRequests = Number(valueOf("--requests") || profile.requests);
const maxErrorRate = Number(valueOf("--max-error-rate") ?? "0.01");
const wallClockTimeoutMs = Number(valueOf("--timeout") || 300_000);

const targetArg = valueOf("--target") || "problem";
const targets = targetArg === "all" ? ["problem", "submission"] : [targetArg];

for (const target of targets) {
    if (target !== "problem" && target !== "submission") {
        console.error(`Unknown target "${target}". Choose problem, submission or all.`);
        process.exit(2);
    }
}

const infra = hasFlag("--infra");
const keep = hasFlag("--keep");

const LOAD_DB = "lcarena_load";
const ARTIFACTS_DIR = path.join(ROOT, "test-artifacts", "load");

const PROBLEM_PORT = 3101;
const SUBMISSION_PORT = 3102;

const problemUrl =
    valueOf("--url") && targets.length === 1 && targets[0] === "problem"
        ? valueOf("--url")
        : process.env.PROBLEM_SERVICE_URL ||
          (infra ? `http://127.0.0.1:${PROBLEM_PORT}` : "http://127.0.0.1:3001");

const submissionUrl =
    valueOf("--url") && targets.length === 1 && targets[0] === "submission"
        ? valueOf("--url")
        : process.env.SUBMISSION_SERVICE_URL ||
          (infra ? `http://127.0.0.1:${SUBMISSION_PORT}` : "http://127.0.0.1:3002");

const startedServices = [];
let infraUp = false;

const percentile = (sorted, p) => {
    if (sorted.length === 0) return 0;
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
    );
    return sorted[index];
};

const round = (value) => Math.round(value * 100) / 100;

/**
 * Closed-loop driver: `concurrency` workers pull from a shared request counter
 * until `total` requests have been issued or the wall clock runs out.
 */
const drive = async ({ url, method, headers, body, perRequestTimeoutMs = 30_000 }) => {
    const latencies = [];
    const statusCounts = new Map();
    let issued = 0;
    let failed = 0;
    let aborted = false;
    let nextIndex = 0;

    const start = performance.now();
    const deadline = start + wallClockTimeoutMs;

    const worker = async () => {
        while (!aborted) {
            const index = nextIndex++;

            if (index >= totalRequests) return;

            const requestStart = performance.now();

            try {
                const response = await fetch(url, {
                    method,
                    headers,
                    body,
                    signal: AbortSignal.timeout(perRequestTimeoutMs),
                });

                await response.arrayBuffer(); // drain the body like a real client

                latencies.push(performance.now() - requestStart);
                statusCounts.set(
                    response.status,
                    (statusCounts.get(response.status) || 0) + 1
                );

                if (!response.ok) failed++;
            } catch (error) {
                latencies.push(performance.now() - requestStart);
                failed++;
                const key = error?.name === "TimeoutError" ? "timeout" : "network-error";
                statusCounts.set(key, (statusCounts.get(key) || 0) + 1);
            } finally {
                issued++;
            }

            if (performance.now() > deadline) aborted = true;
        }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));

    const durationMs = performance.now() - start;
    const sorted = [...latencies].sort((a, b) => a - b);

    const sum = sorted.reduce((acc, value) => acc + value, 0);

    return {
        requests: issued,
        completed: sorted.length,
        failed,
        errorRate: sorted.length === 0 ? 0 : failed / sorted.length,
        durationMs: round(durationMs),
        throughput: round((sorted.length / durationMs) * 1000),
        latencyMs: {
            min: round(sorted[0] ?? 0),
            mean: round(sorted.length === 0 ? 0 : sum / sorted.length),
            p50: round(percentile(sorted, 50)),
            p90: round(percentile(sorted, 90)),
            p95: round(percentile(sorted, 95)),
            p99: round(percentile(sorted, 99)),
            max: round(sorted[sorted.length - 1] ?? 0),
        },
        statuses: Object.fromEntries([...statusCounts.entries()].sort()),
    };
};

const seedFixtures = async () => {
    const client = new MongoClient(TEST_MONGO_URL, { serverSelectionTimeoutMS: 5_000 });
    await client.connect();

    try {
        const db = client.db(LOAD_DB);
        const users = db.collection("users");
        const problems = db.collection("problems");
        const now = new Date();

        const marker = "load-test@lcarena.local";
        await users.deleteMany({ email: marker });

        const user = await users.insertOne({
            name: "Load Test User",
            email: marker,
            password: "$2b$10$loadtesthash01234567890123456789012345678901234567890123",
            profilePicUrl: "/default-url",
            userType: "Regular",
            roleExpiry: null,
            createdAt: now,
            updatedAt: now,
        });

        const problem = await problems.insertOne({
            description: "Load-test fixture problem generated by run-load.mjs",
            difficulty: "Easy",
            sampleTestCaseUrl: "https://seed.lcarena.local/load/sample.txt",
            testCasesUrl: "https://seed.lcarena.local/load/testcases.zip",
            time_limit: 2000,
            createdAt: now,
            updatedAt: now,
        });

        return {
            userId: String(user.insertedId),
            problemId: String(problem.insertedId),
        };
    } finally {
        await client.close();
    }
};

const buildScenario = (target, fixtures) => {
    if (target === "problem") {
        return {
            target,
            method: "GET",
            url: `${problemUrl}/`,
            headers: {},
            body: undefined,
        };
    }

    const userId = valueOf("--user-id") || process.env.TEST_USER_ID || fixtures?.userId;
    const problemId =
        valueOf("--problem-id") || process.env.TEST_PROBLEM_ID || fixtures?.problemId;

    if (!userId || !problemId) {
        console.error(
            "[load] the submission target needs a real user and problem id. Pass --user-id/--problem-id, " +
                "or run with --infra to seed them automatically."
        );
        process.exit(2);
    }

    return {
        target,
        method: "POST",
        url: `${submissionUrl}/`,
        headers: {
            "content-type": "application/json",
            "x-user-id": userId,
        },
        body: JSON.stringify({
            problemId,
            code: "function solve(a, b) { return a + b; }",
            language: "js",
        }),
    };
};

let teardownDone = false;
const teardown = async () => {
    if (teardownDone) return;
    teardownDone = true;

    await stopServices(startedServices);

    if (infraUp && !keep) {
        log("removing isolated test infrastructure");
        await compose(["down", "-v", "--remove-orphans"]);
        infraUp = false;
    } else if (infraUp && keep) {
        log(`leaving the test stack running; remove it with:`);
        log(
            "  docker compose -p lcarena-test -f docker-compose.test.yml down -v"
        );
    }
};

const shutdown = async (signal, exitCode) => {
    if (signal) log(`received ${signal}, cleaning up`);
    await teardown();
    process.exit(exitCode);
};

process.on("SIGINT", () => void shutdown("SIGINT", 130));
process.on("SIGTERM", () => void shutdown("SIGTERM", 143));

const main = async () => {
    let fixtures;

    if (infra) {
        if (!dockerAvailable()) {
            console.error(
                "[load] Docker is not available, so --infra cannot start the isolated test stack. " +
                    "Start Docker, or run against an already-running backend without --infra."
            );
            process.exit(2);
        }

        log("starting isolated test infrastructure (mongo/redis/rabbitmq)");
        const code = await compose(["up", "-d", "--wait"]);
        if (code !== 0) {
            console.error("[load] `docker compose up --wait` failed; see the output above.");
            process.exit(1);
        }
        infraUp = true;

        const serviceEnv = {
            MONGODB_URL: TEST_MONGO_URL,
            RABBITMQ_URL: TEST_RABBITMQ_URL,
            REDIS_HOST: "127.0.0.1",
            REDIS_PORT: "6380",
            LOG_LEVEL: process.env.LOG_LEVEL || "error",
        };

        if (targets.includes("problem")) {
            const problem = startService({
                name: "problem",
                dir: "apps/apis/problem",
                port: PROBLEM_PORT,
                env: { ...serviceEnv, PORT: String(PROBLEM_PORT) },
                logDir: path.join(ROOT, "test-artifacts", "load"),
            });
            startedServices.push(problem);
            await awaitService(
                problem,
                `http://127.0.0.1:${PROBLEM_PORT}/health`
            );
            log(`problem ready on ${PROBLEM_PORT}`);
        }

        if (targets.includes("submission")) {
            const submission = startService({
                name: "submission",
                dir: "apps/apis/submission",
                port: SUBMISSION_PORT,
                env: { ...serviceEnv, PORT: String(SUBMISSION_PORT) },
                logDir: path.join(ROOT, "test-artifacts", "load"),
            });
            startedServices.push(submission);
            // The submission service exposes no health route; TCP readiness is enough.
            await awaitService(submission, "tcp");
            log(`submission ready on ${SUBMISSION_PORT}`);

            fixtures = await seedFixtures();
            log(
                `seeded fixtures: user ${fixtures.userId}, problem ${fixtures.problemId}`
            );
        }
    }

    const artifacts = [];

    for (const target of targets) {
        const scenario = buildScenario(target, fixtures);

        log(
            `running ${profileName} load on ${target}: ${concurrency} concurrent x up to ${totalRequests} requests -> ${scenario.method} ${scenario.url}`
        );

        const result = await drive(scenario);

        const ok = result.errorRate <= maxErrorRate;

        console.log(`\n=== ${target} (${profileName}) ===`);
        console.log(`  requests      : ${result.requests} (completed ${result.completed})`);
        console.log(`  failures      : ${result.failed} (${(result.errorRate * 100).toFixed(2)}%)`);
        console.log(`  duration      : ${result.durationMs} ms`);
        console.log(`  throughput    : ${result.throughput} req/s`);
        console.log(
            `  latency (ms)  : min ${result.latencyMs.min} | mean ${result.latencyMs.mean} | p50 ${result.latencyMs.p50} | p90 ${result.latencyMs.p90} | p95 ${result.latencyMs.p95} | p99 ${result.latencyMs.p99} | max ${result.latencyMs.max}`
        );
        console.log(`  status codes  : ${JSON.stringify(result.statuses)}`);
        console.log(`  verdict       : ${ok ? "PASS" : "FAIL"} (max error rate ${maxErrorRate})`);

        artifacts.push({ target, profile: profileName, concurrency, ok, ...result });
    }

    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    const artifactPath =
        valueOf("--json-out") ||
        path.join(
            ARTIFACTS_DIR,
            `${profileName}-${targets.join("+")}-${new Date()
                .toISOString()
                .replace(/[:.]/g, "-")}.json`
        );

    fs.writeFileSync(
        artifactPath,
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                profile: profileName,
                concurrency,
                requested: totalRequests,
                targets: artifacts,
            },
            null,
            2
        )
    );

    log(`wrote ${path.relative(ROOT, artifactPath)}`);

    const failures = artifacts.filter((artifact) => !artifact.ok);
    await shutdown(null, failures.length === 0 ? 0 : 1);
};

main().catch(async (error) => {
    console.error("[load] unexpected failure:", error);
    for (const service of startedServices) {
        console.error(`--- ${service.name} log (tail) ---\n${tailLog(service.logFile, 15)}`);
    }
    await shutdown(null, 1);
});
