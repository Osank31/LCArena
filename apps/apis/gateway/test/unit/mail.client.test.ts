import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    createMailClient,
    type MailRequest,
    type MailRequestConfig,
} from "../../src/services/mail.client";

interface RecordedCall {
    url: string;
    body: unknown;
    config?: MailRequestConfig;
}

const recordingRequest = (): { request: MailRequest; calls: RecordedCall[] } => {
    const calls: RecordedCall[] = [];

    return {
        calls,
        request: async (url, body, config) => {
            calls.push({ url, body, config });
            return { status: 200 };
        },
    };
};

describe("createMailClient", () => {
    it("POSTs the OTP to the mail service with a bounded timeout", async () => {
        const { request, calls } = recordingRequest();
        const client = createMailClient({
            baseUrl: "http://mail:3003",
            request,
            timeoutMs: 1234,
        });

        await client.sendOtpEmail({ email: "user@example.com", otp: "123456" });

        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, "http://mail:3003/otp");
        assert.deepEqual(calls[0].body, {
            email: "user@example.com",
            otp: "123456",
        });
        assert.equal(calls[0].config?.timeout, 1234);
        assert.equal(calls[0].config?.headers, undefined);
    });

    it("sends the shared token header when a token is configured", async () => {
        const { request, calls } = recordingRequest();
        const client = createMailClient({
            baseUrl: "http://mail:3003",
            request,
            token: "s3cret-token",
        });

        await client.sendOtpEmail({ email: "user@example.com", otp: "123456" });

        assert.deepEqual(calls[0].config?.headers, {
            "x-mail-service-token": "s3cret-token",
        });
    });

    it("propagates delivery failures from sendOtpEmail", async () => {
        const client = createMailClient({
            baseUrl: "http://mail:3003",
            request: async () => {
                throw new Error("connection refused");
            },
        });

        await assert.rejects(
            () =>
                client.sendOtpEmail({
                    email: "user@example.com",
                    otp: "123456",
                }),
            /connection refused/
        );
    });

    it("swallows delivery failures in notifyOtp (best-effort)", async () => {
        const { request, calls } = recordingRequest();
        let attempt = 0;

        const client = createMailClient({
            baseUrl: "http://mail:3003",
            request: async (...args) => {
                attempt += 1;

                if (attempt === 1) {
                    throw new Error("relay unavailable");
                }

                return request(...args);
            },
        });

        // Must resolve rather than throw, so /auth/send-otp stays non-revealing.
        await client.notifyOtp({ email: "user@example.com", otp: "123456" });

        assert.equal(attempt, 1);
        assert.equal(calls.length, 0);
    });

    it("delivers successfully through notifyOtp", async () => {
        const { request, calls } = recordingRequest();
        const client = createMailClient({
            baseUrl: "http://mail:3003",
            request,
        });

        await client.notifyOtp({ email: "user@example.com", otp: "999999" });

        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, "http://mail:3003/otp");
    });

    it("returns from dispatchOtp without waiting for the mail service", async () => {
        const calls: RecordedCall[] = [];
        let release: (() => void) | undefined;

        const client = createMailClient({
            baseUrl: "http://mail:3003",
            request: (url, body, config) => {
                calls.push({ url, body, config });

                // A slow mail service: the promise only settles when released.
                return new Promise((resolve) => {
                    release = () => resolve({ status: 202 });
                });
            },
        });

        // Synchronous return: this is what keeps /auth/send-otp fast.
        assert.equal(client.dispatchOtp({ email: "user@example.com", otp: "123456" }), undefined);
        assert.equal(calls.length, 1);
        assert.equal(typeof release, "function");

        release?.();
    });

    it("never rejects from dispatchOtp when the mail service is unreachable", async () => {
        const client = createMailClient({
            baseUrl: "http://mail:3003",
            request: async () => {
                throw new Error("connection refused");
            },
        });

        // An un-awaited call must not become an unhandled rejection.
        assert.doesNotThrow(() =>
            client.dispatchOtp({ email: "user@example.com", otp: "123456" })
        );

        await new Promise((resolve) => setTimeout(resolve, 10));
    });
});
