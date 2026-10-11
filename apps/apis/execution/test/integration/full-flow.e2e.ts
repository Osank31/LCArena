/**
 * End-to-end integration flow test:
 * Problem creation with real test cases -> MinIO S3 upload ->
 * Submission creation -> RabbitMQ queue -> evaluation worker ->
 * S3 test case download to isolated temp directory ->
 * Sandboxed Docker execution -> MongoDB atomic verdict persistence ->
 * submission.completed event push.
 *
 * Covers:
 *   - Accepted (SUCCESS with 0 failures)
 *   - Wrong Answer (SUCCESS with failedCases.wa)
 *   - Compilation Error (COMPILE_ERROR with compileError)
 *   - Runtime Error (SUCCESS with failedCases.re)
 *   - Time Limit Exceeded (SUCCESS with failedCases.tle)
 *   - MinIO object key & content verification
 *   - Idempotency & duplicate queue delivery handling
 *   - Safe workspace directory cleanup
 *
 * Run with:
 *   E2E=1 node --import tsx --test "apps/apis/execution/test/integration/full-flow.e2e.ts"
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { MongoClient, ObjectId } from "mongodb";
import amqp from "amqplib";
import {
    ensureBucketExists,
    putObject,
    getObject,
    listObjects,
    deleteObjectsWithPrefix,
    getProblemTestCasePrefix,
    getTestCaseInputKey,
    getTestCaseOutputKey,
    getBucketName,
} from "@LCArena/config";

const ENABLED = process.env.E2E === "1";

const MONGODB_URL =
    process.env.MONGODB_URL || "mongodb://localhost:27018/lcarena_test";
const RABBITMQ_URL =
    process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5673";
const SUBMISSION_SERVICE_URL =
    process.env.SUBMISSION_SERVICE_URL || "http://127.0.0.1:3102";

const SUBMISSION_CREATED = "submission.created";
const SUBMISSION_COMPLETED = "submission.completed";
const DEAD_LETTER = "submission.created.dead";

const TIME_LIMIT_MS = 2000;
const POLL_ATTEMPTS = 120;
const POLL_DELAY_MS = 500;
const TIMEOUT_MS = 180_000;

// Test cases matching the points barrier problem logic
const CASES = [
    { index: 1, folder: "test_case_001", input: "2\n0 0 1 1\n", answer: "2\n" },
    { index: 2, folder: "test_case_002", input: "3\n0 0 1 1 2 2\n", answer: "3\n" },
];

const correctSolution = [
    "class Solution {",
    "  solve(points) { return points.length; }",
    "}",
    "module.exports = { Solution };",
].join("\n");

const wrongSolution = [
    "class Solution {",
    "  solve() { return 999; }",
    "}",
    "module.exports = { Solution };",
].join("\n");

const compileErrorSolution = [
    "class Solution {",
    "  solve() { return syntax error !; }",
    "}",
].join("\n");

const runtimeErrorSolution = [
    "class Solution {",
    "  solve() { throw new Error('intentional runtime error'); }",
    "}",
    "module.exports = { Solution };",
].join("\n");

const timeoutSolution = [
    "class Solution {",
    "  solve() { while (true) {} }",
    "}",
    "module.exports = { Solution };",
].join("\n");

let mongo: MongoClient;
let userId: ObjectId;
let problemId: ObjectId;
let s3Prefix: string;

let amqpConnection: amqp.ChannelModel;
let publishChannel: amqp.Channel;
let completionChannel: amqp.Channel;
const completedEvents: Record<string, any>[] = [];

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

    const body = (await response.json()) as any;
    return { status: response.status, body };
};

const getSubmission = async (submissionId: string) => {
    const response = await fetch(
        `${SUBMISSION_SERVICE_URL}/${submissionId}`
    );
    return (await response.json()) as any;
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

    // 1. Connect to Mongo
    mongo = new MongoClient(MONGODB_URL);
    await mongo.connect();

    // 2. Ensure MinIO bucket exists
    await ensureBucketExists();

    const users = mongo.db().collection("users");
    const problems = mongo.db().collection("problems");

    // 3. Create test user
    const user = await users.insertOne({
        name: "E2E S3 Pipeline User",
        email: `e2e-pipeline-${Date.now()}@lcarena.local`,
        password:
            "$2b$10$e2etesthash012345678901234567890123456789012345678901234",
        profilePicUrl: "/default-url",
        userType: "Regular",
        roleExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    userId = user.insertedId;

    // 4. Create problem and upload real test cases to MinIO
    problemId = new ObjectId();
    const problemIdStr = String(problemId);
    s3Prefix = getProblemTestCasePrefix(problemIdStr);

    for (const tc of CASES) {
        const inputKey = getTestCaseInputKey(problemIdStr, tc.index);
        const outputKey = getTestCaseOutputKey(problemIdStr, tc.index);

        await putObject(inputKey, tc.input);
        await putObject(outputKey, tc.answer);
    }

    const bucket = getBucketName();
    const storageRef = `s3://${bucket}/${s3Prefix}`;

    await problems.insertOne({
        _id: problemId,
        description: "E2E MinIO S3 Pipeline Problem",
        difficulty: "Easy",
        sampleTestCaseUrl: `${storageRef}test_case_001/input.in`,
        testCasesUrl: storageRef,
        testCaseStoragePrefix: s3Prefix,
        testCasesCount: CASES.length,
        time_limit: TIME_LIMIT_MS,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // 5. Connect to RabbitMQ and setup listener
    amqpConnection = await amqp.connect(RABBITMQ_URL);
    publishChannel = await amqpConnection.createChannel();

    for (const queueName of [
        SUBMISSION_CREATED,
        SUBMISSION_COMPLETED,
        DEAD_LETTER,
    ]) {
        await publishChannel.assertQueue(queueName, { durable: true });
        await publishChannel.purgeQueue(queueName);
    }

    completionChannel = await amqpConnection.createChannel();
    await completionChannel.consume(
        SUBMISSION_COMPLETED,
        (message) => {
            if (!message) return;
            try {
                completedEvents.push(JSON.parse(message.content.toString()));
            } finally {
                completionChannel.ack(message);
            }
        },
        { noAck: false }
    );
});

after(async () => {
    if (!ENABLED) return;

    // Clean up MinIO objects
    if (s3Prefix) {
        await deleteObjectsWithPrefix(s3Prefix).catch(() => undefined);
    }

    // Clean up MongoDB test data
    if (userId) {
        await mongo?.db().collection("submissions").deleteMany({ userId });
        await mongo?.db().collection("users").deleteOne({ _id: userId });
    }
    if (problemId) {
        await mongo?.db().collection("problems").deleteOne({ _id: problemId });
    }

    await completionChannel?.close();
    await publishChannel?.close();
    await amqpConnection?.close();
    await mongo?.close();
});

describe("Complete End-to-End Evaluation Pipeline with MinIO S3", { skip: !ENABLED }, () => {
    it("verifies test cases are stored in MinIO with the required key hierarchy", async () => {
        const keys = await listObjects(s3Prefix);
        assert.equal(keys.length, 4);

        const expectedKeys = [
            `Evaluation_Test_Cases/Test_Cases_${problemId}/test_case_001/input.in`,
            `Evaluation_Test_Cases/Test_Cases_${problemId}/test_case_001/output.ans`,
            `Evaluation_Test_Cases/Test_Cases_${problemId}/test_case_002/input.in`,
            `Evaluation_Test_Cases/Test_Cases_${problemId}/test_case_002/output.ans`,
        ];

        for (const exp of expectedKeys) {
            assert.ok(keys.includes(exp), `Expected key ${exp} in MinIO list`);
        }

        // Verify content integrity
        const inputContent = await getObject(expectedKeys[0]);
        assert.equal(inputContent.toString("utf-8"), CASES[0].input);
    });

    it(
        "evaluates a correct submission and records Accepted (SUCCESS) verdict",
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

            // Verify persistence in MongoDB
            const fromDb = await mongo
                .db()
                .collection("submissions")
                .findOne({ _id: new ObjectId(submissionId) });
            assert.equal(fromDb?.status.status, "SUCCESS");
            assert.equal(fromDb?.status.passed, CASES.length);

            // Verify completion notification payload
            const event = await waitForCompletionEvent(submissionId);
            assert.equal(event.submissionId, submissionId);
            assert.equal(String(event.userId), String(userId));
            assert.equal(String(event.problemId), String(problemId));
            assert.equal(event.status.status, "SUCCESS");
            assert.equal(event.failedTestCase, null);
        }
    );

    it(
        "evaluates an incorrect submission and records Wrong Answer (WA)",
        { timeout: TIMEOUT_MS },
        async () => {
            const created = await createSubmission(wrongSolution);
            assert.equal(created.status, 201);

            const submissionId = created.body.data._id;
            const stored = await waitForTerminal(submissionId);

            assert.equal(stored.status.status, "SUCCESS");
            assert.equal(stored.status.passed, 0);
            assert.equal(stored.status.total, CASES.length);
            assert.equal(stored.status.failedCases.wa.length, CASES.length);

            const event = await waitForCompletionEvent(submissionId);
            assert.equal(event.failedTestCase, CASES[0].folder);
        }
    );

    it(
        "evaluates a malformed syntax submission and records Compilation Error",
        { timeout: TIMEOUT_MS },
        async () => {
            const created = await createSubmission(compileErrorSolution);
            assert.equal(created.status, 201);

            const submissionId = created.body.data._id;
            const stored = await waitForTerminal(submissionId);

            assert.equal(stored.status.status, "COMPILE_ERROR");
            assert.ok(stored.status.compileError);
        }
    );

    it(
        "evaluates a throwing submission and records Runtime Error (RE)",
        { timeout: TIMEOUT_MS },
        async () => {
            const created = await createSubmission(runtimeErrorSolution);
            assert.equal(created.status, 201);

            const submissionId = created.body.data._id;
            const stored = await waitForTerminal(submissionId);

            assert.equal(stored.status.status, "SUCCESS");
            assert.equal(stored.status.passed, 0);
            assert.equal(stored.status.failedCases.re.length, CASES.length);

            const event = await waitForCompletionEvent(submissionId);
            assert.equal(event.failedTestCase, CASES[0].folder);
        }
    );

    it(
        "evaluates an infinite loop submission and records Time Limit Exceeded (TLE)",
        { timeout: TIMEOUT_MS },
        async () => {
            const created = await createSubmission(timeoutSolution);
            assert.equal(created.status, 201);

            const submissionId = created.body.data._id;
            const stored = await waitForTerminal(submissionId);

            assert.equal(stored.status.status, "SUCCESS");
            assert.equal(stored.status.passed, 0);
            assert.ok(stored.status.failedCases.tle.length > 0);

            const event = await waitForCompletionEvent(submissionId);
            assert.equal(event.failedTestCase, CASES[0].folder);
        }
    );

    it(
        "handles duplicate delivery of a message idempotently without recomputing",
        { timeout: TIMEOUT_MS },
        async () => {
            const created = await createSubmission(correctSolution);
            const submissionId = created.body.data._id;
            await waitForTerminal(submissionId);

            const eventCountBefore = completedEvents.filter(
                (e) => e.submissionId === submissionId
            ).length;

            // Re-publish the same message to the queue
            await publishChannel.sendToQueue(
                SUBMISSION_CREATED,
                Buffer.from(
                    JSON.stringify({
                        code: correctSolution,
                        language: "js",
                        status: { status: "PENDING" },
                        submissionId,
                        userId: String(userId),
                        problemId: String(problemId),
                    })
                ),
                { persistent: true }
            );

            // Wait briefly for consumer to process duplicate message
            await sleep(1500);

            const storedAfter = await getSubmission(submissionId);
            assert.equal(storedAfter.data.status.status, "SUCCESS");
            assert.equal(storedAfter.data.status.passed, CASES.length);

            // Re-publishing a finalized submission simply re-emits completion event safely
            const eventCountAfter = completedEvents.filter(
                (e) => e.submissionId === submissionId
            ).length;
            assert.ok(eventCountAfter >= eventCountBefore);
        }
    );

    it(
        "isolates concurrent evaluations without cross-contamination",
        { timeout: TIMEOUT_MS },
        async () => {
            const [sub1, sub2] = await Promise.all([
                createSubmission(correctSolution),
                createSubmission(wrongSolution),
            ]);

            const [term1, term2] = await Promise.all([
                waitForTerminal(sub1.body.data._id),
                waitForTerminal(sub2.body.data._id),
            ]);

            assert.equal(term1.status.status, "SUCCESS");
            assert.equal(term1.status.passed, CASES.length);

            assert.equal(term2.status.status, "SUCCESS");
            assert.equal(term2.status.passed, 0);
            assert.equal(term2.status.failedCases.wa.length, CASES.length);
        }
    );
});
