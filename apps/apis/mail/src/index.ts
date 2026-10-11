import "dotenv/config";
import { logger } from "@LCArena/utils";
import { createApp } from "./app";
import {
    APP_PORT,
    MAIL_FROM,
    MAIL_HOST,
    MAIL_PASSWORD,
    MAIL_PORT,
    MAIL_SECURE,
    MAIL_SERVICE_TOKEN,
    MAIL_USER,
    SMTP_CONNECTION_TIMEOUT_MS,
} from "./constants";
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
const app = createApp(mailer, { token: MAIL_SERVICE_TOKEN });

if (!MAIL_SERVICE_TOKEN) {
    logger.warn(
        "MAIL_SERVICE_TOKEN is not set: the /otp endpoint is unauthenticated. Set it (and the matching gateway value) before exposing this service."
    );
}

app.listen(APP_PORT, () => {
    logger.info(`Mail service listening on port ${APP_PORT}`);
});
