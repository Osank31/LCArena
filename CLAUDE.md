# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

LCArena is a distributed, containerized online judge. It serves a problem catalogue and a Monaco-based coding workspace, accepts user submissions over HTTP, queues them, executes untrusted code in ephemeral Docker containers, and returns a verdict. The repo is a Turborepo + npm workspaces monorepo (Node ≥ 24, npm ≥ 11).

## Commands

Run from the repo root unless noted. Root scripts use Turborepo; backend selections exclude the frontend and the Python AI service via the filter `--filter=./packages/backend/* --filter=./apps/apis/* --filter=!./apps/apis/ai-suggestion-service`.

| Goal                                                                     | Command                                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Start all workspaces                                                     | `npm run dev`                                                        |
| Build everything                                                         | `npm run build`                                                      |
| Build backend only (packages + TS services)                              | `npm run build:backend`                                              |
| Type-check everything                                                    | `npm run check-types`                                                |
| Type-check backend only                                                  | `npm run check-types:backend`                                        |
| Lint (ESLint — only the frontend defines it)                             | `npm run lint`                                                       |
| Format (Prettier)                                                        | `npm run format`                                                     |
| CI-friendly fast path (typecheck → build only; no unit tests remain)     | `npm run test:all:fast`                                              |

| Coverage across backend workspaces **(no-op)** — all workspaces skipped  | `npm run test:coverage` *(no `test/unit` dirs to cover)*             |
| Full test suite **(REMOVED)** — fast/integration tests deleted           | `npm run test:all` *(nothing to run)*                                |
| Seed sample problems into MongoDB (idempotent)                           | `npm run seed:problems`                                              |

### Backend unit tests — single file

Backend unit tests use Node's built-in `node:test` runner via `tsx`, live in `test/unit/*.test.ts`, and need no MongoDB/Redis/RabbitMQ/Docker. Run from the workspace directory:

```sh
node --import tsx --test test/unit/<file>.test.ts
# or via npm
npm run test:unit -- --test test/unit/<file>.test.ts
```

The `middlewares` package uses an extra flag: `node --experimental-test-module-mocks --import tsx --test "test/unit/*.test.ts"`.

### Integration / load tests

- `npm run test:integration` boots isolated infra (Mongo 27018, Redis 6380, RabbitMQ 5673, MinIO 9002) via `docker-compose.test.yml`, runs real services on ports 3100–3104, then tears the stack down. Use `--suites=api` for HTTP-only contracts.
- `npm run test:load -- --profile=smoke --target=problem` runs k6 load tests against a running backend (`--infra` boots isolated infra itself). Profiles: smoke/baseline/stepped/stress/spike/soak/recovery/endpoints/services/lifecycle.
- `npm run seed:problems` inserts sample problems into MongoDB (idempotent).

### Docker stack

```sh
cp .env.example .env   # fill in secrets (JWT keys, SMTP, Anthropic)
npm run docker:up      # docker compose up --build -d --wait (waits for healthchecks)
npm run docker:health  # per-service health table (exit 1 if unhealthy)
npm run docker:logs    # follow all logs
npm run docker:down    # stop, keep volumes
npm run docker:down:volumes  # stop and destroy Mongo/RabbitMQ data
```

Public entry point: `http://localhost:3000`. Frontend dev: `cd apps/frontend && npm run dev` (port 5173; proxies `/auth`, `/api`, `/health` to gateway :3000 and `/suggestions` to AI service :8000).

## Architecture — big picture

### Services and ports

| Service          | Workspace                         | Port | Role                                                                     |
| ---------------- | --------------------------------- | ---- | ------------------------------------------------------------------------ |
| API Gateway      | `apps/apis/gateway`               | 3000 | Public entry: auth, sessions, RBAC, reverse proxy, header sanitization   |
| Problem          | `apps/apis/problem`               | 3001 | Problem CRUD + markdown problem descriptions + test-case uploads         |
| Submission       | `apps/apis/submission`            | 3002 | Submission intake; publishes `submission.created` to RabbitMQ            |
| Mail             | `apps/apis/mail`                  | 3003 | SMTP/OTP email delivery; `POST /otp` answers 202, delivers in background |
| Execution worker | `apps/apis/execution`             | 3004 | `/health` only; consumes `submission.created`, runs Docker sandboxes     |
| AI suggestion    | `apps/apis/ai-suggestion-service` | 8000 | Python/FastAPI + Anthropic Claude; fill-in-the-middle code completion    |
| Frontend         | `apps/frontend`                   | 5173 | React SPA, Vite, Monaco Editor                                           |

Infrastructure: MongoDB 7, Redis 7, RabbitMQ 3.13, MinIO (S3-compatible), host Docker socket (execution sandboxes). All infra bound to `127.0.0.1` in Compose.

### Submission data flow

