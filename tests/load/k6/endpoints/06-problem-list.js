import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 25,
    duration: __ENV.DURATION || '15s',
    thresholds: defaultThresholds.standard,
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';

export default function () {
    const res = http.get(`${BASE_URL}/api/problems`, {
        tags: { endpoint: 'problem_list' },
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'returns array of problems': (r) => {
            try {
                const body = JSON.parse(r.body);
                return Array.isArray(body.data) && body.data.length > 0;
            } catch {
                return false;
            }
        },
    });
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: GET /api/problems (Gateway)' });
}
