import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 50,
    duration: __ENV.DURATION || '20s',
    thresholds: defaultThresholds.standard,
};

const SUBMISSION_URL = __ENV.SUBMISSION_SERVICE_URL || 'http://127.0.0.1:3002';
const PROBLEM_ID = __ENV.TARGET_PROBLEM_ID || '6acbe44e0037ad06dc5f0c20';
const USER_ID = __ENV.TARGET_USER_ID || '6acb3db878de73ea0b742ffc';

export default function () {
    const payload = JSON.stringify({
        problemId: PROBLEM_ID,
        language: 'py',
        code: `class Solution:\n    def solve(self, p): return len(p)\n`,
    });

    const res = http.post(`${SUBMISSION_URL}/`, payload, {
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': USER_ID,
        },
        tags: { service: 'submission_service_isolated' },
    });

    check(res, {
        'status is 201': (r) => r.status === 201,
        'has submission id': (r) => {
            try {
                return Boolean(JSON.parse(r.body).data?._id);
            } catch {
                return false;
            }
        },
    });
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Service: Submission Service (Isolated Capacity)' });
}
