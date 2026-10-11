import { getEnvVariable } from "@LCArena/utils"

/**
 * Validates and parses the port string into an integer.
 * Ensures the gateway does not bind to an invalid or random port.
 */
const parsePort = (value: string): number => {
    const port = Number(value)

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(
            `Invalid PORT "${value}": expected an integer between 1 and 65535. ` +
                "Remember that dotenv does not override an existing environment variable."
        )
    }

    return port
}

// Required environment variables
export const APP_PORT = parsePort(getEnvVariable("PORT"))
export const MONGODB_URL = getEnvVariable("MONGODB_URL")
export const ACCESS_TOKEN_JWT_KEY = getEnvVariable("ACCESS_TOKEN_JWT_KEY")
export const REFRESH_TOKEN_JWT_KEY = getEnvVariable("REFRESH_TOKEN_JWT_KEY")

// Upstream service URLs
export const PROBLEM_SERVICE_URL = getEnvVariable("PROBLEM_SERVICE_URL")
export const SUBMISSION_SERVICE_URL = getEnvVariable("SUBMISSION_SERVICE_URL")

// Optional environment variables with defaults
export const ACCESS_TOKEN_TTL_SECONDS = Number(
    getEnvVariable("ACCESS_TOKEN_TTL_SECONDS", false) || 15 * 60
)
export const REFRESH_TOKEN_TTL_SECONDS = Number(
    getEnvVariable("REFRESH_TOKEN_TTL_SECONDS", false) || 7 * 24 * 60 * 60
)
export const PROXY_TIMEOUT_MS = Number(
    getEnvVariable("PROXY_TIMEOUT_MS", false) || 15_000
)

export const CORS_ORIGIN = getEnvVariable("CORS_ORIGIN", false) || "*"

export const ALLOWED_ORIGINS: true | string[] =
    CORS_ORIGIN === "*"
        ? true
        : CORS_ORIGIN.split(",")
              .map((origin) => origin.trim())
              .filter(Boolean)

export const REFRESH_COOKIE_NAME = "refreshToken"
