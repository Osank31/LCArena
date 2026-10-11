import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { SMTPServer, type SMTPServerSession } from "smtp-server";
import { createMailer, createSmtpTransport } from "../../src/mailer";

let server: SMTPServer;
let port: number;
let transport: ReturnType<typeof createSmtpTransport>;
const received: string[] = [];

before(async () => {
    server = new SMTPServer({
        authOptional: true,
        disabledCommands: ["STARTTLS", "AUTH"],
        onData(stream, _session: SMTPServerSession, callback) {
            const chunks: Buffer[] = [];

            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on("end", () => {
                received.push(Buffer.concat(chunks).toString("utf-8"));
                callback();
            });
        },
    });

    await new Promise<void>((resolve, reject) => {
        server.on("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    port = (server.server.address() as AddressInfo).port;

    transport = createSmtpTransport({
        host: "127.0.0.1",
        port,
        secure: false,
        connectionTimeoutMs: 5000,
    });
});

after(async () => {
    transport?.close();
    await new Promise<void>((resolve) => server?.close(resolve));
});

describe("createMailer over real SMTP", () => {
    it("delivers an OTP email through an SMTP relay", async () => {
        const mailer = createMailer(transport, "LCArena <no-reply@lcarena.local>");

        await mailer.send({
            to: "otp-recipient@example.com",
            subject: "Your LCArena verification code",
            text: "Your code is 424242",
            html: "<p>Your code is 424242</p>",
        });

        assert.equal(received.length, 1);
        const raw = received[0];

        assert.match(raw, /To: otp-recipient@example\.com/);
        assert.match(raw, /From: LCArena <no-reply@lcarena\.local>/);
        assert.match(raw, /Subject: Your LCArena verification code/);
        assert.ok(raw.includes("424242"));
    });

    it("propagates delivery failures to the caller", async () => {
        const deadTransport = createSmtpTransport({
            host: "127.0.0.1",
            // Nothing listens here; the send must reject rather than hang.
            port: 1,
            secure: false,
            connectionTimeoutMs: 1500,
        });
        const mailer = createMailer(deadTransport, "no-reply@lcarena.local");

        await assert.rejects(() =>
            mailer.send({
                to: "x@example.com",
                subject: "s",
                text: "t",
            })
        );

        deadTransport.close();
    });
});
