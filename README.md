# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `@next/eslint-plugin-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
npm exec turbo build
npm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=docs
```

Without global `turbo`:

```sh
npx turbo build --filter=docs
npm exec turbo build --filter=docs
npm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo dev
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
npm exec turbo dev
npm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
npm exec turbo dev --filter=web
npm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
npm exec turbo login
npm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
npm exec turbo link
npm exec turbo link
```

## Backend

Run the whole backend (all APIs + MongoDB, Redis, RabbitMQ) with Docker Compose:

```sh
cp .env.example .env   # then fill in the secrets (JWT keys, AWS, OpenAI, mail)
npm run docker:up      # docker compose up --build -d --wait
npm run docker:health  # per-service health table
```

Services and ports:

| Service       | Port | Endpoint                |
| ------------- | ---- | ----------------------- |
| gateway       | 3000 | http://localhost:3000   |
| problem       | 3001 | http://localhost:3001   |
| submission    | 3002 | http://localhost:3002   |
| mail          | 3003 | http://localhost:3003   |
| execution     | 3004 | `/health` only          |
| ai-suggestion | 8000 | http://localhost:8000   |
| mongo         | 27017|                         |
| redis         | 6379 |                         |
| rabbitmq      | 5672 | mgmt UI on 15672        |

The TypeScript services are built from the single root `Dockerfile` (parameterized with a `SERVICE` build arg, pruned with `turbo prune`); the Python FastAPI service has its own Dockerfile at `apps/apis/ai-suggestion-service/Dockerfile`. Required environment variables are documented in `.env.example` — services crash at boot if any are missing.

Build, test and operate commands:

```sh
npm run build:backend     # build all TypeScript backend workspaces
npm run check-types:backend
npm run test:backend      # backend unit tests (no infrastructure needed)
npm run test:coverage     # unit tests + aggregated coverage reports
npm run test:integration  # isolated infra + real services (needs Docker)
npm run test:load         # load tests: smoke / normal / stress profiles
npm run seed:problems     # seed sample problems into MongoDB
npm run docker:logs       # follow all service logs
npm run docker:down       # stop containers (keeps data volumes)
```

See **[docs/BACKEND.md](docs/BACKEND.md)** for the full guide: prerequisites, environment setup, health checks, every test command, load-test profiles, data-preserving vs. destructive cleanup, and troubleshooting.

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
