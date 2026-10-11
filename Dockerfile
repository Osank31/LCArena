# syntax=docker/dockerfile:1
# Shared multi-stage Dockerfile for the TypeScript backend services.
#
# Build one service with:
#   docker build --build-arg SERVICE=@LCArena/gateway -t lcarena-gateway .
# docker-compose.yml passes the right SERVICE for each service. The SERVICE must
# be a workspace package that defines a `build` and a `start` script.

ARG NODE_VERSION=24

# ---- pruner: produce a pruned workspace containing only $SERVICE and its deps ----
FROM node:${NODE_VERSION}-slim AS pruner
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm install -g turbo@^2
WORKDIR /app
COPY . .
ARG SERVICE
RUN test -n "$SERVICE" || (echo "ERROR: SERVICE build arg is required" && exit 1)
RUN turbo prune ${SERVICE} --docker --out-dir=/out

# ---- builder: install deps, then build the service and its workspace deps ----
FROM node:${NODE_VERSION}-slim AS builder
# git is needed by npm to resolve workspace link dependencies in the pruned lockfile
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=pruner /out/json/ ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --no-audit --no-fund
COPY --from=pruner /out/full/ ./
ARG SERVICE
RUN npx turbo run build --filter=${SERVICE}
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm prune --omit=dev --no-audit --no-fund

# ---- runner: production deps only, non-root user ----
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=builder /app ./
ARG SERVICE
ENV SERVICE_NAME=${SERVICE}
USER node
# `start` must exist on the workspace package; compose adds `init: true` so
# SIGTERM/SIGINT are forwarded to this process for a clean shutdown.
CMD ["sh", "-c", "npm run start --workspace \"$SERVICE_NAME\""]
