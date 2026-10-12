import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
    duration: __ENV.DURATION || '15s',
    thresholds: defaultThresholds.heavy,
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';

export default function () {
    const email = `loadtest-${__VU}-${__ITER}@lcarena.test`;

    const res = http.post(
        `${BASE_URL}/auth/send-otp`,
        JSON.stringify({ email }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { scenario: 'valid_otp_request' },
        }
    );

    check(res, {
        'otp send status is 200': (r) => r.status === 200,
        'success message returned': (r) => {
            try {
                return JSON.parse(r.body).message === 'OTP sent successfully';
            } catch {
                return false;
            }
        },
    });

    if (__ITER % 10 === 0) {
        const badRes = http.post(
            `${BASE_URL}/auth/send-otp`,
            JSON.stringify({ email: 'not-an-email' }),
            {
                headers: { 'Content-Type': 'application/json' },
                tags: { scenario: 'invalid_email_format' },
            }
        );

        check(badRes, {
            'bad email returns 400': (r) => r.status === 400,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: POST /auth/send-otp' });
}
