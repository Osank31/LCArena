#!/usr/bin/env node
/**
 * Backend integration / e2e runner.
 *
 *   npm run test:integration                    # all suites
 *   npm run test:integration -- --suites=api    # HTTP suites only (no Docker execution)
 *   npm run test:integration -- --suites=language-execution
 *   npm run test:integration -- --keep          # leave the test infra running
 *
 * What it does:
 *   1. starts ISOLATED infrastructure (MongoDB :27018, Redis :6380, RabbitMQ :5673)
 *      from docker-compose.test.yml as its own Compose project (`lcarena-test`);
 *   2. boots the real services on the host with `tsx`, pointed at that isolated
 *      infrastructure and a throwaway `lcarena_test` database;
 *   3. runs the integration suites against them;
 *   4. tears the services down and removes the test infrastructure.
 *
 * The test infrastructure never touches the development stack: different
 * project name, different host ports, different database, no named volumes.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const COMPOSE_FILE = path.join(ROOT, "docker-compose.test.yml");
const COMPOSE_PROJECT = "lcarena-test";
const ARTIFACTS_DIR = path.join(ROOT, "test-artifacts", "integration");

const MONGO_URL = "mongodb://127.0.0.1:27018/lcarena_test";
const RABBITMQ_URL = "amqp://guest:guest@127.0.0.1:5673";
const REDIS_HOST = "127.0.0.1";
const REDIS_PORT = "6380";

const GATEWAY_PORT = 3100;
const PROBLEM_PORT = 3101;
const SUBMISSION_PORT = 3102;
const EXECUTION_PORT = 3104;

const GATEWAY_URL = `http://127.0.0.1:${GATEWAY_PORT}`;
const PROBLEM_SERVICE_URL = `http://127.0.0.1:${PROBLEM_PORT}`;
const SUBMISSION_SERVICE_URL = `http://127.0.0.1:${SUBMISSION_PORT}`;

const S3_ENDPOINT = "http://127.0.0.1:9002";
const S3_REGION = "us-east-1";
const S3_ACCESS_KEY_ID = "minioadmin";
const S3_SECRET_ACCESS_KEY = "minioadmin";
const S3_BUCKET_NAME = "lcarena-testcases";
const S3_FORCE_PATH_STYLE = "true";

const COMMON_S3_ENV = {
  S3_ENDPOINT,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME,
  S3_FORCE_PATH_STYLE,
};

const COMMON_SERVICE_ENV = {
  MONGODB_URL: MONGO_URL,
  RABBITMQ_URL,
  REDIS_HOST,
  REDIS_PORT,
  LOG_LEVEL: process.env.LOG_LEVEL || "error",
  ...COMMON_S3_ENV,
};

/** Services that must be running before the suites execute. */
const SERVICES = [
  {
    name: "submission",
    dir: "apps/apis/submission",
    port: SUBMISSION_PORT,
    env: {
      PORT: String(SUBMISSION_PORT),
      MONGODB_URL: MONGO_URL,
      RABBITMQ_URL,
      ...COMMON_S3_ENV,
    },
    // No health route exists, so a TCP connect is the readiness signal.
    ready: "tcp",
  },
  {
    name: "problem",
    dir: "apps/apis/problem",
    port: PROBLEM_PORT,
    env: {
      PORT: String(PROBLEM_PORT),
      MONGODB_URL: MONGO_URL,
      ...COMMON_S3_ENV,
    },
    ready: `http://127.0.0.1:${PROBLEM_PORT}/health`,
  },
  {
    name: "execution",
    dir: "apps/apis/execution",
    port: EXECUTION_PORT,
    env: {
      PORT: String(EXECUTION_PORT),
      MONGODB_URL: MONGO_URL,
      RABBITMQ_URL,
      EXECUTION_MAX_ATTEMPTS: "3",
      ...COMMON_S3_ENV,
    },
    ready: `http://127.0.0.1:${EXECUTION_PORT}/health`,
  },
  {
    name: "gateway",
    dir: "apps/apis/gateway",
    port: GATEWAY_PORT,
    env: {
      PORT: String(GATEWAY_PORT),
      MONGODB_URL: MONGO_URL,
      REDIS_HOST,
      REDIS_PORT,
      PROBLEM_SERVICE_URL,
      SUBMISSION_SERVICE_URL,
      // Nothing listens here in tests: the OTP dispatch is best-effort and must
      // never block or fail an auth request.
      MAIL_SERVICE_URL: "http://127.0.0.1:3999",
      MAIL_SERVICE_TOKEN: "integration-test-token",
      ACCESS_TOKEN_JWT_KEY: "integration-test-access-key",
      REFRESH_TOKEN_JWT_KEY: "integration-test-refresh-key",
      CORS_ORIGIN: "*",
    },
    // Started last: it proxies to the services above.
    dependsOn: ["problem", "submission"],
    ready: "tcp",
  },
];

