import { getEnvVariable } from "@LCArena/utils";

export const APP_PORT = Number(getEnvVariable("PORT", false) || 3003);

// SMTP relay settings. Deliberately not required so the service can boot (and
// report healthy) even before credentials are supplied; connection failures are
// surfaced per-send instead of crashing the process.
export const MAIL_HOST = getEnvVariable("MAIL_HOST", false) || "localhost";

export const MAIL_PORT = Number(getEnvVariable("MAIL_PORT", false) || 587);

// true for implicit TLS (typically port 465); false for STARTTLS (587) or
// plain SMTP (25 / 1025).
export const MAIL_SECURE =
    (getEnvVariable("MAIL_SECURE", false) || "false").toLowerCase() === "true";

export const MAIL_USER = getEnvVariable("MAIL_USER", false) || undefined;

export const MAIL_PASSWORD =
    getEnvVariable("MAIL_PASSWORD", false) || undefined;

export const MAIL_FROM =
    getEnvVariable("MAIL_FROM", false) || "LCArena <no-reply@lcarena.local>";

// Optional shared secret required from callers (the gateway). Without it the
// /otp endpoint is unauthenticated, which on a reachable network would let
// anyone send mail through the configured relay.
export const MAIL_SERVICE_TOKEN =
    getEnvVariable("MAIL_SERVICE_TOKEN", false) || undefined;

// Bound how long a single delivery attempt can hang waiting on the relay. This
// is no longer an HTTP request budget: sending happens in the background.
export const SMTP_CONNECTION_TIMEOUT_MS = Number(
    getEnvVariable("MAIL_CONNECTION_TIMEOUT_MS", false) || 10_000
);

// Background delivery queue. `POST /otp` only enqueues (202), so these bound how
// much work a slow relay can accumulate in memory before backpressure kicks in.
export const MAIL_QUEUE_CONCURRENCY = Math.max(
    1,
    Number(getEnvVariable("MAIL_QUEUE_CONCURRENCY", false) || 2)
);

export const MAIL_QUEUE_MAX_SIZE = Math.max(
    1,
    Number(getEnvVariable("MAIL_QUEUE_MAX_SIZE", false) || 500)
);

export const MAIL_MAX_ATTEMPTS = Math.max(
    1,
    Number(getEnvVariable("MAIL_MAX_ATTEMPTS", false) || 3)
);

export const MAIL_RETRY_DELAY_MS = Math.max(
    0,
    Number(getEnvVariable("MAIL_RETRY_DELAY_MS", false) || 500)
);

// How long SIGTERM waits for queued mail before the process exits anyway.
export const MAIL_DRAIN_TIMEOUT_MS = Math.max(
    0,
    Number(getEnvVariable("MAIL_DRAIN_TIMEOUT_MS", false) || 10_000)
);
