/**
 * End-to-end flow test: submission -> RabbitMQ -> evaluation worker ->
 * sandboxed Docker execution -> MongoDB verdict -> submission.completed event.
 *
 * This is an OPT-IN test. It needs real infrastructure:
 *   - MongoDB and RabbitMQ reachable (defaults: localhost:27017 / localhost:5672)
 *   - the submission service running (`cd apps/apis/submission && npx tsx src/index.ts`)
 *   - this worker running (`cd apps/apis/execution && npx tsx src/index.ts`)
 *   - Docker able to run Linux containers, with the `node:20-slim` image available
 *
 * Run it with:
 *   E2E=1 node --import tsx --test "test/e2e/*.e2e.ts"
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import amqp from "amqplib";

const ENABLED = process.env.E2E === "1";

const MONGODB_URL =
    process.env.MONGODB_URL || "mongodb://localhost:27017/lcarena";
const RABBITMQ_URL =
    process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const SUBMISSION_SERVICE_URL =
    process.env.SUBMISSION_SERVICE_URL || "http://localhost:3002";

const SUBMISSION_CREATED = "submission.created";
const SUBMISSION_COMPLETED = "submission.completed";
const DEAD_LETTER = "submission.created.dead";

const TIME_LIMIT_MS = 5000;
const POLL_ATTEMPTS = 120;
const POLL_DELAY_MS = 500;
const TIMEOUT_MS = 180_000;

// Each case is `n` points followed by `n` (x, y) pairs; the reference solution
// returns the number of points, so the expected answer is `n`.
const CASES: { folder: string; input: string; answer: string }[] = [
    { folder: "test_case_id001", input: "2\n0 0 1 1\n", answer: "2\n" },
    { folder: "test_case_id002", input: "3\n0 0 1 1 2 2\n", answer: "3\n" },
];

const correctSolution = [
    "class Solution {",
    "  solve(points) { return points.length; }",
    "}",
    "module.exports = { Solution };",
].join("\n");

const wrongSolution = [
    "class Solution {",
    "  solve() { return 1; }",
    "}",
    "module.exports = { Solution };",
].join("\n");

let mongo: MongoClient;
let userId: ObjectId;
let problemId: ObjectId;
let testCasesDir: string;

let amqpConnection: amqp.ChannelModel;
let publishChannel: amqp.Channel;
let completionChannel: amqp.Channel;
const completedEvents: Record<string, unknown>[] = [];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createSubmission = async (code: string) => {
    const response = await fetch(`${SUBMISSION_SERVICE_URL}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-user-id": String(userId),
        },
        body: JSON.stringify({
            problemId: String(problemId),
            code,
            language: "js",
        }),
    });

    const body = await response.json();

    return { status: response.status, body };
};

const getSubmission = async (submissionId: string) => {
    const response = await fetch(
        `${SUBMISSION_SERVICE_URL}/${submissionId}`
    );

    return response.json();
};

const waitForTerminal = async (submissionId: string) => {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const response = await getSubmission(submissionId);
        const status = response?.data?.status?.status;

        if (status && status !== "PENDING") {
            return response.data;
        }

        await sleep(POLL_DELAY_MS);
    }

    throw new Error(
        `submission ${submissionId} never reached a terminal verdict`
    );
};

const waitForCompletionEvent = async (submissionId: string) => {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const event = completedEvents.find(
            (candidate) => String(candidate.submissionId) === submissionId
        );

        if (event) return event;

        await sleep(POLL_DELAY_MS);
    }

    throw new Error(
        `no submission.completed event arrived for ${submissionId}`
    );
};

before(async () => {
    if (!ENABLED) return;

    mongo = new MongoClient(MONGODB_URL);
    await mongo.connect();

    // Isolated test-case tree handed to the worker through problem.testCasesUrl.
    testCasesDir = await fs.mkdtemp(path.join(os.tmpdir(), "lcarena-e2e-cases-"));

    for (const testCase of CASES) {
        const dir = path.join(testCasesDir, testCase.folder);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, "case.in"), testCase.input);
        await fs.writeFile(path.join(dir, "case.ans"), testCase.answer);
    }

    const users = mongo.db().collection("users");
    const problems = mongo.db().collection("problems");

    const user = await users.insertOne({
        name: "E2E Flow User",
        email: `e2e-flow-${Date.now()}@lcarena.local`,
        password:
            "$2b$10$e2etesthash012345678901234567890123456789012345678901234",
        profilePicUrl: "/default-url",
        userType: "Regular",
        roleExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    userId = user.insertedId;

    const problem = await problems.insertOne({
        description: "E2E flow fixture problem",
        difficulty: "Easy",
        sampleTestCaseUrl: "local",
        testCasesUrl: testCasesDir,
        time_limit: TIME_LIMIT_MS,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    problemId = problem.insertedId;

    amqpConnection = await amqp.connect(RABBITMQ_URL);
    publishChannel = await amqpConnection.createChannel();

    // Drain stale messages so only this test's submissions are evaluated.
    for (const queue of [
        SUBMISSION_CREATED,
        SUBMISSION_COMPLETED,
        DEAD_LETTER,
    ]) {
        await publishChannel.assertQueue(queue, { durable: true });
        await publishChannel.purgeQueue(queue);
    }

    // Observe completion events emitted by the worker.
    completionChannel = await amqpConnection.createChannel();
    await completionChannel.consume(
        SUBMISSION_COMPLETED,
        (message) => {
            if (!message) return;

            try {
                completedEvents.push(
                    JSON.parse(message.content.toString())
                );
            } finally {
                completionChannel.ack(message);
            }
        },
        { noAck: false }
    );
});

after(async () => {
    if (!ENABLED) return;

    await mongo
        ?.db()
        .collection("submissions")
        .deleteMany({ userId });

    if (userId) await mongo?.db().collection("users").deleteOne({ _id: userId });
    if (problemId)
        await mongo?.db().collection("problems").deleteOne({ _id: problemId });

    if (testCasesDir) {
        await fs.rm(testCasesDir, { recursive: true, force: true });
    }

    await completionChannel?.close();
    await publishChannel?.close();
    await amqpConnection?.close();
    await mongo?.close();
});

describe("full submission evaluation flow", { skip: !ENABLED }, () => {
    it(
        "evaluates a correct submission and reports SUCCESS",
        { timeout: TIMEOUT_MS },
        async () => {
            const created = await createSubmission(correctSolution);

            assert.equal(created.status, 201);
            assert.equal(created.body.data.status.status, "PENDING");

            const submissionId = created.body.data._id;
            const stored = await waitForTerminal(submissionId);

            assert.equal(stored.status.status, "SUCCESS");
            assert.equal(stored.status.passed, CASES.length);
            assert.equal(stored.status.total, CASES.length);
            assert.deepEqual(stored.status.failedCases, {
                tle: [],
                re: [],
                wa: [],
            });

            // The verdict is durable in MongoDB.
            const fromDb = await mongo
                .db()
                .collection("submissions")
                .findOne({ _id: new ObjectId(submissionId) });
            assert.equal(fromDb?.status.status, "SUCCESS");
            assert.equal(fromDb?.status.passed, CASES.length);

            // And a completion event was published for the notification service.
            const event = await waitForCompletionEvent(submissionId);
            assert.equal(event.submissionId, submissionId);
            assert.equal(String(event.userId), String(userId));
            assert.equal(String(event.problemId), String(problemId));
            assert.equal((event.status as { status: string }).status, "SUCCESS");
            assert.equal(event.failedTestCase, null);
        }
    );

    it(
        "records wrong answers in failedCases for an incorrect submission",
        { timeout: TIMEOUT_MS },
        async () => {
            const created = await createSubmission(wrongSolution);
            assert.equal(created.status, 201);

            const submissionId = created.body.data._id;
            const stored = await waitForTerminal(submissionId);

            assert.equal(stored.status.status, "SUCCESS");
            assert.equal(stored.status.passed, 0);
            assert.equal(stored.status.total, CASES.length);
            assert.equal(
                stored.status.failedCases.wa.length,
                CASES.length
            );

            const event = await waitForCompletionEvent(submissionId);
            assert.equal(event.failedTestCase, CASES[0].folder);
        }
    );
});
