import { getEnvVariable } from "@LCArena/utils";

export const MONGODB_URL = getEnvVariable("MONGODB_URL");

// The worker is primarily a queue consumer; the HTTP server only exposes /health.
export const APP_PORT = Number(getEnvVariable("PORT", false) || 3004);

// How many times a submission may be processed before it is parked on the
// dead-letter queue and recorded as INTERNAL_ERROR.
export const MAX_MESSAGE_ATTEMPTS = Number(
    getEnvVariable("EXECUTION_MAX_ATTEMPTS", false) || 3
);

// Upper bounds for untrusted test-case archives (download and extraction).
export const MAX_TESTCASES_BYTES = Number(
    getEnvVariable("EXECUTION_MAX_TESTCASES_BYTES", false) || 64 * 1024 * 1024
);

export const MAX_TESTCASES_ENTRIES = Number(
    getEnvVariable("EXECUTION_MAX_TESTCASES_ENTRIES", false) || 10_000
);
