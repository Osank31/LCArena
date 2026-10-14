import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { ResourceMonitor } from '../monitoring/resource-monitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOAD_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(LOAD_ROOT, '../..');
const RESULTS_DIR = path.join(LOAD_ROOT, 'results');

if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Executes a single k6 test script, gathering both k6 metrics and system container metrics.
 */
export async function executeK6Test({
    scriptPath,
    testName = 'test',
    envVars = {},
    enableMonitoring = true,
}) {
    // Absolute paths inside Docker container
    const scriptRelToLoad = path.relative(LOAD_ROOT, path.resolve(LOAD_ROOT, scriptPath)).replace(/\\/g, '/');
    const containerScript = `/workspace/tests/load/${scriptRelToLoad}`;
    const timestamp = Date.now();
    const resultFile = path.join(RESULTS_DIR, `${testName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}.json`);
    const containerResultFile = `/workspace/tests/load/results/${path.basename(resultFile)}`;

    console.log(`\n================================================================================`);
    console.log(`[k6 Runner] Starting: ${testName}`);
    console.log(`[k6 Runner] Container script: ${containerScript}`);
    console.log(`================================================================================`);

    const monitor = new ResourceMonitor(1000);
    if (enableMonitoring) {
        monitor.start();
    }

    const dockerArgs = [
        'run',
        '--rm',
        '--network', 'lcarena_default',
        '-v', `${REPO_ROOT}:/workspace`,
        '-w', '/workspace/tests/load',
        '-e', 'K6_IN_DOCKER=1',
        '-e', 'IN_DOCKER_NETWORK=1',
        '-e', 'GATEWAY_URL=http://gateway:3000',
        '-e', 'PROBLEM_SERVICE_URL=http://problem:3001',
        '-e', 'SUBMISSION_SERVICE_URL=http://submission:3002',
        '-e', 'MAIL_SERVICE_URL=http://mail:3003',
        '-e', 'EXECUTION_SERVICE_URL=http://execution:3004',
        '-e', 'AI_SERVICE_URL=http://ai-suggestion:8000',
    ];

    for (const [key, val] of Object.entries(envVars)) {
        dockerArgs.push('-e', `${key}=${val}`);
    }

    dockerArgs.push(
        'grafana/k6',
        'run',
        // Emit the percentiles the SLA thresholds are written against. Without this
        // k6 exports only avg/min/med/max, so p(50) and p(99) came back missing and
        // were reported as 0 ms.
        '--summary-trend-stats',
        'avg,min,med,max,p(50),p(90),p(95),p(99)',
        '--summary-export',
        containerResultFile,
        containerScript
    );

    const startTime = Date.now();
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const exitCode = await new Promise((resolve) => {
        const proc = spawn('docker', dockerArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

        proc.stdout.on('data', (data) => {
            const str = data.toString();
            stdoutBuffer += str;
            process.stdout.write(str);
        });

        proc.stderr.on('data', (data) => {
            const str = data.toString();
            stderrBuffer += str;
            process.stderr.write(str);
        });

        proc.on('close', (code) => {
            resolve(code);
        });

        proc.on('error', (err) => {
            console.error(`[k6 Runner] Spawn error:`, err);
            resolve(1);
        });
    });

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    let resourceMetrics = null;
    if (enableMonitoring) {
        resourceMetrics = monitor.stop();
    }

    // Read the exported summary JSON
    let k6Metrics = null;
    if (fs.existsSync(resultFile)) {
        try {
            const content = fs.readFileSync(resultFile, 'utf-8');
            k6Metrics = JSON.parse(content);
        } catch (err) {
            console.warn(`[k6 Runner] Could not parse summary file: ${err.message}`);
        }
    }

    const testResult = {
        testName,
        scriptPath: scriptRelToLoad,
        timestamp: new Date().toISOString(),
        durationSeconds,
        exitCode,
        success: exitCode === 0,
        envVars,
        k6Metrics: k6Metrics ? extractKeyMetrics(k6Metrics) : null,
        rawK6Metrics: k6Metrics,
        resources: resourceMetrics,
    };

    // Save consolidated test result
    fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2), 'utf-8');
    return testResult;
}

function extractKeyMetrics(data) {
    const metrics = data.metrics || {};
    const duration = metrics.http_req_duration || {};
    const reqs = metrics.http_reqs || {};
    const failed = metrics.http_req_failed || {};
    const vus = metrics.vus || {};

    const totalRequests = reqs.count || 0;
    const rps = reqs.rate ? Math.round(reqs.rate * 100) / 100 : 0;
    const failedRequests = failed.passes || 0;
    const errorRate = totalRequests > 0 ? Math.round((failedRequests / totalRequests) * 10000) / 100 : 0;

    // A percentile the run never exported is reported as null, never as 0 ms -
    // a fabricated zero is indistinguishable from an instant response.
    const roundOrNull = (value) =>
        typeof value === 'number' && Number.isFinite(value)
            ? Math.round(value * 100) / 100
            : null;

    return {
        totalRequests,
        successRequests: totalRequests - failedRequests,
        failedRequests,
        rps,
        errorRatePercent: errorRate,
        p50_ms: roundOrNull(duration['p(50)'] ?? duration.med),
        p90_ms: roundOrNull(duration['p(90)']),
        p95_ms: roundOrNull(duration['p(95)']),
        p99_ms: roundOrNull(duration['p(99)']),
        min_ms: roundOrNull(duration.min),
        max_ms: roundOrNull(duration.max),
        avg_ms: roundOrNull(duration.avg),
        vusMax: vus.max || (vus.value || 0),
    };
}
