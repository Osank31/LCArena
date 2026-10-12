#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeK6Test } from './run-test.js';
import { seedLoadFixtures } from '../fixtures/seed-fixtures.js';
import { cleanupLoadFixtures } from '../fixtures/cleanup-fixtures.js';
import { generatePerformanceReport } from '../reports/report-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOAD_ROOT = path.resolve(__dirname, '..');
const RESULTS_DIR = path.join(LOAD_ROOT, 'results');

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const valueOf = (f) => {
    const match = args.find((a) => a.startsWith(`${f}=`));
    if (match) return match.slice(f.length + 1);
    const idx = args.indexOf(f);
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
        return args[idx + 1];
    }
    return undefined;
};

if (hasFlag('--help') || hasFlag('-h')) {
    console.log(`
LCArena Backend Load Testing Suite Runner

Usage: node tests/load/runners/suite-runner.js [options]

Options:
  --type=<type>       Suite to execute:
                      - smoke       : Quick sanity check across services
                      - baseline    : Steady low-load benchmark
                      - stepped     : Multi-stage load test (10 -> 25 -> 50 -> 100 -> 200 VUs)
                      - stress      : Saturation limit / breaking point test
                      - spike       : Sudden burst traffic test
                      - soak        : Sustained moderate load test
                      - recovery    : Spike followed by cooldown recovery measurement
                      - endpoints   : Test every API endpoint individually
                      - services    : Test each microservice independently
                      - lifecycle   : End-to-end request lifecycle & workflows
                      - all         : Complete comprehensive benchmark suite (default)

  --target=<name>     Drive a single specific script or endpoint
  --vus=<number>      Override virtual user count
  --duration=<time>   Override duration (e.g. 15s, 30s)
  --no-cleanup        Skip post-test fixture cleanup
  --skip-seed         Skip pre-test fixture seeding
`);
    process.exit(0);
}

const type = valueOf('--type') || 'all';
const customTarget = valueOf('--target');
const customVus = valueOf('--vus');
const customDuration = valueOf('--duration');
const skipCleanup = hasFlag('--no-cleanup');
const skipSeed = hasFlag('--skip-seed');

const ENDPOINT_TESTS = [
    { name: 'endpoint_gateway_health', script: 'k6/endpoints/01-gateway-health.js', vus: 20, duration: '12s' },
    { name: 'endpoint_auth_login', script: 'k6/endpoints/02-auth-login.js', vus: 15, duration: '12s' },
    { name: 'endpoint_auth_me', script: 'k6/endpoints/03-auth-me.js', vus: 20, duration: '12s' },
    { name: 'endpoint_auth_refresh', script: 'k6/endpoints/04-auth-refresh.js', vus: 10, duration: '12s' },
    { name: 'endpoint_auth_otp', script: 'k6/endpoints/05-auth-otp-flow.js', vus: 10, duration: '12s' },
    { name: 'endpoint_problem_list', script: 'k6/endpoints/06-problem-list.js', vus: 25, duration: '12s' },
    { name: 'endpoint_problem_get', script: 'k6/endpoints/07-problem-get.js', vus: 25, duration: '12s' },
    { name: 'endpoint_problem_create', script: 'k6/endpoints/08-problem-create-admin.js', vus: 5, duration: '12s' },
    { name: 'endpoint_submission_create', script: 'k6/endpoints/09-submission-create.js', vus: 20, duration: '12s' },
    { name: 'endpoint_submission_get', script: 'k6/endpoints/10-submission-get.js', vus: 20, duration: '12s' },
    { name: 'endpoint_mail_otp', script: 'k6/endpoints/11-mail-otp.js', vus: 15, duration: '12s' },
    { name: 'endpoint_ai_suggestions', script: 'k6/endpoints/12-ai-suggestions.js', vus: 15, duration: '12s' },
];

const SERVICE_TESTS = [
    { name: 'service_gateway_isolated', script: 'k6/services/gateway-isolated.js', vus: 30, duration: '15s' },
    { name: 'service_problem_isolated', script: 'k6/services/problem-isolated.js', vus: 40, duration: '15s' },
    { name: 'service_submission_isolated', script: 'k6/services/submission-isolated.js', vus: 40, duration: '15s' },
    { name: 'service_mail_isolated', script: 'k6/services/mail-isolated.js', vus: 20, duration: '15s' },
];

const LIFECYCLE_TESTS = [
    { name: 'workflow_browse_problems', script: 'k6/lifecycle/e2e-browse-problems.js', vus: 20, duration: '15s' },
    { name: 'workflow_submission_execution', script: 'k6/lifecycle/e2e-submission-lifecycle.js', vus: 5, duration: '20s' },
];

