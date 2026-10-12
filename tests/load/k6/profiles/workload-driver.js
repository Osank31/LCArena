import http from 'k6/http';
import { check, sleep } from 'k6';
import { testProfiles } from '../../config/profiles.js';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

const selectedProfile = __ENV.PROFILE || 'smoke';
const profileConfig = testProfiles[selectedProfile] || testProfiles.smoke;

export const options = Object.assign({}, profileConfig, {
    thresholds: selectedProfile === 'stress' ? defaultThresholds.stress : defaultThresholds.standard,
});

const BASE_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:3000';
const PROBLEM_ID = __ENV.TARGET_PROBLEM_ID || '6acbe44e0037ad06dc5f0c20';

export function setup() {
    // Acquire regular user token
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
    const defaultHeaders = {
        Authorization: `Bearer ${data.token}`,
    };

    // Distribute user traffic across realistic application operations:
    const rand = Math.random();

    if (rand < 0.40) {
        // 40% problem catalog listing
        const res = http.get(`${BASE_URL}/api/problems`, {
            tags: { operation: 'problem_list' },
        });
        check(res, { 'problem list ok': (r) => r.status === 200 });
    } else if (rand < 0.70) {
        // 30% single problem inspection
        const res = http.get(`${BASE_URL}/api/problems/${PROBLEM_ID}`, {
            tags: { operation: 'problem_detail' },
        });
        check(res, { 'problem detail ok': (r) => r.status === 200 });
    } else if (rand < 0.85) {
        // 15% user profile checks
        const res = http.get(`${BASE_URL}/auth/me`, {
            headers: defaultHeaders,
            tags: { operation: 'profile_me' },
        });
        check(res, { 'profile ok': (r) => r.status === 200 });
    } else {
        // 15% submission ingestion
        const payload = JSON.stringify({
            problemId: PROBLEM_ID,
            language: 'py',
            code: `class Solution:\n    def solve(self, p):\n        # loadtest run ${__VU}-${__ITER}\n        return len(p)\n`,
        });
        const res = http.post(`${BASE_URL}/api/submissions`, payload, {
            headers: Object.assign({ 'Content-Type': 'application/json' }, defaultHeaders),
            tags: { operation: 'submit_solution' },
        });
        check(res, { 'submit ok': (r) => r.status === 201 });
    }

    sleep(0.1);
}

export function handleSummary(data) {
    return generateSummary(data, { testName: `Profile: ${selectedProfile.toUpperCase()} Test` });
}
