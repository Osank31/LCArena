import { type Request, type RequestHandler } from "express"
import { createProxyMiddleware, fixRequestBody, type Options } from "http-proxy-middleware"
import { PROXY_TIMEOUT_MS } from "../config/env.config"
import { type ServiceConfig } from "../config/services.config"

export interface ProxyFactoryOptions {
    /** Optional path rewrite rules */
    pathRewrite?: Options["pathRewrite"]
    /** Custom timeout in milliseconds */
    timeoutMs?: number
}

/**
 * Creates an Express reverse-proxy middleware for the given downstream service.
 *
 * Adheres to:
 * - Single Responsibility: Focuses purely on routing requests to downstream services.
 * - Open/Closed Principle: Works for any service configuration without code modifications.
 * - Security: Strips client-supplied spoofed headers (`x-user-id`, `authorization`) and
 *   injects the verified caller identity derived from the access token.
 */
export const createServiceProxy = (
    service: ServiceConfig,
    options?: ProxyFactoryOptions
): RequestHandler => {
    const timeout = options?.timeoutMs ?? service.timeoutMs ?? PROXY_TIMEOUT_MS

    return createProxyMiddleware({
        target: service.url,
        changeOrigin: true,
        timeout,
        proxyTimeout: timeout,
        pathRewrite: options?.pathRewrite,
        on: {
            proxyReq: (proxyReq, req, _res) => {
                // Strip client spoofing attempts
                proxyReq.removeHeader("x-user-id")
                proxyReq.removeHeader("authorization")

                const expressReq = req as Request

                // Forward verified identity to downstream service
                if (expressReq.user?.userId) {
                    proxyReq.setHeader("x-user-id", expressReq.user.userId)
                }

                // Forward original client tracking headers
                if (expressReq.ip) {
                    proxyReq.setHeader("x-forwarded-for", expressReq.ip)
                }
                proxyReq.setHeader("x-forwarded-proto", expressReq.protocol)
                if (expressReq.headers.host) {
                    proxyReq.setHeader("x-forwarded-host", expressReq.headers.host)
                }

                // If a body parser parsed req.body, fix and stream it downstream
                fixRequestBody(proxyReq, req)
            },
            error: (err, _req, res) => {
                const expressRes = res as any
                if (expressRes.headersSent) return

                const errorCode = (err as any)?.code
                const isTimeout =
                    errorCode === "ECONNRESET" ||
                    errorCode === "ETIMEDOUT" ||
                    (err as any)?.message?.toLowerCase().includes("timeout")

                const statusCode = isTimeout ? 504 : 502
                const message = isTimeout
                    ? `${service.name} service did not respond in time`
                    : `${service.name} service is unreachable`

                expressRes.status(statusCode).json({
                    success: false,
                    message,
                })
            },
        },
    })
}
