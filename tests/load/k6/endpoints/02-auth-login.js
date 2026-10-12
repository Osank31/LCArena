import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 20,
    duration: __ENV.DURATION || '15s',
    thresholds: defaultThresholds.heavy, // Bcrypt password hashing is CPU intensive
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';
const VALID_EMAIL = __ENV.TEST_USER_EMAIL || 'regular@lcarena.test';
const VALID_PASSWORD = __ENV.TEST_USER_PASSWORD || 'Password123';

export default function () {
    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    // Scenario 1: Normal valid login (80% of traffic)
    const validPayload = JSON.stringify({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
    });

    const resValid = http.post(`${BASE_URL}/auth/login`, validPayload, {
        ...params,
        tags: { scenario: 'valid_login' },
    });

    check(resValid, {
        'valid login status is 200': (r) => r.status === 200,
        'valid login has token': (r) => {
            try {
                const body = JSON.parse(r.body);
                return Boolean(body.data?.accessToken);
            } catch {
                return false;
            }
        },
    });

    // Scenario 2: Invalid password check (10% of iterations)
    if (__ITER % 10 === 0) {
        const invalidPayload = JSON.stringify({
            email: VALID_EMAIL,
            password: 'WrongPassword123!',
        });

        const resInvalid = http.post(`${BASE_URL}/auth/login`, invalidPayload, {
            ...params,
            tags: { scenario: 'invalid_password' },
        });

        check(resInvalid, {
            'wrong password returns 401': (r) => r.status === 401,
        });
    }

    // Scenario 3: Validation failure - missing password (10% of iterations)
    if (__ITER % 10 === 5) {
        const missingFieldPayload = JSON.stringify({
            email: VALID_EMAIL,
        });

        const resMissing = http.post(`${BASE_URL}/auth/login`, missingFieldPayload, {
            ...params,
            tags: { scenario: 'validation_error' },
        });

        check(resMissing, {
            'missing password returns 400': (r) => r.status === 400,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: POST /auth/login' });
}
