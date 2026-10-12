import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 20,
    duration: __ENV.DURATION || '15s',
    thresholds: defaultThresholds.standard,
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';
const PROBLEM_ID = __ENV.TARGET_PROBLEM_ID || '6acbe44e0037ad06dc5f0c20';

export function setup() {
    // 1. Login regular user (owner)
    const userRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
            email: __ENV.TEST_USER_EMAIL || 'regular@lcarena.test',
            password: __ENV.TEST_USER_PASSWORD || 'Password123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    const ownerToken = JSON.parse(userRes.body).data?.accessToken;

    // 2. Login admin
    const adminRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
            email: __ENV.TEST_ADMIN_EMAIL || 'admin@lcarena.test',
            password: __ENV.TEST_ADMIN_PASSWORD || 'Password123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    const adminToken = JSON.parse(adminRes.body).data?.accessToken;

    // 3. Create a benchmark submission
    const subRes = http.post(
        `${BASE_URL}/api/submissions`,
        JSON.stringify({
            problemId: PROBLEM_ID,
            language: 'py',
            code: 'class Solution:\n    def solve(self, p): return len(p)\n',
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${ownerToken}`,
            },
        }
    );
    const submissionId = JSON.parse(subRes.body).data?._id;

    return { ownerToken, adminToken, submissionId };
}

export default function (data) {
    // Scenario 1: Owner reads submission (200)
    const res = http.get(`${BASE_URL}/api/submissions/${data.submissionId}`, {
        headers: { Authorization: `Bearer ${data.ownerToken}` },
        tags: { scenario: 'owner_get_submission' },
    });

    check(res, {
        'owner status is 200': (r) => r.status === 200,
        'has submission data': (r) => {
            try {
                return JSON.parse(r.body).data?._id === data.submissionId;
            } catch {
                return false;
            }
        },
    });

    // Scenario 2: Admin reads submission (200)
    if (__ITER % 10 === 0) {
        const adminRes = http.get(`${BASE_URL}/api/submissions/${data.submissionId}`, {
            headers: { Authorization: `Bearer ${data.adminToken}` },
            tags: { scenario: 'admin_get_submission' },
        });

        check(adminRes, {
            'admin status is 200': (r) => r.status === 200,
        });
    }

    // Scenario 3: Non-existent submission ID (404)
    if (__ITER % 20 === 0) {
        const notFoundRes = http.get(`${BASE_URL}/api/submissions/6acbe44e0037ad06dc5f0999`, {
            headers: { Authorization: `Bearer ${data.adminToken}` },
            tags: { scenario: 'nonexistent_submission' },
        });

        check(notFoundRes, {
            'not found returns 404': (r) => r.status === 404,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: GET /api/submissions/:id' });
}
