import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import { createApp } from "../../src/app";
import { createDispatcher, type DispatcherOptions } from "../../src/dispatcher";
import { type Mailer, type MailMessage } from "../../src/mailer";

const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

interface StartOptions extends DispatcherOptions {
    token?: string;
}

const startApp = async (
    mailer: Mailer,
    options: StartOptions = {}
): Promise<{
    base: string;
    server: Server;
    dispatcher: ReturnType<typeof createDispatcher>;
}> => {
    const { token, ...dispatcherOptions } = options;
    const dispatcher = createDispatcher(mailer, {
        maxAttempts: 1,
        retryDelayMs: 0,
        ...dispatcherOptions,
    });

    const app: Express = createApp(mailer, { token, dispatcher });

    const server = await new Promise<Server>((resolve) => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });

    const { port } = server.address() as AddressInfo;

    return { base: `http://127.0.0.1:${port}`, server, dispatcher };
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
    it("reports health with queue depth", async () => {
        const { base, server } = await startApp({ send: async () => {} });

        try {
            const res = await fetch(`${base}/health`);
            assert.equal(res.status, 200);

            const payload = await res.json();
            assert.equal(payload.message, "Mail Service Healthy");
            assert.equal(payload.queued, 0);
            assert.equal(payload.inFlight, 0);
        } finally {
            await stop(server);
        }
    });

    it("acknowledges the OTP before the SMTP relay has finished sending", async () => {
        const sent: MailMessage[] = [];
        let sendStartedAt: number | undefined;

        const { base, server, dispatcher } = await startApp({
            send: async (message) => {
                sendStartedAt = Date.now();
                // A relay round-trip is slow; the request must not wait for it.
                await delay(300);
                sent.push(message);
            },
        });

        try {
            const startedAt = Date.now();
            const res = await post(base, "/otp", {
                email: "recipient@example.com",
                otp: "246810",
            });
            const elapsed = Date.now() - startedAt;

            assert.equal(res.status, 202);
            const payload = await res.json();
            assert.equal(payload.success, true);
            assert.equal(payload.message, "OTP email queued for delivery");
            assert.deepEqual(payload.data, { queued: true });

            // The response came back while delivery was still asleep.
            assert.ok(
                elapsed < 250,
                `expected an immediate acknowledgement, got ${elapsed}ms`
            );
            assert.ok(sendStartedAt !== undefined);
            assert.equal(sent.length, 0);

            await dispatcher.idle();

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
        const { base, server, dispatcher } = await startApp(
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
            assert.equal(dispatcher.queued + dispatcher.inFlight, 0);

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
            assert.equal(accepted.status, 202);

            await dispatcher.idle();
            assert.equal(sent.length, 1);

            // Health must stay open for orchestrators.
            assert.equal((await fetch(`${base}/health`)).status, 200);
        } finally {
            await stop(server);
        }
    });

    it("keeps acknowledging when the relay fails, after bounded retries", async () => {
        let attempts = 0;
        const { base, server, dispatcher } = await startApp(
            {
                send: async () => {
                    attempts += 1;
                    throw new Error("relay unavailable");
                },
            },
            { maxAttempts: 3 }
        );

        try {
            const res = await post(base, "/otp", {
                email: "recipient@example.com",
                otp: "135790",
            });

            // Delivery problems are invisible to the caller by design.
            assert.equal(res.status, 202);

            await dispatcher.idle();

            assert.equal(attempts, 3);
            assert.equal(dispatcher.queued, 0);
            assert.equal(dispatcher.inFlight, 0);

            const health = await (await fetch(`${base}/health`)).json();
            assert.equal(health.queued, 0);
            assert.equal(health.inFlight, 0);
        } finally {
            await stop(server);
        }
    });

    it("returns 503 when the delivery queue is saturated", async () => {
        const gate: Array<() => void> = [];
        const { base, server, dispatcher } = await startApp(
            {
                send: () =>
                    new Promise<void>((resolve) => {
                        gate.push(resolve);
                    }),
            },
            { concurrency: 1, maxQueueSize: 1 }
        );

        const body = (otp: string) => ({ email: "full@example.com", otp });

        try {
            // One delivery in flight, one queued, the third has nowhere to go.
            assert.equal((await post(base, "/otp", body("111111"))).status, 202);
            assert.equal((await post(base, "/otp", body("222222"))).status, 202);

            const saturated = await post(base, "/otp", body("333333"));
            assert.equal(saturated.status, 503);
            const payload = await saturated.json();
            assert.equal(payload.success, false);
            assert.match(payload.message, /saturated/i);

            while (gate.length > 0) {
                gate.pop()?.();
                await delay(5);
            }

            await dispatcher.idle();
        } finally {
            await stop(server);
        }
    });
});
