# Execution Worker (`@LCArena/evaluator`)

The asynchronous evaluation worker. It closes the submission lifecycle: consume
`submission.created`, obtain the problem's test cases, run the untrusted code in
an ephemeral Docker sandbox, atomically persist exactly one verdict, and publish
`submission.completed`.

- **Port:** `3004` — **`/health` only**, no public API.
- **Runtime:** Node.js ≥ 24, Express 5 for the health endpoint, commonjs.
- **Depends on:** MongoDB, RabbitMQ, S3-compatible object storage, the host
  Docker daemon, and `@LCArena/execution`.

---

## Overview

The worker is a queue consumer with a minimal HTTP surface used only for health
checks. It closes the submission lifecycle in six steps:

1. Consume `submission.created`.
2. Load the persisted `Submission` and its `Problem` from MongoDB — the
   persisted records are the source of truth, **not** the message payload.
3. Stage the problem's test cases into an isolated per-submission workspace.
4. Run the code through the language's sandboxed executor.
5. Atomically persist the verdict, guarded on `status.status === "PENDING"`.
6. Publish `submission.completed`.

## Architecture

```mermaid
flowchart TD
    MQ{{"RabbitMQ"}} -->|"submission.created (prefetch 1)"| C["consumer.ts"]
    C --> V["validation.ts\nsubmissionCreatedMessageSchema"]
    V -->|"malformed"| DLQ["submission.created.dead"]
    V --> P["service.ts processSubmission()"]
    P --> L["MongoDB: Submission + Problem"]
    P --> TC["testCases.ts acquireTestCases()"]
    TC --> S3[("S3 / MinIO / R2")]
    TC --> WS["isolated tmp workspace"]
    P --> E["executors.ts createExecutor()"]
    E --> D["Docker: ephemeral container"]
    P -->|"findOneAndUpdate\nstatus.status == PENDING"| L
    P -->|"buildCompletionPayload -> persistent publish"| MQ2{{"submission.completed"}}
    C -->|"retryable failure"| MQ
    C -->|"attempts exhausted"| DLQ
```

### Design decisions worth knowing

- **The message is only a pointer.** `code`, `language` and `status` in the
  payload are validated but never trusted; everything is re-read from MongoDB.
- **Idempotency.** A submission whose status is no longer `PENDING` is never
  re-executed. Its stored verdict is re-published instead, which repairs the case
  where a previous attempt persisted the result but crashed before notifying.
- **Single writer for the verdict.** The conditional
  `findOneAndUpdate({ _id, "status.status": "PENDING" }, ...)` means concurrent
  consumers cannot overwrite a terminal result; the loser logs
  `lost-finalize-race` and returns without publishing.
- **Infrastructure failures never masquerade as verdicts.** Docker/storage/
  persistence problems are *thrown* and handled by the retry policy. Only genuine
  execution verdicts are persisted here, and exhausted retries produce an
  explicit `INTERNAL_ERROR` rather than leaving a submission stuck on `PENDING`.

## Technology stack

| Concern | Choice |
| :--- | :--- |
| Runtime | Node ≥ 24, `express` ^5 (health only) |
| Queue | `amqplib` via `@LCArena/config` (`channel`, `queue`, `connectToQueue`, `closeQueue`) |
| Persistence | Mongoose `Submission` / `Problem` from `@LCArena/models` |
| Object storage | `@LCArena/config` `listObjects`, `getObject`, `getProblemTestCasePrefix` |
| Archives | `yauzl` (zip), `tar-stream` + `zlib` (tar/tar.gz) |
| Sandbox | `dockerode` via `@LCArena/execution` executors |
| Validation | `zod` ^4 |

## Directory structure