/** Integration suites. `needs` lists services that must be up. */
const SUITES = {
  api: [
    {
      name: "problem-service",
      needs: ["submission", "problem", "gateway"],
      cmd: ["--test", "apps/apis/problem/test/integration/problem.api.test.js"],
      env: { ...COMMON_S3_ENV },
    },
    {
      name: "submission-service",
      needs: ["submission", "problem", "gateway"],
      cmd: ["--test", "apps/apis/submission/test/integration/submission.api.test.js"],
      env: { ...COMMON_S3_ENV },
    },
    {
      name: "gateway",
      needs: ["submission", "problem", "gateway"],
      cmd: ["--test", "apps/apis/gateway/test/integration/gateway.api.test.js"],
      env: { ...COMMON_S3_ENV },
    },
  ],
  "submission-pipeline": [
    {
      name: "evaluation-flow",
      needs: ["submission", "problem", "gateway", "execution"],
      cmd: [
        "--import",
        "tsx",
        "--test",
        "apps/apis/execution/test/integration/full-flow.e2e.ts",
      ],
      env: { E2E: "1", ...COMMON_S3_ENV },
      // First run pulls the sandbox image; give it room.
      timeoutMs: 420_000,
    },
  ],
  "language-execution": [
    {
      name: "language-matrix",
      needs: ["submission", "problem", "gateway", "execution"],
      cmd: [
        "--import",
        "tsx",
        "--test",
        "apps/apis/execution/test/integration/languages.e2e.ts",
      ],
      env: { E2E: "1", LANGUAGE_MATRIX: "1" },
      timeoutMs: 900_000,
    },
  ],
};

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const match = args.find((arg) => arg.startsWith(`${flag}=`));
  return match ? match.slice(flag.length + 1) : undefined;
};

const requested = (valueOf("--suites") || "api,submission-pipeline")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const unknown = requested.filter((suite) => !SUITES[suite]);
if (unknown.length > 0) {
  console.error(
    `Unknown suite(s): ${unknown.join(", ")}. Known suites: ${Object.keys(SUITES).join(", ")}`
  );
  process.exit(2);
}

const KEEP_INFRA = hasFlag("--keep");
const VERBOSE = hasFlag("--verbose");

const log = (...parts) => console.log("[integration]", ...parts);
const logFile = (name) => path.join(ARTIFACTS_DIR, `${name}.log`);

const children = [];
const started = [];

function run(command, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: options.cwd || ROOT,
      env: { ...process.env, ...options.env },
      stdio: options.stdio || "inherit",
      shell: false,
    });

    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (error) => {
      console.error(`[integration] failed to run ${command.join(" ")}: ${error.message}`);
      resolve(1);
    });
  });
}

function startService(service) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const out = fs.openSync(logFile(service.name), "w");

  const child = spawn(
    process.execPath,
    ["--import", "tsx", "src/index.ts"],
    {
      cwd: path.join(ROOT, service.dir),
      env: { ...process.env, ...COMMON_SERVICE_ENV, ...service.env },
      stdio: ["ignore", out, out],
    }
  );

  children.push({ name: service.name, child });
  started.push(service.name);

  return child;
}

function waitForTcp(port, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host: "127.0.0.1" });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) reject(new Error(`port ${port} never opened`));
        else setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

async function waitForHttp(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`${url} never became ready`);
}

function tailLog(name, lines = 25) {
  try {
    const content = fs.readFileSync(logFile(name), "utf8").split("\n");
    return content.slice(-lines).join("\n");
  } catch {
    return "(no log)";
  }
}

function describeFailure(name) {
  console.error(`\n--- ${name} log (tail) ---\n${tailLog(name)}\n--- end log ---`);
}

