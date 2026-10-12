import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
    duration: __ENV.DURATION || '15s',
    thresholds: defaultThresholds.heavy,
};

const BASE_URL = __ENV.MAIL_SERVICE_URL || 'http://127.0.0.1:3003';

export default function () {
    const payload = JSON.stringify({
        email: `tester-${__VU}-${__ITER}@lcarena.test`,
        otp: '123456',
    });

    const res = http.post(`${BASE_URL}/otp`, payload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'mail_otp' },
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'success message returned': (r) => {
            try {
                return JSON.parse(r.body).message === 'OTP email sent successfully';
            } catch {
                return false;
            }
        },
    });

    // Validation error check
    if (__ITER % 10 === 0) {
        const badRes = http.post(
            `${BASE_URL}/otp`,
            JSON.stringify({ email: 'bad-email', otp: '12' }),
            {
                headers: { 'Content-Type': 'application/json' },
                tags: { scenario: 'mail_validation_error' },
            }
        );

        check(badRes, {
            'validation failure returns 400': (r) => r.status === 400,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: POST /otp (Mail Service Direct)' });
}
