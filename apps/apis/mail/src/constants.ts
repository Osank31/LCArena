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

// Bound how long an HTTP request to this service can hang waiting on the relay.
export const SMTP_CONNECTION_TIMEOUT_MS = Number(
    getEnvVariable("MAIL_CONNECTION_TIMEOUT_MS", false) || 10_000
);
