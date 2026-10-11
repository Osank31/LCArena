/**
 * End-to-end tests for the Submission service.
 *
 * Covers every HTTP route, verifies the submission is written to MongoDB, and
 * verifies the submission is published to the `submission.created` RabbitMQ
 * queue with the payload the evaluation worker expects.
 *
 * Prerequisites:
 *   - the service is running: cd apps/apis/submission && npx tsx src/index.ts
 *   - MongoDB and RabbitMQ are reachable (host ports 27017 / 5672 / 15672)
 *
 * Run with:
 *   node --test apps/apis/submission/test/api_test/submission.api.test.js
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { MongoClient, ObjectId } = require("mongodb");
const amqp = require("amqplib");

const BASE = process.env.SUBMISSION_SERVICE_URL || "http://localhost:3002";
const MONGODB_URL =
	process.env.MONGODB_URL || "mongodb://localhost:27017/lcarena";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const QUEUE = "submission.created";
const MAX_QUEUE_SCAN = 500;
const QUEUE_POLL_ATTEMPTS = 25;
const QUEUE_POLL_DELAY_MS = 100;

const CODE = "function solve(points) { return points.length; }";
const TIME_LIMIT = 2000;

let mongo;
let submissions;
let problems;
let users;

let amqpConnection;
let channel;

let userId;
let problemId;

async function api(path, options = {}) {
	const res = await fetch(`${BASE}${path}`, {
		...options,
		headers: { "Content-Type": "application/json", ...(options.headers || {}) },
	});

	const text = await res.text();
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		body = text;
	}

	return { status: res.status, body };
}

function postSubmission(overrides = {}, headers = {}) {
	return api("/", {
		method: "POST",
		headers: { "x-user-id": String(userId), ...headers },
		body: JSON.stringify({
			problemId: String(problemId),
			code: CODE,
			language: "js",
			...overrides,
		}),
	});
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads every message currently on the queue and re-publishes it, so the queue
 * can be inspected without destroying data. Reading continues until `get`
 * returns empty rather than trusting a `checkQueue` count, and the restored
 * publishes are confirmed before returning.
 */
async function drainAndRestore() {
	const collected = [];

	for (let i = 0; i < MAX_QUEUE_SCAN; i++) {
		const message = await channel.get(QUEUE, { noAck: false });
		if (!message) break;

		collected.push(JSON.parse(message.content.toString()));
		channel.ack(message);
	}

	for (const payload of collected) {
		channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(payload)));
	}
	await channel.waitForConfirms();

	return collected;
}

/**
 * `sendToQueue` is fire-and-forget, so a message published by the service is
 * not necessarily visible immediately. Poll until the submission shows up.
 */
async function collectUntilSubmissionFound(submissionId) {
	let seen = [];

	for (let attempt = 0; attempt < QUEUE_POLL_ATTEMPTS; attempt++) {
		seen = await drainAndRestore();
		if (seen.some((m) => String(m.submissionId) === submissionId)) return seen;
		await sleep(QUEUE_POLL_DELAY_MS);
	}

	return seen;
}

