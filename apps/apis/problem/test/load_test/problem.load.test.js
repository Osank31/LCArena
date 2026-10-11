const BASE_URL = process.env.PROBLEM_SERVICE_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = 50; // Configure the load here

async function runLoadTest() {
    console.log(`--- Starting Problem Service Load Test ---`);
    console.log(`Sending ${CONCURRENT_REQUESTS} concurrent requests to ${BASE_URL}/problems...\n`);
    
    const start = Date.now();
    
    // Fire off multiple requests at once
    const requests = Array.from({ length: CONCURRENT_REQUESTS }).map(async () => {
        try {
            const res = await fetch(`${BASE_URL}/problems`);
            return { status: res.status, ok: res.ok };
        } catch (e) {
            return { error: e.message, ok: false };
        }
    });

    const results = await Promise.all(requests);
    const end = Date.now();
    
    const successful = results.filter(r => r.ok).length;
    const failed = CONCURRENT_REQUESTS - successful;

    console.log(`Load Test Completed in ${end - start}ms`);
    console.log(`✅ Successful Requests: ${successful}`);
    console.log(`❌ Failed Requests: ${failed}`);
}

runLoadTest();
