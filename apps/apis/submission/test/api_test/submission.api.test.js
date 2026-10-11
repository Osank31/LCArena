const BASE_URL = process.env.SUBMISSION_SERVICE_URL || 'http://localhost:3001';

async function testSubmitCode() {
    console.log(`Testing POST /submit on ${BASE_URL}...`);
    try {
        const payload = {
            problemId: "1",
            code: "console.log('Hello World');",
            language: "javascript"
        };

        const res = await fetch(`${BASE_URL}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${res.status}`);
        
        if (res.ok) {
            console.log('✅ POST /submit test passed\n');
        } else {
            console.error('❌ POST /submit test failed\n');
        }
    } catch (err) {
        console.error('❌ Error during POST /submit:', err.message, '\n');
    }
}

async function runAllTests() {
    console.log('--- Starting Submission Service API Tests ---\n');
    await testSubmitCode();
    // Add more endpoints to test here
}

runAllTests();
