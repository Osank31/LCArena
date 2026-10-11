import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import { createApp } from "../../src/app";
import { type Mailer, type MailMessage } from "../../src/mailer";

const startApp = async (
    mailer: Mailer,
    options: { token?: string } = {}
): Promise<{ base: string; server: Server }> => {
    const app: Express = createApp(mailer, options);

    const server = await new Promise<Server>((resolve) => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });

    const { port } = server.address() as AddressInfo;

    return { base: `http://127.0.0.1:${port}`, server };
};

const stop = (server: Server): Promise<void> =>
    new Promise((resolve) => server.close(() => resolve()));

const post = (base: string, path: string, body: unknown) =>
    fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

describe("mail service app", () => {
    it("reports health", async () => {
        const { base, server } = await startApp({ send: async () => {} });

        try {
            const res = await fetch(`${base}/health`);
            assert.equal(res.status, 200);
        } finally {
            await stop(server);
        }
    });

    it("sends an OTP email and returns success", async () => {
        const sent: MailMessage[] = [];
        const { base, server } = await startApp({
            send: async (message) => {
                sent.push(message);
            },
        });

        try {
            const res = await post(base, "/otp", {
                email: "recipient@example.com",
                otp: "246810",
            });

            assert.equal(res.status, 200);
            const payload = await res.json();
            assert.equal(payload.success, true);
            assert.equal(payload.message, "OTP email sent successfully");

            assert.equal(sent.length, 1);
            assert.equal(sent[0].to, "recipient@example.com");
            assert.ok(sent[0].text.includes("246810"));
            assert.ok(sent[0].html.includes("246810"));
            assert.match(sent[0].subject, /verification code/i);
        } finally {
            await stop(server);
        }
    });

    it("rejects an invalid payload with 400", async () => {
        const { base, server } = await startApp({ send: async () => {} });

        try {
            const res = await post(base, "/otp", {
                email: "not-an-email",
                otp: "1",
            });

            assert.equal(res.status, 400);
            const payload = await res.json();
            assert.equal(payload.success, false);
            assert.equal(payload.message, "Validation Error");
        } finally {
            await stop(server);
        }
    });

    it("requires the shared token on /otp when configured", async () => {
        const sent: MailMessage[] = [];
        const { base, server } = await startApp(
            { send: async (message) => void sent.push(message) },
            { token: "s3cret" }
        );

        try {
            const missing = await post(base, "/otp", {
                email: "recipient@example.com",
                otp: "111111",
            });
            assert.equal(missing.status, 401);

            const wrong = await fetch(`${base}/otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-mail-service-token": "nope",
                },
                body: JSON.stringify({
                    email: "recipient@example.com",
                    otp: "111111",
                }),
            });
            assert.equal(wrong.status, 401);
            assert.equal(sent.length, 0);

            const accepted = await fetch(`${base}/otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-mail-service-token": "s3cret",
                },
                body: JSON.stringify({
                    email: "recipient@example.com",
                    otp: "111111",
                }),
            });
            assert.equal(accepted.status, 200);
            assert.equal(sent.length, 1);

            // Health must stay open for orchestrators.
            assert.equal((await fetch(`${base}/health`)).status, 200);
        } finally {
            await stop(server);
        }
    });

    it("returns 500 when the SMTP relay rejects the message", async () => {
        const { base, server } = await startApp({
            send: async () => {
                throw new Error("relay unavailable");
            },
        });

        try {
            const res = await post(base, "/otp", {
                email: "recipient@example.com",
                otp: "135790",
            });

            assert.equal(res.status, 500);
            const payload = await res.json();
            assert.equal(payload.success, false);
        } finally {
            await stop(server);
        }
    });
});
