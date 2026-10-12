/**
 * Test Profiles Definition
 * Configurable virtual users, durations, ramp-up, and ramp-down rates.
 */
export const testProfiles = {
    // A. Smoke test: fast sanity check with minimal concurrency
    smoke: {
        scenarios: {
            smoke_test: {
                executor: 'constant-vus',
                vus: 5,
                duration: '10s',
                gracefulStop: '5s',
            },
        },
    },

    // B. Baseline test: steady low workload to establish normal latency & throughput
    baseline: {
        scenarios: {
            baseline_test: {
                executor: 'constant-vus',
                vus: 10,
                duration: '30s',
                gracefulStop: '5s',
            },
        },
    },

    // C. Stepped Load test: configurable user levels (10 -> 25 -> 50 -> 100 -> 200)
    load_10: {
        scenarios: {
            load_10: {
                executor: 'constant-vus',
                vus: 10,
                duration: '20s',
                gracefulStop: '5s',
            },
        },
    },

    load_25: {
        scenarios: {
            load_25: {
                executor: 'constant-vus',
                vus: 25,
                duration: '20s',
                gracefulStop: '5s',
            },
        },
    },

    load_50: {
        scenarios: {
            load_50: {
                executor: 'constant-vus',
                vus: 50,
                duration: '20s',
                gracefulStop: '5s',
            },
        },
    },

    load_100: {
        scenarios: {
            load_100: {
                executor: 'constant-vus',
                vus: 100,
                duration: '20s',
                gracefulStop: '5s',
            },
        },
    },

    load_200: {
        scenarios: {
            load_200: {
                executor: 'constant-vus',
                vus: 200,
                duration: '20s',
                gracefulStop: '5s',
            },
        },
    },

    // Stepped multi-stage load test
    stepped_load: {
        scenarios: {
            stepped: {
                executor: 'ramping-vus',
                startVUs: 0,
                stages: [
                    { duration: '10s', target: 10 },
                    { duration: '15s', target: 25 },
                    { duration: '15s', target: 50 },
                    { duration: '15s', target: 100 },
                    { duration: '15s', target: 200 },
                    { duration: '10s', target: 0 },
                ],
                gracefulRampDown: '5s',
            },
        },
    },

    // D. Stress test: pushing towards saturation limit
    stress: {
        scenarios: {
            stress_test: {
                executor: 'ramping-vus',
                startVUs: 10,
                stages: [
                    { duration: '15s', target: 50 },
                    { duration: '20s', target: 150 },
                    { duration: '20s', target: 300 },
                    { duration: '15s', target: 400 },
                    { duration: '15s', target: 0 },
                ],
                gracefulRampDown: '10s',
            },
        },
    },

    // E. Spike test: sudden high traffic burst
    spike: {
        scenarios: {
            spike_test: {
                executor: 'ramping-vus',
                startVUs: 5,
                stages: [
                    { duration: '5s', target: 5 },   // warm-up baseline
                    { duration: '3s', target: 150 }, // sudden burst
                    { duration: '15s', target: 150 },// sustained peak
                    { duration: '5s', target: 5 },   // rapid drop
                    { duration: '10s', target: 5 },  // baseline post-burst
                ],
                gracefulRampDown: '5s',
            },
        },
    },

    // F. Soak test: sustained moderate workload over time
    soak: {
        scenarios: {
            soak_test: {
                executor: 'constant-vus',
                vus: 30,
                duration: '120s', // 2 minutes soak
                gracefulStop: '10s',
            },
        },
    },

    // G. Recovery test: heavy spike followed by cooldown to measure recovery
    recovery: {
        scenarios: {
            recovery_test: {
                executor: 'ramping-vus',
                startVUs: 5,
                stages: [
                    { duration: '10s', target: 10 },  // Phase 1: Pre-spike normal
                    { duration: '5s', target: 200 },  // Phase 2: Overload spike
                    { duration: '15s', target: 200 }, // Phase 2: Saturation
                    { duration: '5s', target: 5 },    // Phase 3: Traffic cut
                    { duration: '20s', target: 5 },   // Phase 4: Recovery verification
                ],
                gracefulRampDown: '5s',
            },
        },
    },
};
