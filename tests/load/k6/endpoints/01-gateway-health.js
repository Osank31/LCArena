import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 20,
    duration: __ENV.DURATION || '15s',
    thresholds: defaultThresholds.fast,
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';

export default function () {
    const res = http.get(`${BASE_URL}/health`, {
        tags: { endpoint: 'gateway_health' },
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'has healthy message': (r) => {
            try {
                return JSON.parse(r.body).message === 'Gateway Healthy';
            } catch {
                return false;
            }
        },
    });
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: GET /health (Gateway)' });
}
