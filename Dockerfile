# syntax=docker/dockerfile:1
# Shared Dockerfile for the TypeScript services.
# Build with: docker build --build-arg SERVICE=@LCArena/auth -t lcarena-auth .
# (docker-compose.yml passes the right SERVICE arg for each service.)

ARG NODE_VERSION=24

# ---- pruner: produce a pruned workspace containing only $SERVICE and its deps ----
FROM node:${NODE_VERSION}-slim AS pruner
RUN npm install -g turbo@^2
WORKDIR /app
COPY . .
ARG SERVICE
RUN turbo prune ${SERVICE} --docker --out-dir=/out

# ---- builder: install deps, then build the service and its workspace deps ----
FROM node:${NODE_VERSION}-slim AS builder
# git is needed by npm to resolve workspace link dependencies in the pruned lockfile
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=pruner /out/json/ .
RUN npm ci
COPY --from=pruner /out/full/ .
ARG SERVICE
RUN npx turbo run build --filter=${SERVICE}

# ---- runner: full workspace with dev dependencies pruned out ----
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app .
RUN npm prune --omit=dev
ARG SERVICE
ENV SERVICE_NAME=${SERVICE}
CMD npm run start --workspace ${SERVICE_NAME}
