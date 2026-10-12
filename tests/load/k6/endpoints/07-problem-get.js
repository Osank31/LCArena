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
const PROBLEM_ID = __ENV.TARGET_PROBLEM_ID || '6acbe44e0037ad06dc5f0c20';

export default function () {
    // Scenario 1: Fetch valid problem (90% traffic)
    const res = http.get(`${BASE_URL}/api/problems/${PROBLEM_ID}`, {
        tags: { scenario: 'get_existing_problem' },
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'has correct id': (r) => {
            try {
                return JSON.parse(r.body).data?._id === PROBLEM_ID;
            } catch {
                return false;
            }
        },
    });

    // Scenario 2: Non-existent problem (10% traffic)
    if (__ITER % 10 === 0) {
        const notFoundRes = http.get(`${BASE_URL}/api/problems/6acbe44e0037ad06dc5f0999`, {
            tags: { scenario: 'get_nonexistent_problem' },
        });

        check(notFoundRes, {
            'non-existent returns 404': (r) => r.status === 404,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: GET /api/problems/:id' });
}
