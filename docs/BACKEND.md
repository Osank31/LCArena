# LCArena Backend Guide

Everything needed to run, test and operate the LCArena backend locally. The
frontend is out of scope for every command in this document.

> **Development-only:** the Compose stack binds databases and the message broker
> to loopback and gives the evaluation worker access to the host Docker socket.
> That is convenient for local development and is **not** a production security
> boundary. See [Security notes](#security-notes).

## 1. What the backend is

| Component | Path | Port | Role |
| :--- | :--- | :--- | :--- |
| Gateway | `apps/apis/gateway` | 3000 | Public HTTP entry point: auth, sessions, RBAC, reverse proxy. |
| Problem | `apps/apis/problem` | 3001 | Problem CRUD. |
| Submission | `apps/apis/submission` | 3002 | Submission intake; publishes `submission.created`. |
| Mail | `apps/apis/mail` | 3003 | SMTP delivery of OTP emails. |
| Execution worker | `apps/apis/execution` | 3004 (`/health` only) | Consumes `submission.created`, runs code in ephemeral containers, publishes `submission.completed`. |
| Sockets | — | — | **Not implemented in this repository.** The AGENTS.md/README references are aspirational; there is no `apps/apis/sockets` workspace. |
| AI suggestion | `apps/apis/ai-suggestion-service` | 8000 | Python/FastAPI code completion. Own Dockerfile; excluded from the TypeScript test commands. |

Shared packages live in `packages/backend/*` (`config`, `models`, `middlewares`,
`utils`, `execution`).

Infrastructure: **MongoDB 7**, **Redis 7**, **RabbitMQ 3.13** (management UI), and
the **host Docker daemon** (used by the execution worker to launch sandboxes).

RabbitMQ queues:

- `submission.created` — published by Submission, consumed by the Execution worker.
- `submission.completed` — published by the Execution worker.
- `submission.created.dead` — dead-letter queue for messages that exhaust `EXECUTION_MAX_ATTEMPTS`.

## 2. Prerequisites

- **Node.js ≥ 24** and **npm ≥ 11** (see the root `package.json` `engines`).
- **Docker Engine / Docker Desktop** with Compose v2 for the containerised stack.
- For the execution pipeline: Docker able to run **Linux containers**. The
  worker pulls `gcc:latest`, `eclipse-temurin`, `python:3.11-slim` and
  `node:20-slim` on first use, so give the first run time and network access.

## 3. Environment setup

```sh
cp .env.example .env
```

Fill in the secrets you intend to use (JWT keys, AWS, OpenAI, SMTP, mail-service
token). Compose provides development defaults for the rest, but services call
`getEnvVariable()` at boot and crash on missing **required** values. Every
variable is documented in [`.env.example`](../.env.example).

## 4. Start the backend with Docker Compose

```sh
npm run docker:up        # docker compose up --build -d --wait
npm run docker:ps        # list containers
npm run docker:health    # per-service health table (exit 1 if anything is unhealthy)
npm run docker:logs      # follow all logs (Ctrl+C stops following, not the stack)
```

`docker:up` waits for healthchecks, so "it returned" means the services are up,
not merely started. The public entry point is <http://localhost:3000>.

### Health checks

```sh
npm run docker:health
curl http://localhost:3000/health   # gateway
```

RabbitMQ management UI: <http://localhost:15672> (`guest` / `guest`). It is bound
to loopback only.

### Stop

```sh
npm run docker:down            # stop and remove containers; KEEPS volumes (data survives)
npm run docker:down:volumes    # stop and REMOVE volumes — destroys Mongo/RabbitMQ data
```

`docker:down` preserves the `mongo_data` and `rabbitmq_data` named volumes.
`docker:down:volumes` deletes them, which wipes all users, problems and
submissions. Only use the latter when you explicitly want to reset local state.

### Running services without Docker

Useful when iterating on one service:

```sh
npx turbo run dev --filter=@LCArena/gateway        # or the workspace of your choice
```

You must then supply `MONGODB_URL`, `REDIS_HOST`, `REDIS_PORT`, `RABBITMQ_URL`
and the service URLs yourself (point them at `localhost` with the published
ports).

## 5. Root scripts

| Command | What it does |
| :--- | :--- |
| `npm run check-types:backend` | `tsc --noEmit` across all backend workspaces. No infrastructure needed. |
| `npm run build:backend` | Build every backend workspace. No infrastructure needed. |
| `npm run test:backend` | Unit tests for every backend workspace (Turborepo, backend-filtered). No infrastructure needed. |
| `npm run test:coverage` | Unit tests with coverage + aggregated reports. No infrastructure needed. |
| `npm run test:integration` | Starts isolated infra, boots real services, runs the integration/e2e suites. **Needs Docker.** |
| `npm run test:load` | Load tests. Needs a running backend, or `--infra` (needs Docker). |
| `npm run test:all:fast` | typecheck → build → unit tests. The CI-friendly path. |
| `npm run test:all` | `test:all:fast` then `test:integration`. |
| `npm run seed:problems` | Insert sample problems into MongoDB (idempotent). |
| `npm run docker:health` | Compose health table. |

All backend selections use Turborepo filters
(`--filter=./packages/backend/* --filter=./apps/apis/* --filter=!./apps/apis/ai-suggestion-service`),
so the frontend and the Python service are never built or tested by these commands.

## 6. Unit tests

```sh
npm run test:backend
npm run test:backend -- --filter=@LCArena/utils   # one workspace
```

Unit tests are pure Node (`node:test` via `tsx`): no MongoDB, Redis, RabbitMQ or
Docker. Suites live in each workspace's `test/unit/`.

## 7. Integration tests

```sh
npm run test:integration                       # api + submission pipeline
npm run test:integration -- --suites=api       # HTTP suites only (no sandbox execution)
npm run test:integration -- --keep             # leave the isolated stack running
npm run test:integration -- --verbose          # stream service logs
```

The runner starts **isolated** infrastructure from
[`docker-compose.test.yml`](../docker-compose.test.yml) as its own Compose
project (`lcarena-test`) on alternate ports (Mongo `27018`, Redis `6380`,
RabbitMQ `5673`) with a throwaway `lcarena_test` database. It never touches the
development stack or its data. Suites:

- `api` — Gateway, Problem and Submission HTTP contracts against a real database.
- `submission-pipeline` — full submission → queue → sandboxed Docker execution → verdict → `submission.completed` flow.

Service logs are written to `test-artifacts/integration/*.log` (git-ignored).

To tear the isolated stack down manually after `--keep`:

```sh
docker compose -p lcarena-test -f docker-compose.test.yml down -v
```

## 8. Coverage

```sh
npm run test:coverage                              # all backend workspaces
npm run test:coverage -- --workspace=@LCArena/mail # one workspace
npm run test:coverage -- --keep-going              # don't stop at the first failure
```

Uses Node's built-in V8 coverage — no extra dependency. Reports:

- `<workspace>/coverage/lcov.info` per workspace.
- `coverage/lcov.info` and `coverage/summary.json` aggregated at the repo root.
- A per-workspace table plus a list of modules below 60% line coverage.

No thresholds are enforced. Coverage is reported honestly; untested modules are
listed rather than excluded to make the number look better.

## 9. Load tests

Profiles (`--concurrency` / `--requests` override the numbers):

| Profile | Concurrency | Requests | Use |
| :--- | ---: | ---: | :--- |
| `smoke` | 10 | 100 | Fast sanity check. |
| `normal` | 50 | 1,000 | Expected production-ish load. |
| `stress` | 200 | 5,000 | Find the breaking point. |

Against an already-running backend:

```sh
npm run seed:problems                                   # note a printed problem id
TEST_PROBLEM_ID=<id> npm run test:load -- --profile=smoke  --target=problem
TEST_USER_ID=<id> TEST_PROBLEM_ID=<id> npm run test:load -- \
  --profile=normal --target=submission
```

Self-contained (boots isolated infra + the target service(s) and seeds fixtures):

```sh
npm run test:load -- --infra --profile=smoke --target=all
```

Options: `--url`, `--user-id`, `--problem-id`, `--max-error-rate`, `--timeout`,
`--keep`, `--json-out`. Each run prints throughput, latency percentiles
(p50/p90/p95/p99) and a status-code breakdown, and writes a JSON artifact to
`test-artifacts/load/`. The process exits non-zero when the failure ratio
exceeds `--max-error-rate` (default 1%).

> The submission target measures **ingestion** (HTTP + Mongo + RabbitMQ publish).
> The execution worker is deliberately not in the load path, so sandbox startup
> does not distort the latency sample.

### Seeding

```sh
npm run seed:problems
npm run seed:problems -- --url=mongodb://127.0.0.1:27018/lcarena_test --count=50
npm run seed:problems -- --dry-run
```

Idempotent: only documents tagged with a `https://seed.lcarena.local/...`
test-case URL are replaced.

## 10. Logs

```sh
npm run docker:logs                    # all services
docker compose logs -f gateway         # one service
docker compose logs -f execution       # sandbox/execution worker
```

## 11. Cleaning up

| Command | Data |
| :--- | :--- |
| `npm run docker:down` | **Keeps** Mongo/RabbitMQ volumes. |
| `npm run docker:down:volumes` | **Destroys** all local database and queue data. |
| `npm run test:integration` | Creates then removes the isolated `lcarena-test` stack and its data. |

> ⚠️ `npm run docker:down:volumes` is irreversible. Use it only to reset local
> development state on purpose, never on a shared machine.

## 12. Troubleshooting

**A service exits immediately at boot.** Almost always a missing required env
var. Check the container logs (`docker compose logs <service>`) — `getEnvVariable()`
names the missing variable.

**Services cannot reach each other.** Inside Compose, always use service names
(`mongo`, `redis`, `rabbitmq`, `problem`, `submission`, `mail`), never
`localhost`. If you run a service on the host instead, point its URLs at
`localhost` with the published host ports.

**`docker:up` reports an unhealthy service.** `npm run docker:health` shows which
one; then `docker compose logs -f <service>`. RabbitMQ and Mongo need ~20–30s on
a cold start — the healthchecks already account for that.

**Integration/e2e tests fail with a Docker error.** The runner exits early when
the daemon is unreachable. Start Docker Desktop and make sure Linux containers
are enabled.

**Execution worker fails to run code.** It needs the host Docker socket mounted
(`/var/run/docker.sock`). On Linux, if you want to drop root, uncomment
`group_add` in `docker-compose.yml` and set `DOCKER_GID` to the host's docker
group id (`getent group docker | cut -d: -f3`). The first execution pulls the
language image, so initial runs are slow.

**RabbitMQ redelivery / `submission.created.dead` fills up.** After
`EXECUTION_MAX_ATTEMPTS` failed deliveries the message is parked on
`submission.created.dead`. Inspect it in the management UI, fix the cause, then
requeue or discard.

**Unit tests cannot resolve `@LCArena/*`.** Build the shared packages first
(`npm run build:backend`); the test commands depend on them.

## Security notes

- Databases, Redis, RabbitMQ and the execution worker's `/health` are bound to
  `127.0.0.1` only — keep it that way.
- The execution worker mounts the host Docker socket, which is effectively root
  on the host. This is required to launch per-submission sandboxes in a
  containerised development stack and is **development-only**. Do not run this
  Compose file on an untrusted host, and do not present it as a security
  boundary.
- Untrusted code never runs on the host; it runs in ephemeral containers under
  `timeout`, with resource limits, and the container is removed afterwards.
- `/otp` on the mail service is protected by `MAIL_SERVICE_TOKEN`. Set it
  whenever the service is reachable beyond the gateway, or the relay is an open
  email sender.