```
apps/apis/execution/
├── src/
│   ├── index.ts        # boot: db, queue, assertQueues, /health, consumer, graceful shutdown
│   ├── consumer.ts     # createSubmissionHandler / startConsumer: retry, DLQ, ack policy
│   ├── service.ts      # processSubmission() + EvaluationDeps + completion payload builder
│   ├── evaluation.ts   # production EvaluationDeps wired to Mongo / Docker / RabbitMQ
│   ├── testCases.ts    # acquireTestCases: S3, http(s) archive, local paths, safety limits
│   ├── executors.ts    # language → executor registry
│   ├── validation.ts   # submissionCreatedMessageSchema
│   └── constants.ts    # PORT, MAX_MESSAGE_ATTEMPTS, size/entry caps
└── test/
    ├── unit/{consumer,executors,service,testCases,s3TestCases,validation}.test.ts
    └── integration/full-flow.e2e.ts   # opt-in, needs Docker + infra
```

## Internal workflow

### Boot (`index.ts`)

1. `dbConnect(MONGODB_URL)`, then `connectToQueue()`; throws if `channel` is
   still undefined.
2. `assertQueue("submission.completed", { durable: true })`.
3. `assertQueue("submission.created.dead", { durable: true })`.
   (`submission.created` itself is asserted by `@LCArena/config` — without
   `durable`, see the gaps section.)
4. `app.listen(PORT)` exposing `GET /health` → `{ message: "Execution Service Healthy" }`.
5. `startConsumer(...)` with `prefetch(1)` and `noAck: false`.
6. `SIGINT`/`SIGTERM` handlers close the HTTP server and queue channel, then
   `process.exit(0)`.

### Message handling (`consumer.ts`)

```mermaid
flowchart TD
    A["message received"] --> B{"JSON + schema valid?"}
    B -->|"no"| C["park on DLQ (reason: malformed), ack"]
    B -->|"yes"| D["processSubmission()"]
    D -->|"resolved"| E["ack + log outcome/reason/verdict"]
    D -->|"threw"| F{"attempts + 1 < MAX?"}
    F -->|"yes"| G["re-publish with x-attempts header, ack"]
    F -->|"no"| H["persist INTERNAL_ERROR verdict,\npublish completion, park DLQ, ack"]
```

- **Attempt counter:** the `x-attempts` header, read defensively (`Number`,
  finite and `> 0`, else 0).
- **Retryable re-publish** copies the message content and preserves
  `contentType`, setting `persistent: true` and incrementing `x-attempts`.
- **Parking** on `submission.created.dead` preserves the original headers and
  adds `x-park-reason` (`malformed` / `retries-exhausted`) and `x-parked-at`.
- **Ack policy:** every message the handler has dealt with is acked — after a
  successful run (verdict already durable), after a retry re-publish, and after
  parking. Failures to park are logged, not thrown.
- Unhandled rejections inside the consumer callback are caught and logged so the
  consumer loop itself never dies.

### Evaluation pipeline (`service.ts`)

`processSubmission(message, deps)`:

| Step | Behaviour |
| :--- | :--- |
| Load submission | Missing → `{ outcome: "skipped", reason: "submission-not-found" }` (no error, message is acked) |
| Already terminal | Re-publish `submission.completed` from the **stored** verdict → `skipped / already-finalized` |
| Load problem | Missing → persist `INTERNAL_ERROR("Referenced problem could not be loaded")`, publish, return `executed / problem-not-found` |
| Acquire test cases | `deps.acquireTestCases(problem)` — throws on failure (infrastructure) |
| Run executor | Inside `try { … } finally { await acquired.cleanup() }` so the workspace is always removed |
| Persist verdict | Conditional update; `null` means another consumer won → `skipped / lost-finalize-race` |
| Publish completion | `buildCompletionPayload(finalized, verdict)` |

Time limit conversion (`timeLimitSeconds`): uses `problem.time_limit` (ms) when
it is a number `> 0`, else `DEFAULT_TIME_LIMIT_MS = 5000`; then
`Math.max(1, Math.ceil(ms / 1000))` — so the sandbox runs in whole seconds with a
1s floor.

