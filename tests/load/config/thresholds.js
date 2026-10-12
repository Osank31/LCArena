/**
 * Configurable Performance SLA Thresholds
 * These can be tuned or overridden per test profile.
 */
export const defaultThresholds = {
    // Fast read endpoints (e.g., /health, cached queries)
    fast: {
        http_req_failed: ['rate<0.01'], // < 1% errors
        http_req_duration: [
            'p(50)<50',  // 50% under 50ms
            'p(90)<100', // 90% under 100ms
            'p(95)<150', // 95% under 150ms
            'p(99)<300', // 99% under 300ms
        ],
    },
    // Standard CRUD and DB read/write operations (e.g. login, problem detail)
    standard: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: [
            'p(50)<100',
            'p(90)<250',
            'p(95)<400',
            'p(99)<800',
        ],
    },
    // Heavy operations (e.g. submissions ingestion, auth crypto hashing)
    heavy: {
        http_req_failed: ['rate<0.02'],
        http_req_duration: [
            'p(50)<250',
            'p(90)<600',
            'p(95)<1000',
            'p(99)<2500',
        ],
    },
    // Stress / breaking point test profile (tolerant thresholds)
    stress: {
        http_req_failed: ['rate<0.10'], // up to 10% errors allowed before aborting
        http_req_duration: [
            'p(90)<2000',
            'p(95)<4000',
        ],
    },
    // Code evaluation workflow (asynchronous container compilation + execution)
    evaluationWorkflow: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: [
            'p(95)<5000',
        ],
    },
};