async function waitForService(service) {
  try {
    if (service.ready === "tcp") await waitForTcp(service.port);
    else await waitForHttp(service.ready);
    log(`${service.name} ready on port ${service.port}`);
  } catch (error) {
    describeFailure(service.name);
    throw new Error(`${service.name} did not become ready: ${error.message}`);
  }
}

async function ensureService(name) {
  if (started.includes(name)) return;
  const service = SERVICES.find((s) => s.name === name);
  if (!service) throw new Error(`Unknown service: ${name}`);
  if (service.dependsOn) {
    for (const dep of service.dependsOn) {
      await ensureService(dep);
    }
  }
  startService(service);
  await waitForService(service);
}

function compose(argsList, options = {}) {
  return run(
    ["docker", "compose", "-p", COMPOSE_PROJECT, "-f", COMPOSE_FILE, ...argsList],
    options
  );
}

async function stopServices() {
  for (const { name, child } of children.reverse()) {
    if (child.exitCode === null && !child.killed) {
      child.kill("SIGTERM");
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 5_000);
        child.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    if (VERBOSE) log(`stopped ${name}`);
  }
}

async function teardown() {
  await stopServices();

  if (KEEP_INFRA) {
    log("leaving test infrastructure running (--keep):");
    log(`  docker compose -p ${COMPOSE_PROJECT} -f docker-compose.test.yml down -v`);
    return;
  }

  log("removing isolated test infrastructure and its data");
  await compose(["down", "-v", "--remove-orphans"]);
}

let teardownDone = false;
async function shutdown(signal, exitCode) {
  if (teardownDone) return;
  teardownDone = true;
  if (signal) log(`received ${signal}, cleaning up`);
  await teardown();
  process.exit(exitCode);
}

process.on("SIGINT", () => void shutdown("SIGINT", 130));
process.on("SIGTERM", () => void shutdown("SIGTERM", 143));

async function main() {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const dockerCheck = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], {
    encoding: "utf8",
  });

  if (dockerCheck.status !== 0) {
    console.error(
      "[integration] Docker is not available. Integration tests need MongoDB, Redis and RabbitMQ " +
        "containers, plus a working Docker daemon for the execution pipeline."
    );
    process.exit(2);
  }

  log(`starting isolated infrastructure (project ${COMPOSE_PROJECT})`);
  const composeUp = await compose(["up", "-d", "--wait"]);

  if (composeUp !== 0) {
    console.error("[integration] `docker compose up --wait` failed; see the output above.");
    process.exit(1);
  }

  const suiteEnv = {
    MONGODB_URL: MONGO_URL,
    RABBITMQ_URL,
    REDIS_HOST,
    REDIS_PORT,
    GATEWAY_URL,
    PROBLEM_SERVICE_URL,
    SUBMISSION_SERVICE_URL,
    EXECUTION_SERVICE_URL: `http://127.0.0.1:${EXECUTION_PORT}`,
    NODE_ENV: "test",
  };

  const results = [];

  for (const suiteName of requested) {
    for (const suite of SUITES[suiteName]) {
      try {
        if (suite.needs) {
          for (const svcName of suite.needs) {
            await ensureService(svcName);
          }
        }
      } catch (error) {
        console.error(`[integration] ${error.message}`);
        await shutdown(null, 1);
        return;
      }

      log(`running suite "${suite.name}" (${suiteName})`);

      const code = await run([process.execPath, ...suite.cmd], {
        env: { ...suiteEnv, ...suite.env },
        stdio: VERBOSE ? "inherit" : ["ignore", "inherit", "inherit"],
      });

      results.push({ suite: suiteName, name: suite.name, code });
    }
  }

  const failed = results.filter((result) => result.code !== 0);

  console.log("\n=== integration summary ===");
  for (const result of results) {
    console.log(
      `${result.code === 0 ? "PASS" : "FAIL"}  ${result.name} (${result.suite})`
    );
  }

  if (failed.length > 0) {
    console.log(`\n${failed.length} of ${results.length} suites failed.`);
    console.log(`Service logs: ${path.relative(ROOT, ARTIFACTS_DIR)}/*.log`);
  }

  await shutdown(null, failed.length === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error("[integration] unexpected failure:", error);
  await shutdown(null, 1);
});
