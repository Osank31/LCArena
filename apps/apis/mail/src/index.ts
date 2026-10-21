import "dotenv/config";
import { logger } from "@LCArena/utils";
import { createApp } from "./app";
import {
    APP_PORT,
    MAIL_DRAIN_TIMEOUT_MS,
    MAIL_FROM,
    MAIL_HOST,
    MAIL_MAX_ATTEMPTS,
    MAIL_PASSWORD,
    MAIL_PORT,
    MAIL_QUEUE_CONCURRENCY,
    MAIL_QUEUE_MAX_SIZE,
    MAIL_RETRY_DELAY_MS,
    MAIL_SECURE,
    MAIL_SERVICE_TOKEN,
    MAIL_USER,
    SMTP_CONNECTION_TIMEOUT_MS,
} from "./constants";
import { createDispatcher } from "./dispatcher";
import { createMailer, createSmtpTransport } from "./mailer";

const transport = createSmtpTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: MAIL_SECURE,
    user: MAIL_USER,
    password: MAIL_PASSWORD,
    connectionTimeoutMs: SMTP_CONNECTION_TIMEOUT_MS,
});

const mailer = createMailer(transport, MAIL_FROM);

// Delivery runs behind the HTTP response, so a slow relay can no longer make
// `/otp` (and therefore `/auth/send-otp`) wait.
const dispatcher = createDispatcher(mailer, {
    concurrency: MAIL_QUEUE_CONCURRENCY,
    maxQueueSize: MAIL_QUEUE_MAX_SIZE,
    maxAttempts: MAIL_MAX_ATTEMPTS,
    retryDelayMs: MAIL_RETRY_DELAY_MS,
});

const app = createApp(mailer, { token: MAIL_SERVICE_TOKEN, dispatcher });

if (!MAIL_SERVICE_TOKEN) {
    logger.warn(
        "MAIL_SERVICE_TOKEN is not set: the /otp endpoint is unauthenticated. Set it (and the matching gateway value) before exposing this service."
    );
}

const server = app.listen(APP_PORT, () => {
    logger.info(`Mail service listening on port ${APP_PORT}`);
});

let shuttingDown = false;

/**
 * Stops accepting connections, then gives queued messages a bounded window to
 * reach the relay. Without this, a redeploy would silently drop every OTP that
 * had already been acknowledged with a 202.
 */
const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal}, draining mail queue`, {
        queued: dispatcher.queued,
        inFlight: dispatcher.inFlight,
    });

    // Let requests that are already on the wire reach the handler before the
    // queue stops accepting work, otherwise they would be answered with 503.
    const closed = new Promise<void>((resolve) => {
        server.close(() => resolve());
    });

    await Promise.race([
        closed,
        new Promise<void>((resolve) => {
            setTimeout(resolve, MAIL_DRAIN_TIMEOUT_MS);
        }),
    ]);

    const drained = await dispatcher.drain(MAIL_DRAIN_TIMEOUT_MS);

    if (!drained) {
        logger.warn("Mail queue did not drain before the shutdown timeout", {
            queued: dispatcher.queued,
            inFlight: dispatcher.inFlight,
        });
    }

    process.exit(drained ? 0 : 1);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
