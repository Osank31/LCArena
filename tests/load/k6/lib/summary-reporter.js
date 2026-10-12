/**
 * Custom k6 Summary Handler
 * Generates structured JSON output and concise terminal output.
 */

export function generateSummary(data, options = {}) {
    const testName = options.testName || 'k6-load-test';
    const duration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {};
    const reqs = data.metrics.http_reqs ? data.metrics.http_reqs.values : {};
    const failed = data.metrics.http_req_failed ? data.metrics.http_req_failed.values : {};
    const iterations = data.metrics.iterations ? data.metrics.iterations.values : {};
    const vus = data.metrics.vus ? data.metrics.vus.values : {};

    const totalReqs = reqs.count || 0;
    const rps = reqs.rate ? Math.round(reqs.rate * 100) / 100 : 0;
    const errorRate = failed.rate ? Math.round(failed.rate * 10000) / 100 : 0; // in %
    const totalFailed = failed.passes || 0; // in http_req_failed passes is failures
    const totalSuccess = totalReqs - totalFailed;

    const summaryObj = {
        testName,
        timestamp: new Date().toISOString(),
        metrics: {
            totalRequests: totalReqs,
            successRequests: totalSuccess,
            failedRequests: totalFailed,
            rps,
            errorRatePercent: errorRate,
            p50_ms: duration['p(50)'] ? Math.round(duration['p(50)'] * 100) / 100 : (duration.med ? Math.round(duration.med * 100) / 100 : 0),
            p90_ms: duration['p(90)'] ? Math.round(duration['p(90)'] * 100) / 100 : 0,
            p95_ms: duration['p(95)'] ? Math.round(duration['p(95)'] * 100) / 100 : 0,
            p99_ms: duration['p(99)'] ? Math.round(duration['p(99)'] * 100) / 100 : 0,
            min_ms: duration.min ? Math.round(duration.min * 100) / 100 : 0,
            max_ms: duration.max ? Math.round(duration.max * 100) / 100 : 0,
            avg_ms: duration.avg ? Math.round(duration.avg * 100) / 100 : 0,
            vusMax: vus.max || 0,
            iterations: iterations.count || 0,
        },
        rawMetrics: data.metrics,
    };

    const jsonOutput = JSON.stringify(summaryObj, null, 2);
    const consoleText = `
--------------------------------------------------------------------------------
[k6 Summary] ${testName}
Requests: ${totalReqs} | RPS: ${rps} | Errors: ${totalFailed} (${errorRate}%)
Latency:  p50=${summaryObj.metrics.p50_ms}ms | p90=${summaryObj.metrics.p90_ms}ms | p95=${summaryObj.metrics.p95_ms}ms | p99=${summaryObj.metrics.p99_ms}ms
--------------------------------------------------------------------------------
`;

    return {
        stdout: consoleText,
        'summary.json': jsonOutput,
    };
}