```
Frontend (ProblemDetailPage)
  └─ handleSubmit → POST /api/submissions  (gateway proxies to submission:3002)
        └─ Gateway: authenticate → strips client x-user-id/authorization,
             injects verified x-user-id → fail-closed proxy
              └─ Submission service: userValidation → creates Submission {status: PENDING}
                   → publishes submission.created to RabbitMQ → 201 Created
                        └─ Frontend polls GET /api/submissions/:id (1.5s × 20)
                             └─ Worker consumes submission.created:
                                   loadProblem → download test cases from S3/MinIO
                                   → createExecutor(language) runs code in Docker
                                     (gcc/temurin/python:3.11/node:20, network=none, timeout)
                                   → persistVerdict (atomic, only while PENDING)
                                   → publish submission.completed to RabbitMQ
                                    → verdict rendered in OutputConsole
```

Verdicts: `SUCCESS` (Accepted), `COMPILE_ERROR`, `WA`, `RE`, `TLE`, `INTERNAL_ERROR`. Output comparison normalizes CRLF/CR→LF, trims trailing whitespace per line, drops trailing blank lines, preserves token-level differences (`compareOutputs`).

### Shared packages (`packages/backend/`)

- `@LCArena/config` — `dbConnect`, `redisConnect`/`getRedisClient`, RabbitMQ `channel`/`queue`/`connectToQueue`, S3 client (`getS3Client`, `putObject`, `getObject`, key-format helpers `getTestCaseInputKey`/`getTestCaseOutputKey`).
- `@LCArena/models` — Mongoose schemas `User` (`UserType`: Regular/Admin/Premium), `Problem`, `Submission`; `ELanguage` enum (`py`/`cpp`/`java`/`js`).
- `@LCArena/middlewares` — `userValidation` (services read `x-user-id`), `roleValidation`, `appErrorHandler`, Express `AuthenticatedUser` augmentation.
- `@LCArena/utils` — `AppError` taxonomy (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `InternalServerError`), `sendSuccess`/`sendError`, `logger` (Winston), `getEnvVariable` (crashes at boot if a required var is missing).
- `@LCArena/execution` — abstract `Executor`, `CPPExecutor`/`JavaExecutor`/`PythonExecutor`/`JSExecutor` (Dockerode, `timeout`, tar-stream test-case injection), `createExecutor(language)` router, `compareOutputs`/`normalizeOutput`.

### Gateway routing & security invariants

- `createServiceProxy` (proxy.factory.ts, http-proxy-middleware) maps `/api/problems` → problem:3001 and `/api/submissions` → submission:3002. Mail (3003) is called directly, not via the proxy registry.
- Per-request: strips client `x-user-id` and `authorization`, injects verified `x-user-id` from the JWT. Downstream services never see the raw bearer token and must not trust client headers.
- `notFoundHandler` is mounted after all routes — unmatched routes/methods fail closed with 404, never forwarded downstream.
- `authenticate` verifies the JWT, checks the Redis JTI blacklist, re-reads the user from Mongo per request (no stale role trust). Admin-only mutations on problems; submission read/update gated by `requireSubmissionOwner` (owner or Admin).
- Login returns identical `"Invalid email or password"` for wrong password and nonexistent email. Password hashes never leave the server (`toPublicUser()`). Logout/password change/delete revoke the Redis session and blacklist the access token `jti`.
- Untrusted code never runs on the host — ephemeral Docker containers under `timeout`, removed in `finally` blocks. The worker mounts the host Docker socket (development-only, effectively host root — not a production boundary).

### Frontend integration points

- Vite proxies `/auth`, `/api`, `/health` → :3000 (gateway) and `/suggestions` → :8000 (AI service).
- `apiClient` (Axios, `withCredentials`) attaches `Authorization: Bearer <token>` from localStorage, auto-refreshes on 401 via `/auth/refresh`, dispatches `lcarena:server-connection-error` on network failure.
- Submission flow is poll-based (no WebSocket). Code is persisted per problem+language in localStorage; offline falls back to bundled sample problems.

### Known gaps (documented, do not assume implemented)

- The `sockets` service on port 3007 (WebSocket real-time push) is referenced in AGENTS.md and README but **is not implemented** — there is no `apps/apis/sockets` workspace and no consumer of `submission.completed`. The frontend polls for verdicts instead.
- `apps/apis/payment` and `apps/apis/sse` directories exist but are empty/unwired.
- The `language-execution` E2E suite target (`test/integration/languages.e2e.ts`) does not exist — C++/Java/Python sandbox execution lacks E2E coverage.
- ESLint currently crashes before linting any backend file (TypeScript 6 incompatibility); only the frontend has a working ESLint config.
- Frontend branch coverage (~75%) is below the 80% Vitest gate.

## Verification

After making changes:

1. `npm run check-types:backend` — typecheck all backend workspaces
2. `npm run build:backend` — build all backend workspaces
3. `npm run test:backend` — run all backend unit tests (no infra)
4. `npm --prefix apps/frontend test` — run frontend Vitest suite
5. For full confidence: `npm run test:all:fast` (CI-friendly path)

When running services outside Docker, point URLs at `localhost` with the published ports (`MONGODB_URL`, `REDIS_HOST`, `REDIS_PORT`, `RABBITMQ_URL`, `PROBLEM_SERVICE_URL`, `SUBMISSION_SERVICE_URL`). Inside Compose, always use service names (`mongo`, `redis`, `rabbitmq`, `problem`, `submission`), never `localhost`.