First failing case (`firstFailedTestCase`) follows the precedence
`tle → re → wa`, and is `null` for any non-`SUCCESS` status.

Production `EvaluationDeps` (`evaluation.ts`):

```ts
loadSubmission:  (id) => Submission.findById(id)
loadProblem:     (id) => Problem.findById(id)
acquireTestCases:(problem) => acquireTestCases({ testCasesUrl, testCaseStoragePrefix,
                                                 problemId, maxBytes, maxEntries })
runExecutor:     (lang, code, secs, dir) => createExecutor(lang, dir).execute(code, secs, "testcases")
persistVerdict:  (id, status) => Submission.findOneAndUpdate(
                     { _id: id, "status.status": "PENDING" },
                     { $set: { status } },
                     { returnDocument: "after" })
publishCompletion: (payload) => channel.sendToQueue("submission.completed",
                     Buffer.from(JSON.stringify(payload)), { persistent: true })
```

### Test-case acquisition (`testCases.ts`)

`acquireTestCases` creates a private workspace with `fs.mkdtemp(os.tmpdir() +
"lcarena-testcases-")` and resolves the source in this order:

1. `problem.testCaseStoragePrefix` (explicit) — highest precedence.
2. A `testCasesUrl` that looks like storage (`s3://bucket/prefix` or a bare
   `Evaluation_Test_Cases/...` prefix) → `downloadFromS3`.
3. An `http(s)` URL → download (30s `AbortController` timeout, `content-length`
   and streaming size caps) then detect the format from magic bytes and extract.
4. A local path: directory → recursive copy, file → extract; a set of legacy
   fallbacks resolves `testcases`, `that`, `this` and
   `packages/backend/execution/testcases` relative to `cwd`/`__dirname`.
5. No usable path but a `problemId` → `getProblemTestCasePrefix(problemId)`.
6. Otherwise → `TestCaseSourceError`.

Safety limits (defaults from `constants.ts`, both overridable by env):

- **Size:** 64 MiB (`EXECUTION_MAX_TESTCASES_BYTES`) cumulative download/expansion.
- **Entries:** 10,000 (`EXECUTION_MAX_TESTCASES_ENTRIES`).
- **Nesting:** at most 8 levels descended while looking for the case root.
- **Path traversal:** `resolveSafeEntryPath` is the single choke point for both
  zip and tar; it rejects empty names, NUL bytes, absolute paths (POSIX `/...`
  and Windows `C:`), and anything resolving outside the destination.
- **Tar hardening:** non-`file` entries (directories, symlinks, devices) are
  skipped rather than materialised.
- Extracted files are written with mode `0o600`.

Then `resolveTestCasesRoot` finds the directory whose immediate children contain
both a `*.in` and a `*.ans` (descending through a single wrapper directory), and
`validateTestCaseFolderCompleteness` re-checks every case folder. **An archive
with no usable cases is rejected** — a zero-test run is never reported as
`SUCCESS`. On any failure the workspace is removed before the error propagates.

### Sandbox execution (`@LCArena/execution`)

`createExecutor(language, testCasesDir)` looks the language up in
`executorRegistry` (`cpp → CPPExecutor`, `java → JavaExecutor`, `py →
PythonExecutor`, `js → JSExecutor`) and throws for an unregistered language.
Each executor:

1. `pullImage` (inspect first; pull only on 404).
2. `createContainer({ Image, Cmd: ["/bin/bash","-c","tail -f /dev/null"],
   WorkingDir: "/workspace", HostConfig: {} })`, then `start()`.
3. `copyTestCasesToContainer` — packs the workspace into a `tar-stream` archive
   and `putArchive(..., { path: "/workspace" })`, so the container sees
   `/workspace/testcases/...`. Fails closed with `TestCasesUnavailableError` when
   the directory is unreadable or contains no files.
4. Writes three base64-encoded files into the container (`echo <b64> | base64 -d`):
   the wrapper `<Main>`, the user's `Solution`, and `runner.sh`.
