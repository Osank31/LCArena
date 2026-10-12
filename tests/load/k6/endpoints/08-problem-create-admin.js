import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 5,
    duration: __ENV.DURATION || '15s',
    thresholds: defaultThresholds.standard,
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';

export function setup() {
    // Acquire Admin token and Regular user token
    const adminRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
            email: __ENV.TEST_ADMIN_EMAIL || 'admin@lcarena.test',
            password: __ENV.TEST_ADMIN_PASSWORD || 'Password123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    const adminToken = JSON.parse(adminRes.body).data?.accessToken;

    const userRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
            email: __ENV.TEST_USER_EMAIL || 'regular@lcarena.test',
            password: __ENV.TEST_USER_PASSWORD || 'Password123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    const userToken = JSON.parse(userRes.body).data?.accessToken;

    return { adminToken, userToken };
}

export default function (data) {
    // Scenario 1: Admin creates problem (201)
    const validProblemPayload = JSON.stringify({
        description: `Load Test Mutation Problem: ${__VU}-${__ITER} testing database write throughput.`,
        difficulty: 'Easy',
        sampleTestCaseUrl: 'https://seed.lcarena.local/sample.txt',
        testCasesUrl: 'https://seed.lcarena.local/testcases.zip',
        time_limit: 2000,
    });

    const createRes = http.post(`${BASE_URL}/api/problems`, validProblemPayload, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.adminToken}`,
        },
        tags: { scenario: 'admin_create_problem' },
    });

    check(createRes, {
        'admin create status is 201': (r) => r.status === 201,
        'has created problem id': (r) => {
            try {
                return Boolean(JSON.parse(r.body).data?._id);
            } catch {
                return false;
            }
        },
    });

    // Scenario 2: Regular user forbidden check (403)
    if (__ITER % 5 === 0) {
        const forbiddenRes = http.post(`${BASE_URL}/api/problems`, validProblemPayload, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.userToken}`,
            },
            tags: { scenario: 'regular_user_forbidden' },
        });

        check(forbiddenRes, {
            'regular user returns 403': (r) => r.status === 403,
        });
    }

    // Scenario 3: Validation failure (400)
    if (__ITER % 5 === 1) {
        const badPayload = JSON.stringify({
            description: 'Short', // Less than 10 characters
            difficulty: 'InvalidDifficulty',
        });

        const badRes = http.post(`${BASE_URL}/api/problems`, badPayload, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.adminToken}`,
            },
            tags: { scenario: 'validation_error' },
        });

        check(badRes, {
            'invalid schema returns 400': (r) => r.status === 400,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: POST /api/problems (Admin CRUD & RBAC)' });
}
