import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 25,
    duration: __ENV.DURATION || '20s',
    thresholds: defaultThresholds.heavy,
};

const MAIL_URL = __ENV.MAIL_SERVICE_URL || 'http://127.0.0.1:3003';

export default function () {
    const payload = JSON.stringify({
        email: `bench-${__VU}-${__ITER}@lcarena.test`,
        otp: '654321',
    });

    const res = http.post(`${MAIL_URL}/otp`, payload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { service: 'mail_service_isolated' },
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
    });
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Service: Mail Service (Isolated Capacity)' });
}
