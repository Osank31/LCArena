import { logger } from "@LCArena/utils"

export interface OtpMailPayload {
    email: string
    otp: string
}

/**
 * Minimal shape of the HTTP call used to reach the mail service. Defaults to
 * `axios.post`, but tests inject a fake to avoid a live network dependency.
 */
export interface MailRequestConfig {
    timeout?: number
    headers?: Record<string, string>
}

export type MailRequest = (
    url: string,
    body: unknown,
    config?: MailRequestConfig
) => Promise<unknown>

export interface MailClientOptions {
    baseUrl: string
    request: MailRequest
    timeoutMs?: number
    /** Shared secret the mail service expects, when configured. */
    token?: string
}

export interface MailClient {
    /** Sends the OTP and rejects if the mail service cannot be reached. */
    sendOtpEmail(payload: OtpMailPayload): Promise<void>
    /**
     * Best-effort variant used by the auth flow: a delivery failure is logged
     * but never thrown, so `/auth/send-otp` cannot be used to probe provider
     * health or account existence.
     */
    notifyOtp(payload: OtpMailPayload): Promise<void>
    /**
     * Hands the OTP to the mail service without waiting for it. Used by
     * `/auth/send-otp`: the code is already persisted in Redis, so the response
     * must not be stretched by the mail service (or a slow SMTP relay). The
     * returned promise never rejects, so it is safe to call un-awaited.
     */
    dispatchOtp(payload: OtpMailPayload): void
}

const DEFAULT_TIMEOUT_MS = 10_000

export const createMailClient = (options: MailClientOptions): MailClient => {
    const { baseUrl, request, timeoutMs = DEFAULT_TIMEOUT_MS, token } = options

    const sendOtpEmail = async (payload: OtpMailPayload): Promise<void> => {
        await request(`${baseUrl}/otp`, payload, {
            timeout: timeoutMs,
            ...(token ? { headers: { "x-mail-service-token": token } } : {}),
        })
    }

    const notifyOtp = async (payload: OtpMailPayload): Promise<void> => {
        try {
            await sendOtpEmail(payload)
        } catch (error) {
            logger.error("Failed to deliver OTP email", {
                email: payload.email,
                error:
                    error instanceof Error ? error.message : "unknown error",
            })
        }
    }

    const dispatchOtp = (payload: OtpMailPayload): void => {
        // Deliberately not awaited: `notifyOtp` already swallows failures, so
        // this cannot surface as an unhandled rejection.
        void notifyOtp(payload)
    }

    return { sendOtpEmail, notifyOtp, dispatchOtp }
}
