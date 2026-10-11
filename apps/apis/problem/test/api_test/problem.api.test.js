/**
 * End-to-end tests for the Problem service.
 *
 * Covers every HTTP route AND verifies that the resulting data actually lands in
 * MongoDB, reading it back with the MongoDB driver instead of the service's own
 * Mongoose models so persistence is checked independently.
 *
 * The service must be running first:
 *   cd apps/apis/problem && npx tsx src/index.ts
 * Then:
 *   node --test apps/apis/problem/test/api_test/problem.api.test.js
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { MongoClient, ObjectId } = require("mongodb");

const BASE = process.env.PROBLEM_SERVICE_URL || "http://localhost:3001";
const MONGODB_URL =
	process.env.MONGODB_URL || "mongodb://localhost:27017/lcarena";

const validProblem = () => ({
	description: "E2E test problem: count the barriers formed by a point set",
	difficulty: "Easy",
	sampleTestCaseUrl: "https://example.com/sample.txt",
	testCasesUrl: "https://example.com/testcases.zip",
	time_limit: 2000,
});

let client;
let problems;
const createdIds = [];

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

async function createProblem(overrides = {}) {
	const res = await api("/", {
		method: "POST",
		body: JSON.stringify({ ...validProblem(), ...overrides }),
	});

	if (res.body && res.body.data && res.body.data._id) {
		createdIds.push(new ObjectId(res.body.data._id));
	}

	return res;
}

before(async () => {
	client = new MongoClient(MONGODB_URL);
	await client.connect();
	problems = client.db().collection("problems");
});

after(async () => {
	if (createdIds.length > 0) {
		await problems.deleteMany({ _id: { $in: createdIds } });
	}
	await client.close();
});

describe("Problem service", () => {
	it("GET /health reports healthy", async () => {
		const res = await api("/health");

		assert.equal(res.status, 200);
		assert.equal(res.body.message, "Problem Service Healthy");
	});

	it("POST / creates a problem and persists it to MongoDB", async () => {
		const payload = validProblem();
		const res = await createProblem();

		assert.equal(res.status, 201);
		assert.equal(res.body.success, true);
		assert.equal(res.body.message, "Problem Created Successfully");

		const created = res.body.data;
		assert.ok(ObjectId.isValid(created._id));
		assert.equal(created.description, payload.description);
		assert.equal(created.difficulty, payload.difficulty);
		assert.equal(created.time_limit, payload.time_limit);

		// Independent read straight from the database.
		const stored = await problems.findOne({ _id: new ObjectId(created._id) });

		assert.ok(stored, "problem was not written to MongoDB");
		assert.equal(stored.description, payload.description);
		assert.equal(stored.difficulty, payload.difficulty);
		assert.equal(stored.sampleTestCaseUrl, payload.sampleTestCaseUrl);
		assert.equal(stored.testCasesUrl, payload.testCasesUrl);
		assert.equal(stored.time_limit, payload.time_limit);
		assert.ok(stored.createdAt instanceof Date);
	});

	it("POST / strips unknown fields instead of persisting them", async () => {
		const res = await createProblem({ hacker: "x", __v: 99, _id: "forged" });

		assert.equal(res.status, 201);

		const stored = await problems.findOne({
			_id: new ObjectId(res.body.data._id),
		});

		assert.ok(stored);
		assert.equal(stored.hacker, undefined);
		assert.equal(stored.__v, 0);
	});

	it("POST / rejects a description shorter than 10 characters", async () => {
		const res = await createProblem({ description: "short" });

		assert.equal(res.status, 400);
		assert.equal(res.body.success, false);
		assert.equal(res.body.message, "Validation Error");
		assert.ok(res.body.errors.some((e) => e.path.includes("description")));
	});

	it("POST / rejects an unknown difficulty", async () => {
		const res = await createProblem({ difficulty: "Impossible" });

		assert.equal(res.status, 400);
		assert.ok(res.body.errors.some((e) => e.path.includes("difficulty")));
	});

	it("POST / rejects a non-positive time_limit", async () => {
		const zero = await createProblem({ time_limit: 0 });
		assert.equal(zero.status, 400);

		const negative = await createProblem({ time_limit: -5 });
		assert.equal(negative.status, 400);
	});

	it("POST / reports every missing field at once", async () => {
		const res = await api("/", { method: "POST", body: "{}" });

		assert.equal(res.status, 400);
		assert.equal(res.body.errors.length, 5);
	});

	it("POST / returns 400 for malformed JSON instead of 500", async () => {
		const res = await api("/", { method: "POST", body: "{not json" });

		assert.equal(res.status, 400);
		assert.equal(res.body.success, false);
	});

	it("GET / returns the created problem", async () => {
		const created = await createProblem();
		const res = await api("/");

		assert.equal(res.status, 200);
		assert.equal(res.body.success, true);
		assert.ok(Array.isArray(res.body.data));
		assert.ok(res.body.data.some((p) => p._id === created.body.data._id));
	});

	it("GET /:id returns the problem with the requested id", async () => {
		const created = await createProblem();
		const res = await api(`/${created.body.data._id}`);

		assert.equal(res.status, 200);
		assert.equal(res.body.data._id, created.body.data._id);
		assert.equal(res.body.data.description, validProblem().description);
	});

	it("GET /:id rejects a malformed id with 400", async () => {
		const res = await api("/not-an-objectid");

		assert.equal(res.status, 400);
		assert.equal(res.body.success, false);
	});

	it("GET /:id returns 404 for an unknown id", async () => {
		const res = await api("/000000000000000000000000");

		assert.equal(res.status, 404);
		assert.equal(res.body.message, "Problem not found");
	});

	it("PUT /:id updates the problem and persists the change", async () => {
		const created = await createProblem();
		const id = created.body.data._id;

		const res = await api(`/${id}`, {
			method: "PUT",
			body: JSON.stringify({ difficulty: "Hard", time_limit: 9000 }),
		});

		assert.equal(res.status, 200);
		assert.equal(res.body.data.difficulty, "Hard");
		assert.equal(res.body.data.time_limit, 9000);
		// A partial update must not clobber untouched fields.
		assert.equal(res.body.data.description, validProblem().description);

		const stored = await problems.findOne({ _id: new ObjectId(id) });
		assert.equal(stored.difficulty, "Hard");
		assert.equal(stored.time_limit, 9000);
	});

	it("PUT /:id validates the incoming payload", async () => {
		const created = await createProblem();
		const id = created.body.data._id;

		const badDifficulty = await api(`/${id}`, {
			method: "PUT",
			body: JSON.stringify({ difficulty: "Nope" }),
		});
		assert.equal(badDifficulty.status, 400);

		const badLimit = await api(`/${id}`, {
			method: "PUT",
			body: JSON.stringify({ time_limit: -1 }),
		});
		assert.equal(badLimit.status, 400);
	});

	it("PUT /:id returns 404 for an unknown id", async () => {
		const res = await api("/000000000000000000000000", {
			method: "PUT",
			body: JSON.stringify({ difficulty: "Easy" }),
		});

		assert.equal(res.status, 404);
		assert.equal(res.body.message, "Problem not found");
	});

	it("PUT /:id rejects a malformed id with 400", async () => {
		const res = await api("/not-an-id", {
			method: "PUT",
			body: JSON.stringify({ difficulty: "Easy" }),
		});

		assert.equal(res.status, 400);
	});

	it("DELETE /:id removes the problem from MongoDB", async () => {
		const created = await createProblem();
		const id = created.body.data._id;

		const res = await api(`/${id}`, { method: "DELETE" });

		assert.equal(res.status, 200);
		assert.equal(res.body.message, "Problem deleted successfully");
		assert.equal(res.body.data._id, id);

		const stored = await problems.findOne({ _id: new ObjectId(id) });
		assert.equal(stored, null);

		const after = await api(`/${id}`);
		assert.equal(after.status, 404);
	});

	it("DELETE /:id returns 404 when the problem is already gone", async () => {
		const res = await api("/000000000000000000000000", { method: "DELETE" });

		assert.equal(res.status, 404);
		assert.equal(res.body.message, "Problem not found");
	});

	it("DELETE /:id rejects a malformed id with 400", async () => {
		const res = await api("/not-an-id", { method: "DELETE" });

		assert.equal(res.status, 400);
		assert.equal(res.body.message, "Invalid id provided");
	});
});
