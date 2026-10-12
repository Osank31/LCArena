# LCArena Backend Load Testing Suite

A high-performance, container-integrated load testing framework built with **Grafana k6** and Node.js for the LCArena competitive programming platform.

---

## 1. Directory Structure

\`\`\`
tests/load/
├── .env.example              # Example environment configurations
├── package.json              # Standalone package metadata & scripts
├── README.md                 # Complete operational runbook
├── config/
│   ├── env.js                # URL resolution (host vs Docker container)
│   ├── profiles.js           # Smoke, baseline, stepped, stress, spike, soak, recovery definitions
│   └── thresholds.js         # Configurable SLA performance thresholds
├── fixtures/
│   ├── test-programs.js      # Multi-language test solutions (Accepted, WA, CE, TLE)
│   ├── seed-fixtures.js      # Seeder for test users, problems, and auth tokens
│   ├── cleanup-fixtures.js   # Teardown of transient test records
│   └── test-context.json     # Generated auth tokens & problem metadata
├── k6/
│   ├── lib/
│   │   ├── http-client.js    # k6 HTTP helper with auth management
│   │   └── summary-reporter.js # Machine-readable summary & report serializer
│   ├── endpoints/            # Per-endpoint load test scripts (12 endpoints)
│   ├── services/             # Direct isolated microservice test scripts
│   ├── lifecycle/            # End-to-end request lifecycle & async workflow tests
│   └── profiles/             # Multi-stage workload profile drivers
├── monitoring/
│   └── resource-monitor.js   # Real-time Docker container CPU & Memory sampler
├── runners/
│   ├── run-test.js           # Core k6 runner (runs k6 in Docker, captures metrics)
│   └── suite-runner.js       # Master CLI orchestrator
├── reports/
│   └── report-generator.js   # Markdown and CSV report generator
└── results/                  # Raw execution JSON metrics and manifests
\`\`\`

---

## 2. Quick Start

### 2.1 Prerequisites
- Docker & Docker Compose running the backend services:
  \`\`\`bash
  docker compose up -d
  \`\`\`
- Node.js (v20+ or v24+)

### 2.2 Running Tests via npm

\`\`\`bash
# Run quick smoke test (verifies all services and auth)
npm run test:load:smoke

# Run baseline test (10 VUs steady load)
npm run test:load:baseline

# Run stepped load test (10 -> 25 -> 50 -> 100 -> 200 VUs)
npm run test:load:stepped

# Run stress test (pushing towards saturation limit)
npm run test:load:stress

# Run spike test (sudden burst traffic)
npm run test:load:spike

# Run soak test (sustained load over time)
npm run test:load:soak

# Run recovery test (overload burst followed by cooldown)
npm run test:load:recovery

# Run all 12 endpoints individually
npm run test:load:endpoints

# Run isolated microservice tests
npm run test:load:services

# Run end-to-end submission & Docker evaluation workflows
npm run test:load:lifecycle

# Run complete comprehensive benchmark suite
npm run test:load
\`\`\`

---

## 3. Running with Custom Options

The suite runner accepts flexible CLI parameters:

\`\`\`bash
# Test a specific endpoint with 50 VUs for 30 seconds
node tests/load/runners/suite-runner.js --target=k6/endpoints/02-auth-login.js --vus=50 --duration=30s

# Run without cleaning up transient records
node tests/load/runners/suite-runner.js --type=smoke --no-cleanup
\`\`\`

---

## 4. Running via Docker Compose

To run directly inside the Docker Compose network without installing local dependencies:

\`\`\`bash
docker compose -f docker-compose.yml -f docker-compose.load.yml run --rm load-tester run k6/endpoints/01-gateway-health.js
docker compose -f docker-compose.yml -f docker-compose.load.yml run --rm load-tester run -e PROFILE=smoke k6/profiles/workload-driver.js
\`\`\`

---

## 5. Output & Reports

All test runs generate:
1. Raw JSON metric files in \`tests/load/results/\`
2. Run manifest in \`tests/load/results/suite_manifest_<timestamp>.json\`
3. Formatted Markdown Performance Report in \`test-artifacts/load/PERFORMANCE_REPORT_<timestamp>.md\`
4. Spreadsheet-ready CSV summary table in \`test-artifacts/load/results_table_<timestamp>.csv\`
