/**
 * Load test for the Problem service.
 *
 * Usage:
 *   node apps/apis/problem/test/load_test/problem.load.test.js
 *   CONCURRENT_REQUESTS=200 node apps/apis/problem/test/load_test/problem.load.test.js
 */

const dotenv=require("dotenv")

dotenv.config()

const BASE_URL = process.env.PROBLEM_SERVICE_URL || "http://localhost:3001";

const CONCURRENT_REQUESTS = Number(process.env.CONCURRENT_REQUESTS || 50);

async function runLoadTest() {
	console.log(`--- Starting Problem Service Load Test ---`);
	console.log(
		`Sending ${CONCURRENT_REQUESTS} concurrent requests to ${BASE_URL}/ ...\n`
	);

	const start = Date.now();

	const requests = Array.from({ length: CONCURRENT_REQUESTS }).map(async () => {
		try {
			const res = await fetch(`${BASE_URL}/`);
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
