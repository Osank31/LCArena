# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

LCArena is a distributed, containerized online judge. The full architecture, security invariants, data model, and port matrix live in [README.md](README.md). This file records commands, verification steps, and known gaps.

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

| Seed sample problems into MongoDB (idempotent)                           | `npm run seed:problems`                                              |

### Integration / load tests

No test infrastructure remains in the repository — the `test/unit`, `test/integration`, and `tests/load` directories were removed. The `test:*` scripts were deleted from all workspace `package.json` files.

To restore testing, add unit test files under `test/unit/` (per workspace) and re-add the corresponding `test:unit` scripts, or re-create `tests/load/` and the load-test runner.


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

### Verification

After making changes:

1. `npm run check-types:backend` — typecheck all backend workspaces
2. `npm run build:backend` — build all backend workspaces

No unit/integration test suites remain in the repository (the `test/*` directories and scripts were removed). `npm run test:all:fast` and the frontend Vitest suite were removed along with them.

When running services outside Docker, point URLs at `localhost` with the published ports (`MONGODB_URL`, `REDIS_HOST`, `REDIS_PORT`, `RABBITMQ_URL`, `PROBLEM_SERVICE_URL`, `SUBMISSION_SERVICE_URL`). Inside Compose, always use service names (`mongo`, `redis`, `rabbitmq`, `problem`, `submission`), never `localhost`.

## Known gaps

- `sockets` service on port 3007 (WebSocket real-time push) is referenced in docs but **is not implemented** — no `apps/apis/sockets` workspace and no consumer of `submission.completed`. The frontend polls for verdicts instead.
- `apps/apis/payment` and `apps/apis/sse` directories exist but are empty/unwired.
- The language-execution E2E suite target (`test/integration/languages.e2e.ts`) does not exist — C++/Java/Python sandbox execution lacks E2E coverage.
- ESLint currently crashes before linting any backend file (TypeScript 6 incompatibility); only the frontend has a working ESLint config.
- Frontend branch coverage (~75%) is below the 80% Vitest gate.

## Documentation Synchronization (MANDATORY)

This rule applies to every agent and subagent working in the LCArena repository.

Documentation updates are a required part of completing any coding task, not a separate optional step. Whenever you make changes to the codebase, you must automatically identify and update all relevant documentation files before considering the task complete.

CLAUDE.md must not exceed 200 lines total.

### When to update

Update docs when your change touches: API routes/bodies/status codes; environment variables; RabbitMQ queue names or payloads; database fields/Mongoose schemas/indexes; Zod validation rules; security logic (auth/RBAC/header sanitization); service config (ports, dependencies, env vars); architecture (new/removed service, new infra); commands/scripts/verification steps; known gaps.

### Documentation files

Root: README.md (overview, architecture, tech stack, security invariants), CLAUDE.md (commands, verification, gaps), TESTING_DOCUMENTATION.md (testing, CI, coverage), Performance.md (benchmarks, archived to docs/archive/).
Services: apps/frontend/README.md, apps/apis/{gateway,problem,submission,execution,mail,ai-suggestion-service}/README.md.
Packages: packages/backend/{config,models,middlewares,utils,execution}/README.md.
Config: docker-compose*.yml, .env.example, turbo.json, root package.json, Dockerfile, .github/workflows/backend-ci.yml.

### How to update

1. Identify affected files before finishing implementation.
2. Update minimally — target only affected sections; preserve existing docs; link instead of duplicating.
3. Verify against source code/config (ports, env vars, queue names, routes, rules). Do not claim updated if unverified.
4. If no doc update is needed, state why in your completion report.

### Restrictions

- Never modify generated files (package-lock.json, .turbo/, dist/, coverage/), third-party (node_modules/), secrets (.env), or .codegraph/.
- Do not update unrelated docs or skip updates because they weren't requested.
- Changes to this section require explicit user consent; agents must not auto-grant standing permissions to edit CLAUDE.md.

### Completion report

Include: docs updated, what changed, verification performed, any docs not updated and why.
