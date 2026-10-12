import http from 'k6/http';
import { check } from 'k6';
import { defaultThresholds } from '../../config/thresholds.js';
import { generateSummary } from '../lib/summary-reporter.js';

export const options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
    duration: __ENV.DURATION || '15s',
    thresholds: defaultThresholds.standard,
};

const BASE_URL = __ENV.AI_SERVICE_URL || 'http://127.0.0.1:8000';

export default function () {
    // Scenario 1: Validation rejection for empty prefix & suffix (Expected 400)
    const emptyPayload = JSON.stringify({
        prefix: '',
        suffix: '',
        language_id: 'python',
        cursor_position: { row: 0, col: 0 },
        editor_info: 'k6-load-tester',
    });

    const resEmpty = http.post(`${BASE_URL}/suggestions`, emptyPayload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'empty_prefix_suffix_validation' },
    });

    check(resEmpty, {
        'empty prefix/suffix returns 400': (r) => r.status === 400,
    });

    // Scenario 2: Schema validation failure (missing language_id) (Expected 422)
    if (__ITER % 5 === 0) {
        const invalidPayload = JSON.stringify({
            prefix: 'def add(a, b):',
            suffix: 'return a + b',
            cursor_position: { row: 1, col: 0 },
        });

        const resInvalid = http.post(`${BASE_URL}/suggestions`, invalidPayload, {
            headers: { 'Content-Type': 'application/json' },
            tags: { scenario: 'schema_validation_error' },
        });

        check(resInvalid, {
            'missing required field returns 422': (r) => r.status === 422,
        });
    }

    // Scenario 3: Swagger docs liveness (Expected 200)
    if (__ITER % 10 === 0) {
        const resDocs = http.get(`${BASE_URL}/docs`, {
            tags: { scenario: 'swagger_docs_liveness' },
        });

        check(resDocs, {
            'docs status is 200': (r) => r.status === 200,
        });
    }
}

export function handleSummary(data) {
    return generateSummary(data, { testName: 'Endpoint: POST /suggestions (AI Suggestion Service)' });
}