const PROFILE_TESTS = {
    smoke: [{ name: 'profile_smoke', script: 'k6/profiles/workload-driver.js', profile: 'smoke', duration: '10s' }],
    baseline: [{ name: 'profile_baseline', script: 'k6/profiles/workload-driver.js', profile: 'baseline', duration: '25s' }],
    stepped: [
        { name: 'profile_load_10_vus', script: 'k6/profiles/workload-driver.js', profile: 'load_10', vus: 10, duration: '15s' },
        { name: 'profile_load_25_vus', script: 'k6/profiles/workload-driver.js', profile: 'load_25', vus: 25, duration: '15s' },
        { name: 'profile_load_50_vus', script: 'k6/profiles/workload-driver.js', profile: 'load_50', vus: 50, duration: '15s' },
        { name: 'profile_load_100_vus', script: 'k6/profiles/workload-driver.js', profile: 'load_100', vus: 100, duration: '15s' },
        { name: 'profile_load_200_vus', script: 'k6/profiles/workload-driver.js', profile: 'load_200', vus: 200, duration: '15s' },
    ],
    stress: [{ name: 'profile_stress', script: 'k6/profiles/workload-driver.js', profile: 'stress', duration: '30s' }],
    spike: [{ name: 'profile_spike', script: 'k6/profiles/workload-driver.js', profile: 'spike', duration: '25s' }],
    soak: [{ name: 'profile_soak', script: 'k6/profiles/workload-driver.js', profile: 'soak', duration: '45s' }],
    recovery: [{ name: 'profile_recovery', script: 'k6/profiles/workload-driver.js', profile: 'recovery', duration: '30s' }],
};

async function main() {
    console.log(`\n================================================================================`);
    console.log(`LCArena Complete Backend Load Testing Suite`);
    console.log(`Execution Mode: ${type.toUpperCase()}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`================================================================================\n`);

    // 1. Pre-test fixture seeding
    if (!skipSeed) {
        await seedLoadFixtures();
    }

    // 2. Select tests to run
    let testsToRun = [];

    if (customTarget) {
        testsToRun = [{ name: customTarget, script: customTarget, vus: customVus || 10, duration: customDuration || '15s' }];
    } else if (type === 'smoke') {
        testsToRun = PROFILE_TESTS.smoke;
    } else if (type === 'baseline') {
        testsToRun = PROFILE_TESTS.baseline;
    } else if (type === 'stepped' || type === 'load') {
        testsToRun = PROFILE_TESTS.stepped;
    } else if (type === 'stress') {
        testsToRun = PROFILE_TESTS.stress;
    } else if (type === 'spike') {
        testsToRun = PROFILE_TESTS.spike;
    } else if (type === 'soak') {
        testsToRun = PROFILE_TESTS.soak;
    } else if (type === 'recovery') {
        testsToRun = PROFILE_TESTS.recovery;
    } else if (type === 'endpoints') {
        testsToRun = ENDPOINT_TESTS;
    } else if (type === 'services') {
        testsToRun = SERVICE_TESTS;
    } else if (type === 'lifecycle') {
        testsToRun = LIFECYCLE_TESTS;
    } else if (type === 'all') {
        // Complete comprehensive benchmark suite
        testsToRun = [
            ...PROFILE_TESTS.smoke,
            ...PROFILE_TESTS.baseline,
            ...ENDPOINT_TESTS,
            ...SERVICE_TESTS,
            ...LIFECYCLE_TESTS,
            ...PROFILE_TESTS.stepped,
            ...PROFILE_TESTS.stress,
            ...PROFILE_TESTS.spike,
            ...PROFILE_TESTS.soak,
            ...PROFILE_TESTS.recovery,
        ];
    } else {
        console.error(`Unknown suite type: ${type}`);
        process.exit(1);
    }

    const runStartTime = Date.now();
    const allResults = [];

    for (const testDef of testsToRun) {
        const envVars = {};
        if (customVus || testDef.vus) envVars.VUS = customVus || testDef.vus;
        if (customDuration || testDef.duration) envVars.DURATION = customDuration || testDef.duration;
        if (testDef.profile) envVars.PROFILE = testDef.profile;

        try {
            const res = await executeK6Test({
                scriptPath: testDef.script,
                testName: testDef.name,
                envVars,
                enableMonitoring: true,
            });
            allResults.push(res);
        } catch (err) {
            console.error(`[suite] Error running test ${testDef.name}:`, err);
            allResults.push({
                testName: testDef.name,
                success: false,
                error: err.message,
            });
        }
    }

    const totalDurationSeconds = Math.round((Date.now() - runStartTime) / 1000);

    // Save manifest of all results
    const manifestFile = path.join(RESULTS_DIR, `suite_manifest_${runStartTime}.json`);
    const manifest = {
        suiteType: type,
        timestamp: new Date().toISOString(),
        totalDurationSeconds,
        testsCount: allResults.length,
        results: allResults,
    };
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\n[suite] Test run manifest saved to: ${manifestFile}`);

    // Generate markdown and CSV reports
    const reportPath = await generatePerformanceReport(manifest);

    // Post-test cleanup
    if (!skipCleanup) {
        await cleanupLoadFixtures();
    }

    console.log(`\n================================================================================`);
    console.log(`Suite Execution Complete in ${totalDurationSeconds}s`);
    console.log(`Detailed Report: ${reportPath}`);
    console.log(`================================================================================\n`);
}

main().catch((err) => {
    console.error('[suite] Fatal execution error:', err);
    process.exit(1);
});
