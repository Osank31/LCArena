# LCArena

A distributed, containerized online judge. It serves a problem catalogue and a
Monaco-based coding workspace, accepts user submissions over HTTP, queues them,
executes untrusted code in ephemeral Docker containers, and returns a verdict the
browser displays.

> **Deployed demo note:** the currently hosted frontend runs in demo mode with
> local sample problems, and its "Run" button does not execute code. Grading works
> when the stack runs locally with Docker. See
> [the frontend README](apps/frontend/README.md#%EF%B8%8F-read-this-first-the-deployed-frontend-runs-in-demo-mode).

## Architecture

```mermaid
flowchart TD
    Browser["React SPA :5173"] -->|"HTTP"| GW["API Gateway :3000\nauth · RBAC · reverse proxy"]
    Browser -.->|"POST /suggestions"| AI["AI suggestion :8000\nFastAPI + Claude"]
    GW --> Problem["Problem service :3001"]
    GW --> Submission["Submission service :3002"]
    GW -->|"OTP relay"| Mail["Mail service :3003"]
    Problem --> Mongo[("MongoDB :27017")]
    Problem --> S3[("MinIO / R2 / S3\n:9000")]
    Submission --> Mongo
    Submission -->|"submission.created"| MQ{{"RabbitMQ :5672"}}
    MQ --> Worker["Execution worker :3004"]
    Worker --> S3
    Worker --> Mongo
    Worker -->|"Docker API"| Docker["Ephemeral containers\ngcc · temurin · python · node"]
    Worker -->|"submission.completed"| MQ
    MQ -.->|"⚠️ no consumer exists"| Void["(not implemented)"]
    Browser -->|"GET /api/submissions/:id (poll)"| GW

    style Void fill:#ffe0e0,stroke:#c00,stroke-dasharray: 5 5
```

The submission lifecycle is traced in [AGENTS.md](AGENTS.md) (architecture and
security invariants) and [CLAUDE.md](CLAUDE.md) (commands and verification). The
language-execution E2E suite is a documented gap — see the Testing section below.

## Technology stack

| Layer        | Technology                                                                                              |
| :----------- | :------------------------------------------------------------------------------------------------------ |
| Monorepo     | Turborepo 2 + npm workspaces (Node ≥ 24, npm ≥ 11)                                                      |
| API services | TypeScript, Express 5, Zod 4, Mongoose 9                                                                |
| Gateway auth | `jsonwebtoken` (access + refresh), Redis sessions/JTI blacklist/OTPs, `http-proxy-middleware`           |
| Queue        | RabbitMQ 3.13 (`amqplib`)                                                                               |
| Storage      | S3-compatible via `@aws-sdk/client-s3` (MinIO locally, Cloudflare R2 in production)                     |
| Sandbox      | `dockerode` + ephemeral containers: `gcc:latest`, `eclipse-temurin`, `python:3.11-slim`, `node:20-slim` |
| Frontend     | React 19, Vite 8, TypeScript, Tailwind CSS v4, Monaco, Vitest                                           |
| AI           | Python 3.12, FastAPI, LangChain, Anthropic Claude Sonnet                                                |
| Data         | MongoDB 7, Redis 7                                                                                      |

## Repository structure

```
LCArena/
├── apps/
│   ├── apis/
│   │   ├── gateway/               # public entry point: auth, RBAC, proxy
│   │   ├── problem/               # problem CRUD + test-case uploads
│   │   ├── submission/            # submission intake -> RabbitMQ
│   │   ├── execution/             # evaluation worker (@LCArena/evaluator)
│   │   ├── mail/                  # SMTP relay for OTP emails
│   │   └── ai-suggestion-service/ # FastAPI code completion
│   └── frontend/                  # React SPA
├── packages/backend/
│   ├── config/                    # db/redis/rabbitmq/S3 connections + key layout
│   ├── models/                    # Mongoose schemas: User, Problem, Submission
│   ├── middlewares/               # userValidation, roleValidation, appErrorHandler
│   ├── utils/                     # AppError taxonomy, response envelope, logger, env
│   └── execution/                 # Executor base + language executors, verdict types
```

## Documentation

### Services

| Component             | Port | README                                                                       |
| :-------------------- | :--- | :--------------------------------------------------------------------------- |
| API Gateway           | 3000 | [apps/apis/gateway](apps/apis/gateway/README.md)                             |
| Problem service       | 3001 | [apps/apis/problem](apps/apis/problem/README.md)                             |
| Submission service    | 3002 | [apps/apis/submission](apps/apis/submission/README.md)                       |
| Mail service          | 3003 | [apps/apis/mail](apps/apis/mail/README.md)                                   |
| Execution worker      | 3004 | [apps/apis/execution](apps/apis/execution/README.md)                         |
| AI suggestion service | 8000 | [apps/apis/ai-suggestion-service](apps/apis/ai-suggestion-service/README.md) |
| Frontend              | 5173 | [apps/frontend](apps/frontend/README.md)                                     |

### Shared packages

| Package                | README                                                                 |
| :--------------------- | :--------------------------------------------------------------------- |
| `@LCArena/config`      | [packages/backend/config](packages/backend/config/README.md)           |
| `@LCArena/models`      | [packages/backend/models](packages/backend/models/README.md)           |
| `@LCArena/middlewares` | [packages/backend/middlewares](packages/backend/middlewares/README.md) |
| `@LCArena/utils`       | [packages/backend/utils](packages/backend/utils/README.md)             |
| `@LCArena/execution`   | [packages/backend/execution](packages/backend/execution/README.md)     |

### Guides

- [AGENTS.md](AGENTS.md) — system design and the security invariants agents must uphold. **Note:** it describes a Sockets service on port 3007 that is not implemented in this repository.
- [CLAUDE.md](CLAUDE.md) — project commands, verification steps, and architecture notes (type-check, build, unit tests, integration tests, Docker stack).
- [TESTING_DOCUMENTATION.md](TESTING_DOCUMENTATION.md) — full test command reference, load-test profiles, coverage gates, and cleanup instructions.
- [Performance.md](Performance.md) — load-test results and performance tuning notes.

## Getting started

### Prerequisites

- **Node.js ≥ 24** and **npm ≥ 11** (enforced by the root `package.json` `engines`).
- **Docker Engine / Docker Desktop** with Compose v2. The execution worker needs
  Docker able to run **Linux containers** and will pull the four language images
  on first use.
- Python ≥ 3.12 only if you run the AI suggestion service outside Docker.

### Run the backend with Docker Compose

```sh
git clone https://github.com/Osank31/LCArena.git
cd LCArena
cp .env.example .env      # then fill in secrets (JWT keys, SMTP, Anthropic)
npm run docker:up         # docker compose up --build -d --wait
npm run docker:health     # per-service health table (exit 1 if unhealthy)
```

The public entry point is <http://localhost:3000>. The full port matrix, Compose
variables and security notes are in [CLAUDE.md](CLAUDE.md).

Services crash at boot if a required environment variable is missing, and
`getEnvVariable()` names the missing variable in the log.

### Run the frontend

```sh
cd apps/frontend
npm run dev               # http://localhost:5173
```

The Vite dev server proxies `/auth`, `/api` and `/health` to the gateway on
`:3000` and `/suggestions` to the AI service on `:8000`.

### Run a single service on the host

```sh
npx turbo run dev --filter=@LCArena/gateway
```

Point its URLs at `localhost` with the published ports (`MONGODB_URL`,
`REDIS_HOST`, `REDIS_PORT`, `RABBITMQ_URL`, `PROBLEM_SERVICE_URL`, …).

## Running tests

No unit, integration, or load test suites remain in the repository — the
`test/unit`, `test/integration`, and `tests/load` directories and their
`test:*` npm scripts were removed from every workspace.

To restore testing, add unit test files under `test/unit/` (per workspace)
and re-add `test:unit` scripts, or re-create `tests/load/` and the
load-test runner. Until then, `npm run test:*` commands are unavailable.

## Other root scripts

```sh
npm run docker:up              # start the stack (waits for healthchecks)
npm run docker:down            # stop containers, KEEP data volumes
npm run docker:down:volumes    # stop and DELETE all local database/queue data
npm run docker:logs            # follow all logs
npm run seed:problems          # idempotently insert sample problems
npm run format                 # Prettier over **/*.{ts,tsx,md}
npm run lint                   # ESLint across the monorepo
```

## Security invariants

These are enforced in code and must not be weakened:

- The gateway is the only component that reads a JWT, and the only one allowed to
  set `x-user-id` on an upstream request. It strips client-supplied `x-user-id`
  and `authorization` before proxying.
- Unregistered gateway routes and methods are rejected with 404 rather than
  forwarded.
- The user's bcrypt `password` hash is never returned (`toPublicUser()` builds the
  response field by field), and login failures for a wrong password and a
  nonexistent email return the identical `"Invalid email or password"`.
- Logout, password change and account deletion revoke the Redis session and
  blacklist the access token's `jti`.
- Untrusted code never runs on the host. It runs in ephemeral containers under
  GNU `timeout`, and the container is removed afterwards.
- Databases, Redis, RabbitMQ and internal service ports are bound to
  `127.0.0.1` in the development Compose file. The execution worker mounts the
  host Docker socket, which is **development-only** and must never be treated as a
  production security boundary.