before(async () => {
	mongo = new MongoClient(MONGODB_URL);
	await mongo.connect();
	submissions = mongo.db().collection("submissions");
	problems = mongo.db().collection("problems");
	users = mongo.db().collection("users");

	// The auth service that used to issue user ids no longer exists, so seed the
	// rows the submission service validates against directly.
	const user = await users.insertOne({
		name: "E2E Submission User",
		email: `e2e-submission-${Date.now()}@lcarena.local`,
		password: "$2b$10$e2etesthash012345678901234567890123456789012345678901234",
		profilePicUrl: "/default-url",
		userType: "Regular",
		roleExpiry: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	userId = user.insertedId;

	const problem = await problems.insertOne({
		description: "E2E submission fixture problem",
		difficulty: "Easy",
		sampleTestCaseUrl: "https://example.com/sample.txt",
		testCasesUrl: "https://example.com/testcases.zip",
		time_limit: TIME_LIMIT,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	problemId = problem.insertedId;

	amqpConnection = await amqp.connect(RABBITMQ_URL);
	// A confirm channel lets the test flush/confirm its own re-published
	// messages before closing, so nothing is dropped on shutdown.
	channel = await amqpConnection.createConfirmChannel();
});

after(async () => {
	await submissions.deleteMany({ userId });
	await users.deleteOne({ _id: userId });
	await problems.deleteOne({ _id: problemId });

	await channel?.close();
	await amqpConnection?.close();
	await mongo.close();
});

describe("Submission service", () => {
	it("POST / requires an x-user-id header", async () => {
		const res = await api("/", {
			method: "POST",
			body: JSON.stringify({ problemId: String(problemId), code: CODE, language: "js" }),
		});

		assert.equal(res.status, 401);
		assert.equal(res.body.message, "Missing user header");
	});

	it("POST / rejects an unknown user", async () => {
		const res = await postSubmission({}, { "x-user-id": "000000000000000000000000" });

		assert.equal(res.status, 404);
		assert.equal(res.body.message, "User not found");
	});

	it("POST / rejects a malformed user id as a client error", async () => {
		const res = await postSubmission({}, { "x-user-id": "not-an-objectid" });

		assert.ok(
			res.status >= 400 && res.status < 500,
			`expected a 4xx for a malformed user id, got ${res.status}`
		);
	});

	it("POST / creates a PENDING submission and persists it to MongoDB", async () => {
		const created = await postSubmission();

		assert.equal(created.status, 201);
		assert.equal(created.body.success, true);
		assert.equal(created.body.message, "Submission created successfully");

		const data = created.body.data;
		assert.ok(ObjectId.isValid(data._id));
		assert.equal(data.status.status, "PENDING");

		const stored = await submissions.findOne({ _id: new ObjectId(data._id) });

		assert.ok(stored, "submission was not written to MongoDB");
		assert.equal(stored.code, CODE);
		assert.equal(stored.language, "js");
		assert.equal(stored.status.status, "PENDING");
		assert.equal(String(stored.userId), String(userId));
		assert.equal(String(stored.problemId), String(problemId));

		await submissions.deleteOne({ _id: stored._id });
	});

	it("POST / publishes the submission to the submission.created queue", async () => {
		const created = await postSubmission();
		assert.equal(created.status, 201);

		const submissionId = created.body.data._id;
		const queued = await collectUntilSubmissionFound(submissionId);
		const matches = queued.filter((m) => String(m.submissionId) === submissionId);

		assert.equal(
			matches.length,
			1,
			"each submission must be published to RabbitMQ exactly once"
		);

		const published = matches[0];
		assert.equal(published.code, CODE);
		assert.equal(published.language, "js");
		assert.equal(String(published.problemId), String(problemId));
		assert.equal(String(published.userId), String(userId));
		assert.equal(published.status.status, "PENDING");

		await submissions.deleteOne({ _id: new ObjectId(submissionId) });
	});

	it("POST / validates the payload", async () => {
		const badProblem = await postSubmission({ problemId: "abc" });
		assert.equal(badProblem.status, 400);
		assert.equal(badProblem.body.message, "Invalid problem id");

		const missingCode = await postSubmission({ code: undefined });
		assert.equal(missingCode.status, 400);
		assert.ok(missingCode.body.errors.some((e) => e.path.includes("code")));

		const badLanguage = await postSubmission({ language: "rust" });
		assert.equal(badLanguage.status, 400);
		assert.ok(badLanguage.body.errors.some((e) => e.path.includes("language")));
	});

	it("POST / only accepts the ELanguage codes py, cpp, java and js", async () => {
		const res = await postSubmission({ language: "python" });

		assert.equal(res.status, 400);
		assert.match(JSON.stringify(res.body.errors), /py.*cpp.*java.*js/);
	});

	it("POST / returns 400 for malformed JSON instead of 500", async () => {
		const res = await api("/", {
			method: "POST",
			headers: { "x-user-id": String(userId) },
			body: "{not json",
		});

		assert.equal(res.status, 400);
		assert.equal(res.body.success, false);
	});

	it("GET /:id returns the submission", async () => {
		const created = await postSubmission();
		const res = await api(`/${created.body.data._id}`);

		assert.equal(res.status, 200);
		assert.equal(res.body.message, "Submission fetched successfully");
		assert.equal(res.body.data._id, created.body.data._id);
		assert.equal(res.body.data.status.status, "PENDING");

		await submissions.deleteOne({ _id: new ObjectId(created.body.data._id) });
	});

	it("GET /:id rejects a malformed id with 400", async () => {
		const res = await api("/not-an-id");

		assert.equal(res.status, 400);
		assert.equal(res.body.message, "Invalid submission id");
	});

	it("GET /:id returns 404 for an unknown submission", async () => {
		const res = await api("/000000000000000000000000");

		assert.equal(res.status, 404);
		assert.equal(res.body.message, "Submission not found");
	});

	it("PUT /:id updates the submission and persists the verdict", async () => {
		const created = await postSubmission();
		const id = created.body.data._id;

		const verdict = {
			status: "SUCCESS",
			passed: 1,
			total: 2,
			failedCases: { tle: [], re: [], wa: ["test_case_id002"] },
			executionTimeMs: { test_case_id001: 12, test_case_id002: 4 },
		};

		const res = await api(`/${id}`, {
			method: "PUT",
			body: JSON.stringify({ status: verdict, code: "updated code" }),
		});

		assert.equal(res.status, 200);
		assert.equal(res.body.message, "Submission updated successfully");
		assert.equal(res.body.data.code, "updated code");
		assert.equal(res.body.data.status.status, "SUCCESS");
		assert.deepEqual(res.body.data.status.failedCases.wa, ["test_case_id002"]);

		const stored = await submissions.findOne({ _id: new ObjectId(id) });
		assert.equal(stored.code, "updated code");
		assert.equal(stored.status.status, "SUCCESS");
		assert.equal(stored.status.passed, 1);

		await submissions.deleteOne({ _id: new ObjectId(id) });
	});

	it("PUT /:id validates ids and payload", async () => {
		const malformedId = await api("/not-an-id", {
			method: "PUT",
			body: JSON.stringify({ code: "x" }),
		});
		assert.equal(malformedId.status, 400);

		const created = await postSubmission();
		const id = created.body.data._id;

		const badProblem = await api(`/${id}`, {
			method: "PUT",
			body: JSON.stringify({ problemId: "abc" }),
		});
		assert.equal(badProblem.status, 400);

		const badStatus = await api(`/${id}`, {
			method: "PUT",
			body: JSON.stringify({ status: { status: "NONSENSE" } }),
		});
		assert.equal(badStatus.status, 400);

		await submissions.deleteOne({ _id: new ObjectId(id) });
	});

	it("PUT /:id returns 404 for an unknown submission", async () => {
		const res = await api("/000000000000000000000000", {
			method: "PUT",
			body: JSON.stringify({ code: "x" }),
		});

		assert.equal(res.status, 404);
		assert.equal(res.body.message, "Submission not found");
	});
});
