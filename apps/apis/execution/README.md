# Execution Service (`@LCArena/evaluator`)

Asynchronous evaluation worker for LCArena. It closes the submission lifecycle:

1. Consumes `submission.created` from RabbitMQ.
2. Loads the persisted `Submission` and its `Problem` from MongoDB (the
   persisted records are the source of truth, not the message payload).
3. Stages the problem's test cases into an isolated per-submission workspace.
4. Runs the submitted code through the sandboxed executor for its language
   (`@LCArena/execution`, ephemeral Docker containers).
5. Atomically persists the verdict while the submission is still `PENDING`.
6. Publishes `submission.completed` for the real-time notification service.

The worker also exposes a `GET /health` endpoint on `PORT` (default `3004`).

## Reliability

- **Bounded retries.** A message that fails for infrastructure reasons
  (workspace staging, Docker, MongoDB) is re-published with an incremented
  `x-attempts` header. After `EXECUTION_MAX_ATTEMPTS` attempts the submission is
  recorded as `INTERNAL_ERROR` and the message is parked on
  `submission.created.dead`. Malformed messages are parked immediately.
- **Duplicate deliveries / races.** A verdict is only written with a conditional
  update guarded on `status.status === "PENDING"`, so concurrent consumers can
  never overwrite a terminal result. An already-finalized submission is never
  re-executed; its stored verdict is re-published so a completion event is not
  lost if a previous attempt persisted but crashed before notifying.

## Test-case sources

`problem.testCasesUrl` may be an `http(s)` URL to a `.zip` / `.tar` / `.tar.gz`
archive, or a local path to an archive or a directory. Archives are extracted
with size, entry-count and path-traversal guards; every case folder must contain
a `*.in` and a `*.ans` file. An archive with no usable cases is rejected rather
than reported as a zero-test `SUCCESS`.

## Environment

| Variable | Required | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `MONGODB_URL` | yes | — | Submissions / problems database. |
| `RABBITMQ_URL` | no | `amqp://localhost` | Broker connection. |
| `PORT` | no | `3004` | Health endpoint only. |
| `EXECUTION_MAX_ATTEMPTS` | no | `3` | Attempts before dead-lettering. |
| `EXECUTION_MAX_TESTCASES_BYTES` | no | `67108864` | Download / expansion cap. |
| `EXECUTION_MAX_TESTCASES_ENTRIES` | no | `10000` | Archive entry cap. |

## Scripts

```sh
npm run dev      # tsx watch
npm run build    # tsc -> dist
npm start        # node dist/index.js
npm test         # unit tests (no infrastructure required)
```

## End-to-end test

[`test/e2e/full-flow.e2e.ts`](test/e2e/full-flow.e2e.ts) drives a real submission
through RabbitMQ, the worker, a Docker sandbox and MongoDB, then asserts the
`submission.completed` event. It is opt-in. With MongoDB, RabbitMQ, Docker and
the `node:20-slim` image available, start the services:

```sh
cd apps/apis/submission && npx tsx src/index.ts   # :3002
cd apps/apis/execution  && npx tsx src/index.ts   # :3004
```

Then run (Git Bash / Unix syntax):

```sh
E2E=1 npm run test:e2e
```

Environment overrides: `MONGODB_URL`, `RABBITMQ_URL`, `SUBMISSION_SERVICE_URL`.
