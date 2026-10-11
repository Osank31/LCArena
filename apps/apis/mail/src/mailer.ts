import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "@LCArena/utils";

export interface SmtpConfig {
    host: string;
    port: number;
    /** true = implicit TLS (usually 465); false = STARTTLS/plain (587/25). */
    secure: boolean;
    user?: string;
    password?: string;
    connectionTimeoutMs?: number;
}

export interface MailMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export interface Mailer {
    send(message: MailMessage): Promise<void>;
}

/**
 * Builds a nodemailer transport. The connection is lazy: nothing talks to the
 * relay until the first `send`, so a missing/unreachable relay does not stop
 * the service from starting.
 */
export const createSmtpTransport = (config: SmtpConfig): Transporter =>
    nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        // Omit auth entirely when no credentials are configured (local relays
        // and tests accept anonymous mail); sending auth to a relay that does
        // not expect it would fail.
        auth: config.user
            ? { user: config.user, pass: config.password }
            : undefined,
        connectionTimeout: config.connectionTimeoutMs ?? 10_000,
        greetingTimeout: config.connectionTimeoutMs ?? 10_000,
        socketTimeout: 20_000,
    });

export const createMailer = (transport: Transporter, from: string): Mailer => ({
    send: async (message: MailMessage): Promise<void> => {
        const info = await transport.sendMail({
            from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
        });

        // Never log the message body: it contains the OTP.
        logger.info("Email dispatched", {
            to: message.to,
            subject: message.subject,
            messageId: info.messageId,
        });
    },
});