5. Runs `./runner.sh` and parses its stdout as JSON.
6. `finally`: `container.stop()` + `container.remove()` — cleanup is guaranteed.

| Language | Image | Compile / syntax command | Run command |
| :--- | :--- | :--- | :--- |
| C++ | `gcc:latest` | `g++ -O3 -std=c++17 "Main.cpp" -o "./solution"` | `./solution` |
| Java | `eclipse-temurin` | `javac Main.java Solution.java` | `java Main` |
| Python | `python:3.11-slim` | `python -m py_compile solution.py` | `python main.py` |
| JavaScript | `node:20-slim` | `node -c solution.js` | `node main.js` |

### The generated runner (`Executor.generateRunnerScript`)

```bash
TIME_LIMIT="<n>s"; TESTCASES_DIR="./testcases"
# 1. compile check -> on failure print COMPILE_ERROR JSON and exit 0
# 2. for each test case dir containing a *.in and a *.ans:
#      timeout "$TIME_LIMIT" <runCmd> < input > user.out
#      exit 124 -> TLE ; exit != 0 -> RE ; diff -b -B ans user.out -> pass or WA
# 3. print a single JSON object on stdout
```

- Timing uses `date +%s%N` around each case and stores per-case milliseconds in a
  bash associative array, emitted as `executionTimeMs`.
- **Output comparison inside the sandbox uses `diff -b -B`** (ignore whitespace
  change, ignore blank lines). The richer `compareOutputs()` helper exported by
  `@LCArena/execution` is **not** on this path — see the gaps section.
- The verdict JSON is parsed by `parseRunnerOutput`, which tolerates leading/
  trailing noise by slicing from the first `{` to the last `}`.

Runner output shape:

```json
{
  "status": "SUCCESS",
  "passed": 40,
  "total": 40,
  "executionTimeMs": { "test_case_001": 12, "test_case_002": 15 },
  "failedCases": { "tle": [], "re": [], "wa": [] }
}
```

Note that `SUCCESS` means "the harness ran", not "accepted": a wrong answer is
`SUCCESS` with entries in `failedCases.wa`, and the frontend derives the
human-facing verdict from those arrays.

## API documentation

This service exposes **no submission API**. Its only HTTP surface is:

| Method | Path | Response |
| :--- | :--- | :--- |
| `GET` | `/health` | `200 { "message": "Execution Service Healthy" }` |

Its real interface is the message contract.

### Inbound — `submission.created`

Validated by `submissionCreatedMessageSchema` (`src/validation.ts`):

| Field | Rule |
| :--- | :--- |
| `submissionId` | string that `mongoose.Types.ObjectId.isValid` accepts |
| `userId` | string, ObjectId-valid |
| `problemId` | string, ObjectId-valid |
| `code` | string, min 1 |
| `language` | `z.nativeEnum(ELanguage)` — `"py" \| "cpp" \| "java" \| "js"` |
| `status` | `z.unknown().optional()` — present on the wire, deliberately never trusted |

### Outbound — `submission.completed`

Built by `buildCompletionPayload(submission, status)`; published `persistent` to
`submission.completed`:

```jsonc
{
  "submissionId": "<ObjectId string>",
  "userId":       "<ObjectId string>",
  "problemId":    "<ObjectId string>",
  "status":       { /* ExecutionResult union */ },
  "results":      { /* the same object, duplicated for consumers keying off `results` */ },
  "failedTestCase": "test_case_001" | null
}
```

`status` and `results` are **the same object**, so `status.status` and
`results.status` always agree.

> ⚠️ **Nobody consumes this queue in this repository.** `submission.completed` is
> declared, written and asserted — and the E2E test subscribes to it — but no
> production process reads it. See
> [`docs/SUBMISSION_EVALUATION_FLOW.md`](../../../docs/SUBMISSION_EVALUATION_FLOW.md)
> for the full analysis.

## Inter-service communication

