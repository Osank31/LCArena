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
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
            email: __ENV.TEST_USER_EMAIL || 'regular@lcarena.test',
            password: __ENV.TEST_USER_PASSWORD || 'Password123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    const body = JSON.parse(loginRes.body);
    return { token: body.data?.accessToken };
}

export default function (data) {
    const payload = JSON.stringify({
        problemId: PROBLEM_ID,
        language: 'py',
        code: `class Solution:\n    def solve(self, points):\n        # loadtest run ${__VU}-${__ITER}\n        return len(points)\n`,
    });

    const res = http.post(`${BASE_URL}/api/submissions`, payload, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`,
        },
        tags: { scenario: 'create_submission' },
    });

    check(res, {
        'status is 201': (r) => r.status === 201,
        'submission is pending': (r) => {
            try {
                const parsed = JSON.parse(r.body);
                return parsed.data?.status?.status === 'PENDING';
            } catch {
                return false;
            }
        },
    });

    // Unauthenticated scenario
    if (__ITER % 20 === 0) {
        const unauthRes = http.post(`${BASE_URL}/api/submissions`, payload, {
            headers: { 'Content-Type': 'application/json' },
            tags: { scenario: 'unauthorized_submission' },
        });

        check(unauthRes, {
            'unauthorized returns 401': (r) => r.status === 401,
        });
    }

    // Invalid problem ID
    if (__ITER % 20 === 5) {
        const badPayload = JSON.stringify({
            problemId: 'invalid-id-format',
            language: 'py',
            code: 'pass',
        });

        const badRes = http.post(`${BASE_URL}/api/submissions`, badPayload, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.token}`,
            },
            tags: { scenario: 'invalid_problem_id' },
        });

        check(badRes, {
            'invalid problem returns 400': (r) => r.status === 400,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: POST /api/submissions (Ingestion)' });
}
