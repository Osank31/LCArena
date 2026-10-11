/**
 * Load test for the Submission service.
 *
 * POST / is authenticated: the service resolves the caller from the `x-user-id`
 * header, so a real user id is required.
 *
 * Usage:
 *   TEST_USER_ID=<mongo object id> node apps/apis/submission/test/load_test/submission.load.test.js
 *   TEST_USER_ID=<id> CONCURRENT_REQUESTS=200 node apps/apis/submission/test/load_test/submission.load.test.js
 */


const dotenv=require("dotenv")

dotenv.config()

const BASE_URL = process.env.SUBMISSION_SERVICE_URL || "http://localhost:3002";
const CONCURRENT_REQUESTS = Number(process.env.CONCURRENT_REQUESTS || 50);
const USER_ID = process.env.TEST_USER_ID;
const PROBLEM_ID = process.env.TEST_PROBLEM_ID || "000000000000000000000000";

if (!USER_ID) {
	console.error(
		"Missing TEST_USER_ID. POST / requires an existing user; pass a real MongoDB ObjectId."
	);
	process.exit(1);
}

async function runLoadTest() {
	console.log(`--- Starting Submission Service Load Test ---`);
	console.log(
		`Sending ${CONCURRENT_REQUESTS} concurrent requests to ${BASE_URL}/ ...\n`
	);

	const start = Date.now();

	const payload = {
		problemId: PROBLEM_ID,
		code: "function add(a, b) { return a + b; }",
		language: "js",
	};

	const requests = Array.from({ length: CONCURRENT_REQUESTS }).map(async () => {
		try {
			const res = await fetch(`${BASE_URL}/`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": USER_ID,
				},
				body: JSON.stringify(payload),
			});
			return { status: res.status, ok: res.ok };
		} catch (e) {
			return { error: e.message, ok: false };
		}
	});

	const results = await Promise.all(requests);
	const end = Date.now();

	const successful = results.filter((r) => r.ok).length;
	const failed = results.length - successful;

	console.log(`Load Test Completed in ${end - start}ms`);
	console.log(`Successful Requests: ${successful}`);
	console.log(`Failed Requests: ${failed}`);

	if (failed > 0) {
		const sample = results.filter((r) => !r.ok).slice(0, 5);
		console.error("Sample failures:", JSON.stringify(sample));
		process.exitCode = 1;
	}
}

runLoadTest();