| Direction | Mechanism | Details |
| :--- | :--- | :--- |
| In | RabbitMQ | `submission.created`, `prefetch(1)`, `noAck: false` |
| Out | RabbitMQ | `submission.completed` (persistent); `submission.created` for retries; `submission.created.dead` for parked messages |
| In/Out | MongoDB | Reads `Submission`/`Problem`; conditional writes to `Submission.status` |
| Out | S3-compatible storage | `listObjects` + `getObject` under the problem prefix |
| Out | Docker daemon (host socket) | Creates, execs in, stops and removes ephemeral containers |
| In | Docker Hub | `pullImage` on first use of `gcc:latest`, `eclipse-temurin`, `python:3.11-slim`, `node:20-slim` |

No HTTP calls to other LCArena services, no Redis, no WebSockets.

## Environment variables and configuration

| Variable | Required | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `MONGODB_URL` | **yes** | — | Submissions / problems database |
| `RABBITMQ_URL` | no | `amqp://localhost` | Broker connection |
| `PORT` | no | `3004` | Health endpoint only |
| `EXECUTION_MAX_ATTEMPTS` | no | `3` | Attempts before dead-lettering and recording `INTERNAL_ERROR` |
| `EXECUTION_MAX_TESTCASES_BYTES` | no | `67108864` (64 MiB) | Download / expansion cap |
| `EXECUTION_MAX_TESTCASES_ENTRIES` | no | `10000` | Archive entry cap |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_FORCE_PATH_STYLE` | no | see [config README](../../../packages/backend/config/README.md) | Object storage |
| `LOG_LEVEL` | no | `info` | Winston level |

Docker-related privileges are configuration, not env vars: Compose runs this
container as `root` with `/var/run/docker.sock` mounted, and documents
`group_add: ["${DOCKER_GID:-999}"]` as the Linux privilege-dropping option.

## Dependencies and prerequisites

- **Docker Engine** able to run **Linux containers**. The worker talks to the
  host daemon through the mounted socket; without it every evaluation throws.
- **RabbitMQ**, **MongoDB**, and **S3-compatible storage** reachable at boot.
- **Network access to the Docker registry** for the four language images on
  first use (subsequent runs reuse the local cache).
- `@LCArena/*` packages built (`npm run build:backend`).
- On Windows/macOS the images must be Linux images; on Windows the daemon must
  not be in Windows-container mode.

## Local development and execution

```sh
npm run docker:up                                        # full stack, includes socket mount
npx turbo run dev --filter=@LCArena/evaluator            # worker alone
curl http://localhost:3004/health
docker compose logs -f execution                         # watch sandbox activity
```

Without Docker Compose, `Docker()` from `dockerode` uses the platform default
socket, so `MONGODB_URL`, `RABBITMQ_URL` and the `S3_*` variables must point at
`localhost` with published ports.

Debugging the pipeline: the consumer logs `Handled a submission.created message`
with `outcome`, `reason`, `verdict` and `attempt`; retries log
`Retrying a submission.created message`; exhausted retries log
`Exhausted retries …`. The `Executor` logs each command (base64-decoded) and its
stderr.

## Testing

```sh
cd apps/apis/execution
npm test                        # unit suite — no Mongo, RabbitMQ or Docker needed
npm run test:integration        # opt-in E2E (see below)
```

Unit suites: `consumer.test.ts` (retry/DLQ/ack policy), `service.test.ts`
(`processSubmission` outcomes, `timeLimitSeconds`, `firstFailedTestCase`),
`testCases.test.ts` (extraction + path traversal), `s3TestCases.test.ts`,
`executors.test.ts`, `validation.test.ts`. All collaborators are injected fakes.

### End-to-end test (`test/integration/full-flow.e2e.ts`)

Opt-in via `E2E=1`. It drives **real** submissions through RabbitMQ, the worker,
a Docker sandbox and MongoDB, and subscribes to `submission.completed` with its
own channel to assert the event. It covers:

- MinIO key hierarchy and byte-for-byte content verification,
- Accepted / Wrong Answer / Compile Error / Runtime Error / Time Limit Exceeded,
- duplicate queue delivery staying idempotent,
- two concurrent submissions not cross-contaminating,
- workspace and MinIO cleanup.

Requires `submission.created`, `submission.completed` and
`submission.created.dead` to be assertable, MongoDB, RabbitMQ, Docker and the
`node:20-slim` image. Start the services, then:

```sh
cd apps/apis/execution
E2E=1 npm run test:integration
```

Without `E2E=1` the suite still runs but every case is skipped (`{ skip: !ENABLED }`).

Environment overrides: `MONGODB_URL` (default
`mongodb://localhost:27018/lcarena_test`), `RABBITMQ_URL` (default
`amqp://guest:guest@localhost:5673`), `SUBMISSION_SERVICE_URL` (default
`http://127.0.0.1:3102`).

> The suite **purges** all three queues in `before()`, so never point it at a
> shared broker.

## Error handling and troubleshooting

| Symptom | Cause / handling |
| :--- | :--- |
| Submission stuck on `PENDING` | Worker down; or the message was lost because `submission.created` is not durable |
| Verdict `INTERNAL_ERROR` with "Evaluation failed after repeated attempts" | `EXECUTION_MAX_ATTEMPTS` exhausted; the message is on `submission.created.dead` with `x-park-reason: retries-exhausted` |
| Verdict `INTERNAL_ERROR` with "Referenced problem could not be loaded" | `problemId` no longer exists |
| Messages accumulate on `submission.created.dead` with `x-park-reason: malformed` | Publisher sent a payload that fails `submissionCreatedMessageSchema` (bad ObjectId, empty `code`, unknown `language`) |
| Every run throws immediately | Docker socket not mounted / daemon unreachable |
| First evaluation is very slow | Language image is being pulled |
| `TestCasesUnavailableError: No test cases found in …` | The workspace was empty; also raised when an archive has no usable case folder |
| `TestCaseSourceError: Test case 'x' is incomplete: missing …` | A case folder lacked `*.in` or `*.ans` |
| `Rejected archive entry escaping the destination` | A malicious archive tried path traversal — rejected by design |
| `Test-case archive expands beyond the size limit` / `contains too many entries` | Raise `EXECUTION_MAX_TESTCASES_BYTES` / `EXECUTION_MAX_TESTCASES_ENTRIES` only if you trust the source |
| `lost-finalize-race` in the logs | Two consumers processed the same submission; the first writer wins and owns the completion event |
| Container left behind | Should not happen — `stop()`/`remove()` run in `finally`. Check for containers named from the language images if the daemon itself died mid-run |

## Security notes

- Untrusted code never runs on the host; it runs in ephemeral containers created
  from stock language images and is removed afterwards.
- The generated runner constrains wall-clock time with `timeout "$TIME_LIMIT"`,
  and archives are bounded in size, entry count and traversal.
- **Known hardening gaps** (see the flow document for detail): containers are
  created with `HostConfig: {}`, i.e. **no memory/CPU/pids limits, no dropped
  capabilities, no read-only rootfs, no network isolation**, and they run as the
  image default user. There is also no wall-clock limit on the executor's Docker
  API calls themselves.
- Mounting `/var/run/docker.sock` is equivalent to root on the host. This is a
  development-only arrangement; see
  [`docs/BACKEND.md`](../../../docs/BACKEND.md) security notes.

## Related services

- [Submission service](../submission/README.md) — publishes the message this worker consumes.
- [Problem service](../problem/README.md) — stores the test cases it reads.
- [`@LCArena/execution`](../../../packages/backend/execution/README.md) — executors and the `ExecutionResult` contract.
- [`@LCArena/config`](../../../packages/backend/config/README.md) — queue names and storage helpers.
- [Submission evaluation flow](../../../docs/SUBMISSION_EVALUATION_FLOW.md) — the authoritative end-to-end trace.
