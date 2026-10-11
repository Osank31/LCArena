import axios from "axios"
import { MAIL_SERVICE_TOKEN, MAIL_SERVICE_URL } from "../config/env.config"
import { createMailClient } from "./mail.client"

/**
 * Shared client for the `@LCArena/mail` microservice. Only the HTTP boundary
 * lives here; the send/best-effort logic is in `mail.client.ts` so it can be
 * unit tested without environment variables.
 */
export const mailClient = createMailClient({
    baseUrl: MAIL_SERVICE_URL,
    request: (url, body, config) => axios.post(url, body, config),
    token: MAIL_SERVICE_TOKEN,
})
