import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
    duration: __ENV.DURATION || '15s',
    thresholds: defaultThresholds.standard,
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';

export default function () {
    // Each VU logs in to get an active refresh session, then tests refresh
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
            email: __ENV.TEST_USER_EMAIL || 'regular@lcarena.test',
            password: __ENV.TEST_USER_PASSWORD || 'Password123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );

    const cookies = loginRes.cookies;
    const refreshCookie = cookies['refreshToken'] ? cookies['refreshToken'][0]?.value : null;

    if (refreshCookie) {
        // Valid refresh with cookie
        const refreshRes = http.post(
            `${BASE_URL}/auth/refresh`,
            JSON.stringify({}),
            {
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: `refreshToken=${refreshCookie}`,
                },
                tags: { scenario: 'valid_refresh' },
            }
        );

        check(refreshRes, {
            'refresh status is 200': (r) => r.status === 200,
            'new access token issued': (r) => {
                try {
                    return Boolean(JSON.parse(r.body).data?.accessToken);
                } catch {
                    return false;
                }
            },
        });
    }

    // Invalid refresh scenario
    const invalidRes = http.post(
        `${BASE_URL}/auth/refresh`,
        JSON.stringify({ refreshToken: 'invalid.jwt.token' }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { scenario: 'invalid_refresh' },
        }
    );

    check(invalidRes, {
        'invalid refresh returns 401': (r) => r.status === 401,
    });
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: POST /auth/refresh' });
}
