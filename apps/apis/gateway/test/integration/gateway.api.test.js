/**
 * End-to-end tests for the API gateway.
 *
 * They exercise the gateway over HTTP the way a browser would, and check the
 * real effect in MongoDB: authentication (login/refresh/logout), authorization
 * (admin writes, owner-scoped submissions) and proxying to the problem and
 * submission services.
 *
 * Prerequisites: the gateway on :3000 plus the problem (:3001) and submission
 * (:3002) services, with MongoDB and Redis reachable.
 *
 * Run with:
 *   cd apps/apis/gateway && npm test
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
const { createClient } = require("redis");

const BASE = process.env.GATEWAY_URL || "http://localhost:3000";
const MONGODB_URL =
	process.env.MONGODB_URL || "mongodb://localhost:27017/lcarena";

const PASSWORD = "Password123";
const ADMIN_EMAIL = "gateway-admin@lcarena.test";
const OWNER_EMAIL = "gateway-owner@lcarena.test";
const OTHER_EMAIL = "gateway-other@lcarena.test";

let mongo;
let redisClient;
let users;
let problems;
let submissions;

let admin; // seeded docs
let owner;
let other;

let adminToken;
let ownerToken;
let otherToken;

let problemId;

const createdProblemIds = [];

async function api(path, options = {}) {
	const { token, cookie, body, headers = {}, ...rest } = options;

	const res = await fetch(`${BASE}${path}`, {
		...rest,
		headers: {
			...(body !== undefined ? { "Content-Type": "application/json" } : {}),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(cookie ? { cookie } : {}),
			...headers,
		},
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});

	const text = await res.text();
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		parsed = text;
	}

	const setCookie = res.headers.getSetCookie?.() ?? [];
	const refreshCookie = setCookie
		.find((c) => c.startsWith("refreshToken="))
		?.split(";")[0];

	return { status: res.status, body: parsed, refreshCookie };
}

const login = (email, password = PASSWORD) =>
	api("/auth/login", { method: "POST", body: { email, password } });

async function seedUser(email, userType) {
	const hash = await bcrypt.hash(PASSWORD, 10);

	const result = await users.insertOne({
		name: `${userType} ${email}`,
		email,
		password: hash, // hashed the same way the User model does
		profilePicUrl: "/default-url",
		userType,
		roleExpiry: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	return result.insertedId;
}

const problemPayload = () => ({
	description: "Gateway e2e problem created through the proxy",
	difficulty: "Easy",
	sampleTestCaseUrl: "https://example.com/sample.png",
	testCasesUrl: "https://example.com/testcases.zip",
	time_limit: 2000,
});

before(async () => {
	mongo = new MongoClient(MONGODB_URL);
	await mongo.connect();

	redisClient = createClient({
		socket: {
			host: process.env.REDIS_HOST || "localhost",
			port: parseInt(process.env.REDIS_PORT || "6379", 10),
		},
	});
	await redisClient.connect();

	const db = mongo.db();
	users = db.collection("users");
	problems = db.collection("problems");
	submissions = db.collection("submissions");

	await users.deleteMany({
		email: { $in: [ADMIN_EMAIL, OWNER_EMAIL, OTHER_EMAIL] },
	});

	admin = await seedUser(ADMIN_EMAIL, "Admin");
	owner = await seedUser(OWNER_EMAIL, "Regular");
	other = await seedUser(OTHER_EMAIL, "Regular");

	// A private fixture problem so the suite never touches the real data.
	const problem = await problems.insertOne({
		description: "Gateway fixture problem",
		difficulty: "Easy",
		sampleTestCaseUrl: "https://example.com/sample.png",
		testCasesUrl: "https://example.com/testcases.zip",
		time_limit: 2000,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	problemId = problem.insertedId;

	adminToken = (await login(ADMIN_EMAIL)).body.data.accessToken;
	ownerToken = (await login(OWNER_EMAIL)).body.data.accessToken;
	otherToken = (await login(OTHER_EMAIL)).body.data.accessToken;
});

after(async () => {
	if (createdProblemIds.length > 0) {
		await problems.deleteMany({ _id: { $in: createdProblemIds } });
	}

	await submissions.deleteMany({
		userId: { $in: [admin, owner, other] },
	});
	await users.deleteMany({ _id: { $in: [admin, owner, other] } });
	await problems.deleteOne({ _id: problemId });

	await redisClient?.quit();
	await mongo.close();
});

describe("Gateway", () => {
	it("GET /health reports healthy", async () => {
		const res = await api("/health");

		assert.equal(res.status, 200);
		assert.equal(res.body.message, "Gateway Healthy");
	});

	describe("authentication", () => {
		it("logs in a valid user without disclosing the password hash", async () => {
			const res = await login(OWNER_EMAIL);

			assert.equal(res.status, 200);
			assert.equal(res.body.success, true);
			assert.ok(res.body.data.accessToken);
			assert.equal(res.body.data.user.email, OWNER_EMAIL);
			assert.equal(res.body.data.user.userType, "Regular");
			assert.equal("password" in res.body.data.user, false);
			assert.equal(
				JSON.stringify(res.body).includes("$2b$"),
				false,
				"response leaked a bcrypt hash"
			);
		});

		it("issues an httpOnly refresh cookie scoped to /auth", async () => {
			const res = await login(OWNER_EMAIL);

			const raw = res.refreshCookie;

			assert.ok(raw, "no refreshToken cookie was set");
			const setCookie = (
				await fetch(`${BASE}/auth/login`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email: OWNER_EMAIL, password: PASSWORD }),
				})
			).headers.getSetCookie();
			const cookie = setCookie.find((c) => c.startsWith("refreshToken="));

			assert.match(cookie, /httponly/i);
			assert.match(cookie, /path=\/auth/i);
			assert.match(cookie, /samesite=lax/i);
		});

		it("returns the same error for a wrong password and an unknown email", async () => {
			const wrongPassword = await login(OWNER_EMAIL, "not-the-password");
			const unknownEmail = await login("does-not-exist@lcarena.test");

			assert.equal(wrongPassword.status, 401);
			assert.equal(unknownEmail.status, 401);
			// Identical responses, so the endpoint cannot be used to enumerate accounts.
			assert.deepEqual(wrongPassword.body, unknownEmail.body);
		});

		it("rejects a malformed login body with 400", async () => {
			const res = await api("/auth/login", {
				method: "POST",
				body: { email: "not-an-email", password: PASSWORD },
			});

			assert.equal(res.status, 400);
			assert.equal(res.body.message, "Validation Error");
		});

		it("returns the caller's profile from /auth/me", async () => {
			const res = await api("/auth/me", { token: ownerToken });

			assert.equal(res.status, 200);
			assert.equal(res.body.data.email, OWNER_EMAIL);
			assert.equal(res.body.data.id, owner.toString());
		});

		it("rejects /auth/me without a token and with a forged token", async () => {
			const missing = await api("/auth/me");
			assert.equal(missing.status, 401);
			assert.equal(missing.body.message, "Missing bearer token");

			const forged = await api("/auth/me", { token: "not.a.jwt" });
			assert.equal(forged.status, 401);
			assert.equal(forged.body.message, "Invalid access token");
		});

		it("rotates the refresh token and rejects the superseded one", async () => {
			const session = await login(OWNER_EMAIL);
			const firstCookie = session.refreshCookie;

			const refreshed = await api("/auth/refresh", {
				method: "POST",
				cookie: firstCookie,
			});

			assert.equal(refreshed.status, 200);
			assert.ok(refreshed.body.data.accessToken);
			assert.ok(refreshed.refreshCookie);
			assert.notEqual(
				refreshed.refreshCookie,
				firstCookie,
				"rotation returned the same refresh token"
			);

			// A refresh token may only be used once.
			const replay = await api("/auth/refresh", {
				method: "POST",
				body: { refreshToken: firstCookie.replace("refreshToken=", "") },
			});

			assert.equal(replay.status, 401);
			assert.equal(replay.body.message, "Session is no longer active");
		});

		it("accepts the refresh token from the cookie as well as the body", async () => {
			const session = await login(OWNER_EMAIL);

			const res = await api("/auth/refresh", {
				method: "POST",
				cookie: session.refreshCookie,
			});

			assert.equal(res.status, 200);
		});

		it("rejects /auth/refresh without any token", async () => {
			const res = await api("/auth/refresh", { method: "POST" });

			assert.equal(res.status, 401);
			assert.equal(res.body.message, "Refresh token is required");
		});

		it("revokes the access token immediately on logout", async () => {
			const session = await login(OWNER_EMAIL);
			const token = session.body.data.accessToken;

			assert.equal((await api("/auth/me", { token })).status, 200);

			const out = await api("/auth/logout", {
				method: "POST",
				token,
				cookie: session.refreshCookie,
			});
			assert.equal(out.status, 200);

			const afterLogout = await api("/auth/me", { token });
			assert.equal(afterLogout.status, 401);
			assert.equal(afterLogout.body.message, "Access token has been revoked");

			// The same token must also be refused on proxied routes.
			const proxied = await api(`/api/submissions/${problemId}`, { token });
			assert.equal(proxied.status, 401);

			// And the session must not be resurrectable.
			const refreshAfterLogout = await api("/auth/refresh", {
				method: "POST",
				cookie: session.refreshCookie,
			});
			assert.equal(refreshAfterLogout.status, 401);
		});

		it("sends OTP and stores it in Redis", async () => {
			const res = await api("/auth/send-otp", {
				method: "POST",
				body: { email: "otp-test@lcarena.test" },
			});

			assert.equal(res.status, 200);
			assert.equal(res.body.message, "OTP sent successfully");

			const stored = await redisClient.get("otp:otp-test@lcarena.test");
			assert.ok(stored, "OTP not found in Redis");
			assert.equal(stored.length, 6);
		});

		it("rejects registration with invalid or missing OTP", async () => {
			const res = await api("/auth/register", {
				method: "POST",
				body: {
					email: "otp-test@lcarena.test",
					password: "ValidPassword123",
					name: "OTP Test User",
					otp: "000000",
				},
			});

			assert.equal(res.status, 400);
			assert.match(res.body.message, /Invalid or expired OTP/i);
		});

		it("registers a new user with valid OTP and issues tokens", async () => {
			await api("/auth/send-otp", {
				method: "POST",
				body: { email: "otp-test@lcarena.test" },
			});
			const otp = await redisClient.get("otp:otp-test@lcarena.test");
			assert.ok(otp);

			const res = await api("/auth/register", {
				method: "POST",
				body: {
					email: "otp-test@lcarena.test",
					password: "ValidPassword123",
					name: "OTP Test User",
					otp,
				},
			});

			assert.equal(res.status, 201);
			assert.equal(res.body.success, true);
			assert.ok(res.body.data.accessToken);
			assert.equal(res.body.data.user.email, "otp-test@lcarena.test");
			assert.ok(res.refreshCookie);

			// OTP is consumed and deleted
			assert.equal(await redisClient.get("otp:otp-test@lcarena.test"), null);
		});

		it("logs in using OTP verification (passwordless/2FA)", async () => {
			await api("/auth/send-otp", {
				method: "POST",
				body: { email: "otp-test@lcarena.test" },
			});
			const otp = await redisClient.get("otp:otp-test@lcarena.test");
			assert.ok(otp);

			const res = await api("/auth/login-otp", {
				method: "POST",
				body: { email: "otp-test@lcarena.test", otp },
			});

			assert.equal(res.status, 200);
			assert.ok(res.body.data.accessToken);
			assert.equal(res.body.data.user.email, "otp-test@lcarena.test");
		});

		it("changes user password with current password verification", async () => {
			const loginRes = await login("otp-test@lcarena.test", "ValidPassword123");
			const token = loginRes.body.data.accessToken;

			// Wrong current password fails
			const badCurrent = await api("/auth/change-password", {
				method: "POST",
				token,
				body: {
					currentPassword: "WrongPassword123",
					newPassword: "UpdatedPassword123",
				},
			});
			assert.equal(badCurrent.status, 400);

			// Correct current password succeeds
			const good = await api("/auth/change-password", {
				method: "POST",
				token,
				body: {
					currentPassword: "ValidPassword123",
					newPassword: "UpdatedPassword123",
				},
			});
			assert.equal(good.status, 200);

			// Verify login works with new password and fails with old
			assert.equal((await login("otp-test@lcarena.test", "ValidPassword123")).status, 401);
			assert.equal((await login("otp-test@lcarena.test", "UpdatedPassword123")).status, 200);
		});

		it("enforces role management: admin can promote/demote, non-admin is forbidden", async () => {
			// Regular user tries to promote someone -> 403 Forbidden
			const forbidden = await api(`/auth/users/${other}/role`, {
				method: "PATCH",
				token: ownerToken,
				body: { role: "Admin" },
			});
			assert.equal(forbidden.status, 403);

			// Admin promotes "other" from Regular to Admin
			const promote = await api(`/auth/users/${other}/role`, {
				method: "PATCH",
				token: adminToken,
				body: { role: "Admin" },
			});
			assert.equal(promote.status, 200);
			assert.equal(promote.body.data.userType, "Admin");

			// "other" now has Admin privileges and can mutate problems!
			const problemWrite = await api("/api/problems", {
				method: "POST",
				token: otherToken,
				body: problemPayload(),
			});
			assert.equal(problemWrite.status, 201);
			createdProblemIds.push(new ObjectId(problemWrite.body.data._id));

			// Admin demotes "other" back to Regular
			const demote = await api(`/auth/users/${other}/role`, {
				method: "PATCH",
				token: adminToken,
				body: { role: "Regular" },
			});
			assert.equal(demote.status, 200);
			assert.equal(demote.body.data.userType, "Regular");

			// "other" is now Regular again and cannot write to problems
			const writeAfterDemote = await api("/api/problems", {
				method: "POST",
				token: otherToken,
				body: problemPayload(),
			});
			assert.equal(writeAfterDemote.status, 403);
		});

		it("deletes user account and invalidates session", async () => {
			const loginRes = await login("otp-test@lcarena.test", "UpdatedPassword123");
			const token = loginRes.body.data.accessToken;

			const del = await api("/auth/account", {
				method: "DELETE",
				token,
			});
			assert.equal(del.status, 200);

			// Subsequent calls fail
			assert.equal((await api("/auth/me", { token })).status, 401);
			assert.equal((await login("otp-test@lcarena.test", "UpdatedPassword123")).status, 401);
		});
	});

	describe("problem routing", () => {
		it("proxies public problem reads without a token", async () => {
			const res = await api("/api/problems");

			assert.equal(res.status, 200);
			assert.equal(res.body.success, true);
			assert.ok(Array.isArray(res.body.data));
		});

		it("proxies a public single problem read", async () => {
			const res = await api(`/api/problems/${problemId}`);

			assert.equal(res.status, 200);
			assert.equal(res.body.data._id, problemId.toString());
		});

		it("rejects unauthenticated problem writes with 401", async () => {
			const res = await api("/api/problems", {
				method: "POST",
				body: problemPayload(),
			});

			assert.equal(res.status, 401);
		});

		it("rejects problem writes from a non-admin with 403", async () => {
			const create = await api("/api/problems", {
				method: "POST",
				token: ownerToken,
				body: problemPayload(),
			});
			assert.equal(create.status, 403);
			assert.match(create.body.message, /not allowed/);

			const update = await api(`/api/problems/${problemId}`, {
				method: "PUT",
				token: ownerToken,
				body: { difficulty: "Hard" },
			});
			assert.equal(update.status, 403);

			const remove = await api(`/api/problems/${problemId}`, {
				method: "DELETE",
				token: ownerToken,
			});
			assert.equal(remove.status, 403);
		});

		it("ignores a spoofed x-user-id header claiming admin", async () => {
			// The header is only ever trusted when the gateway sets it itself.
			const res = await api("/api/problems", {
				method: "POST",
				token: ownerToken,
				headers: { "x-user-id": admin.toString() },
				body: problemPayload(),
			});

			assert.equal(res.status, 403);
		});

		it("lets an admin create, update and delete a problem through the proxy", async () => {
			const created = await api("/api/problems", {
				method: "POST",
				token: adminToken,
				body: problemPayload(),
			});

			assert.equal(created.status, 201);
			const id = created.body.data._id;
			createdProblemIds.push(new ObjectId(id));

			// Confirm it really reached MongoDB via the chained services.
			const stored = await problems.findOne({ _id: new ObjectId(id) });
			assert.ok(stored, "problem was not persisted downstream");
			assert.equal(stored.difficulty, "Easy");

			const updated = await api(`/api/problems/${id}`, {
				method: "PUT",
				token: adminToken,
				body: { difficulty: "Hard" },
			});
			assert.equal(updated.status, 200);
			assert.equal(updated.body.data.difficulty, "Hard");

			const removed = await api(`/api/problems/${id}`, {
				method: "DELETE",
				token: adminToken,
			});
			assert.equal(removed.status, 200);
			assert.equal(await problems.countDocuments({ _id: new ObjectId(id) }), 0);
		});

		it("returns a JSON 404 for an unmapped route instead of proxying it", async () => {
			const res = await api("/api/nope");

			assert.equal(res.status, 404);
			assert.equal(res.body.success, false);
			assert.match(res.body.message, /No gateway route/);
		});

		it("returns 404 for an unregistered method on a mapped path", async () => {
			const res = await api("/api/problems", { method: "PATCH" });

			assert.equal(res.status, 404);
		});
	});

	describe("submission routing", () => {
		let submissionId;

		it("requires a token to submit", async () => {
			const res = await api("/api/submissions", {
				method: "POST",
				body: { problemId: problemId.toString(), code: "x", language: "js" },
			});

			assert.equal(res.status, 401);
		});

		it("creates a submission owned by the authenticated caller", async () => {
			const res = await api("/api/submissions", {
				method: "POST",
				token: ownerToken,
				body: {
					problemId: problemId.toString(),
					code: "console.log('hi')",
					language: "js",
				},
			});

			assert.equal(res.status, 201);
			submissionId = res.body.data._id;

			const stored = await submissions.findOne({ _id: new ObjectId(submissionId) });
			assert.ok(stored);
			assert.equal(stored.userId.toString(), owner.toString());
			assert.equal(stored.status.status, "PENDING");
		});

		it("does not let a client forge the submission owner via x-user-id", async () => {
			const res = await api("/api/submissions", {
				method: "POST",
				token: otherToken,
				headers: { "x-user-id": owner.toString() },
				body: {
					problemId: problemId.toString(),
					code: "forged",
					language: "js",
				},
			});

			assert.equal(res.status, 201);

			const stored = await submissions.findOne({
				_id: new ObjectId(res.body.data._id),
			});

			// Owner must be the token's user, never the supplied header.
			assert.equal(stored.userId.toString(), other.toString());
		});

		it("lets the owner read their submission", async () => {
			const res = await api(`/api/submissions/${submissionId}`, {
				token: ownerToken,
			});

			assert.equal(res.status, 200);
			assert.equal(res.body.data._id, submissionId);
		});

		it("refuses another user with 403", async () => {
			const res = await api(`/api/submissions/${submissionId}`, {
				token: otherToken,
			});

			assert.equal(res.status, 403);
			assert.match(res.body.message, /your own submissions/);
		});

		it("refuses an anonymous caller with 401", async () => {
			const res = await api(`/api/submissions/${submissionId}`);

			assert.equal(res.status, 401);
		});

		it("lets an admin read any submission", async () => {
			const res = await api(`/api/submissions/${submissionId}`, {
				token: adminToken,
			});

			assert.equal(res.status, 200);
		});

		it("lets the owner update their submission", async () => {
			const res = await api(`/api/submissions/${submissionId}`, {
				method: "PUT",
				token: ownerToken,
				body: { code: "console.log('updated')" },
			});

			assert.equal(res.status, 200);

			const stored = await submissions.findOne({
				_id: new ObjectId(submissionId),
			});
			assert.equal(stored.code, "console.log('updated')");
		});

		it("refuses a non-owner update with 403", async () => {
			const res = await api(`/api/submissions/${submissionId}`, {
				method: "PUT",
				token: otherToken,
				body: { code: "hijacked" },
			});

			assert.equal(res.status, 403);
		});

		it("reports a malformed id as 400 and an unknown id as 404", async () => {
			const malformed = await api("/api/submissions/not-an-id", {
				token: ownerToken,
			});
			assert.equal(malformed.status, 400);

			const unknown = await api("/api/submissions/000000000000000000000000", {
				token: ownerToken,
			});
			assert.equal(unknown.status, 404);
		});
	});
});
