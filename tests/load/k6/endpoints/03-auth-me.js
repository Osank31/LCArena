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

export function setup() {
    // Acquire a fresh token once during setup phase
    const res = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
            email: __ENV.TEST_USER_EMAIL || 'regular@lcarena.test',
            password: __ENV.TEST_USER_PASSWORD || 'Password123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    const body = JSON.parse(res.body);
    return { token: body.data?.accessToken };
}

export default function (data) {
    const validHeaders = {
        headers: { Authorization: `Bearer ${data.token}` },
        tags: { scenario: 'authenticated_me' },
    };

    const res = http.get(`${BASE_URL}/auth/me`, validHeaders);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'profile returned': (r) => {
            try {
                return JSON.parse(r.body).data?.email === (__ENV.TEST_USER_EMAIL || 'regular@lcarena.test');
            } catch {
                return false;
            }
        },
    });

    // Unauthorized scenario
    if (__ITER % 20 === 0) {
        const unauthRes = http.get(`${BASE_URL}/auth/me`, {
            tags: { scenario: 'unauthorized_me' },
        });
        check(unauthRes, {
            'unauthorized returns 401': (r) => r.status === 401,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: GET /auth/me' });
}
