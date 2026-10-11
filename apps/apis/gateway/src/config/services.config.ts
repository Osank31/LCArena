import {
    PROBLEM_SERVICE_URL,
    PROXY_TIMEOUT_MS,
    SUBMISSION_SERVICE_URL,
} from "./env.config"

/**
 * Interface representing downstream microservice configuration.
 * Enables adding new services in an open-ended, declarative manner.
 */
export interface ServiceConfig {
    name: string
    url: string
    timeoutMs?: number
}

/**
 * Service registry mapping service identifiers to their configurations.
 * To add a new service (e.g., ai-suggestion, contest, etc.), simply add
 * its configuration entry here and create its corresponding route module.
 */
export const servicesConfig = {
    problem: {
        name: "problem",
        url: PROBLEM_SERVICE_URL,
        timeoutMs: PROXY_TIMEOUT_MS,
    },
    submission: {
        name: "submission",
        url: SUBMISSION_SERVICE_URL,
        timeoutMs: PROXY_TIMEOUT_MS,
    },
} as const satisfies Record<string, ServiceConfig>

export type KnownServiceName = keyof typeof servicesConfig
