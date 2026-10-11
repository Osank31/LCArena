const BASE_URL = process.env.PROBLEM_SERVICE_URL || 'http://localhost:3001';

async function testGetProblems() {
    console.log(`Testing GET /problems on ${BASE_URL}...`);
    try {
        // Adjust endpoint based on your actual routing
        const res = await fetch(`${BASE_URL}/problems`);
        console.log(`Status: ${res.status}`);
        
        if (res.ok) {
            console.log('✅ GET /problems test passed\n');
        } else {
            console.error('❌ GET /problems test failed\n');
            console.error('Response:', await res.text(), '\n');
        }
    } catch (err) {
        console.error('❌ Error during GET /problems:', err.message, '\n');
    }
}

async function runAllTests() {
    console.log('--- Starting Problem Service API Tests ---\n');
    await testGetProblems();
    // Add more endpoints to test here
}

runAllTests();
