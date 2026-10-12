import http from 'k6/http';
import { check, sleep } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 20,
    duration: __ENV.DURATION || '20s',
    thresholds: defaultThresholds.standard,
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';
const PROBLEM_ID = __ENV.TARGET_PROBLEM_ID || '6acbe44e0037ad06dc5f0c20';

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
    const authHeaders = {
        headers: { Authorization: `Bearer ${data.token}` },
    };

    // Step 1: User views profile
    const profileRes = http.get(`${BASE_URL}/auth/me`, {
        ...authHeaders,
        tags: { step: '1_profile' },
    });
    check(profileRes, { 'profile ok': (r) => r.status === 200 });

    // Step 2: User browses problem catalog
    const listRes = http.get(`${BASE_URL}/api/problems`, {
        ...authHeaders,
        tags: { step: '2_problem_list' },
    });
    check(listRes, { 'problem list ok': (r) => r.status === 200 });

    // Step 3: User opens specific problem
    const problemRes = http.get(`${BASE_URL}/api/problems/${PROBLEM_ID}`, {
        ...authHeaders,
        tags: { step: '3_problem_detail' },
    });
    check(problemRes, { 'problem detail ok': (r) => r.status === 200 });

    sleep(0.5); // user think time
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Workflow: E2E Problem Browsing' });
}
