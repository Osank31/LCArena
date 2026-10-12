import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 50,
    duration: __ENV.DURATION || '20s',
    thresholds: defaultThresholds.standard,
};

const PROBLEM_URL = __ENV.PROBLEM_SERVICE_URL || 'http://127.0.0.1:3001';
const PROBLEM_ID = __ENV.TARGET_PROBLEM_ID || '6acbe44e0037ad06dc5f0c20';

export default function () {
    // 50% list, 50% single problem
    if (__ITER % 2 === 0) {
        const res = http.get(`${PROBLEM_URL}/`, {
            tags: { service: 'problem_service_list' },
        });
        check(res, {
            'list status is 200': (r) => r.status === 200,
        });
    } else {
        const res = http.get(`${PROBLEM_URL}/${PROBLEM_ID}`, {
            tags: { service: 'problem_service_get' },
        });
        check(res, {
            'get status is 200': (r) => r.status === 200,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Service: Problem Service (Isolated Capacity)' });
}
