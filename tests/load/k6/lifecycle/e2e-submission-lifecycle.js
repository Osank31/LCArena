import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

// Custom metrics for asynchronous evaluation pipeline
const e2eEvaluationLatency = new Trend('e2e_evaluation_duration_ms');
const completedSubmissions = new Counter('submissions_completed_total');
const timedOutSubmissions = new Counter('submissions_poll_timeout_total');

export const options = {
    // Explicit bounded concurrency to avoid overwhelming Docker daemon
    vus: __ENV.MAX_SUBMISSION_CONCURRENCY ? parseInt(__ENV.MAX_SUBMISSION_CONCURRENCY) : 5,
    duration: __ENV.DURATION || '25s',
    thresholds: defaultThresholds.evaluationWorkflow,
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';
const PROBLEM_ID = __ENV.TARGET_PROBLEM_ID || '6acbe44e0037ad06dc5f0c20';

// Deterministic test programs
const PROGRAMS = [
    {
        lang: 'py',
        code: `import math
from collections import defaultdict
class Solution:
    def solve(self, points):
        n = len(points)
        if n <= 2: return n
        return 2
`,
    },
    {
        lang: 'py',
        code: `class Solution:\n    def solve(self, p): return -1\n`, // Wrong Answer
    },
    {
        lang: 'py',
        code: `class Solution: def solve( invalid syntax`, // Compile/Syntax Error
    },
];

export function setup() {
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
            email: __ENV.TEST_USER_EMAIL || 'regular@lcarena.test',
            password: __ENV.TEST_USER_PASSWORD || 'Password123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    const body = JSON.parse(loginRes.body);
    return { token: body.data?.accessToken };
}

export default function (data) {
    const programIndex = __ITER % PROGRAMS.length;
    const { lang, code } = PROGRAMS[programIndex];

    const startTime = Date.now();

    // 1. Submit solution through Gateway
    const submitPayload = JSON.stringify({
        problemId: PROBLEM_ID,
        language: lang,
        code: code,
    });

    const submitRes = http.post(`${BASE_URL}/api/submissions`, submitPayload, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`,
        },
        tags: { step: 'submit_solution' },
    });

    const isSubmitted = check(submitRes, {
        'submission accepted 201': (r) => r.status === 201,
    });

    if (!isSubmitted) return;

    let submissionId;
    try {
        submissionId = JSON.parse(submitRes.body).data?._id;
    } catch {
        return;
    }

    if (!submissionId) return;

    // 2. Poll submission status until completed (bounded to 15 seconds)
    let completed = false;
    const maxPollAttempts = 15;

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
        sleep(1.0); // 1-second polling interval

        const pollRes = http.get(`${BASE_URL}/api/submissions/${submissionId}`, {
            headers: { Authorization: `Bearer ${data.token}` },
            tags: { step: 'poll_submission_status' },
        });

        if (pollRes.status === 200) {
            try {
                const subData = JSON.parse(pollRes.body);
                const verdict = subData.data?.status?.status;

                if (verdict && verdict !== 'PENDING') {
                    completed = true;
                    const totalDuration = Date.now() - startTime;
                    e2eEvaluationLatency.add(totalDuration);
                    completedSubmissions.add(1);
                    break;
                }
            } catch {
                // parse error, continue polling
            }
        }
    }

    if (!completed) {
        timedOutSubmissions.add(1);
    }

    check(completed, {
        'evaluation finished within timeout': (c) => c === true,
    });
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Workflow: End-to-End Submission & Docker Execution Lifecycle' });
}
