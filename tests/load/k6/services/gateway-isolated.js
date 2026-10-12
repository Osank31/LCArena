import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 50,
    duration: __ENV.DURATION || '20s',
    thresholds: defaultThresholds.standard,
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';

export function setup() {
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
    // Drive Gateway through authentication verification pipeline
    const res = http.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
        tags: { service: 'gateway_isolated' },
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
    });
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Service: API Gateway (Isolated Capacity)' });
}
