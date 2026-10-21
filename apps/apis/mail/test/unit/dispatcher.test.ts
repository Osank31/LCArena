import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDispatcher } from "../../src/dispatcher";
import { type Mailer, type MailMessage } from "../../src/mailer";

const message = (to: string): MailMessage => ({
    to,
    subject: "Your LCArena verification code",
    text: "code",
});

const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

interface FakeMailerOptions {
    delayMs?: number;
    /** Number of leading attempts that reject before one succeeds. */
    failures?: number;
}

const fakeMailer = (options: FakeMailerOptions = {}) => {
    const sent: MailMessage[] = [];
    let attempts = 0;
    let failuresLeft = options.failures ?? 0;
    let active = 0;
    let peakConcurrency = 0;

    const mailer: Mailer = {
        send: async (mail) => {
            attempts += 1;
            active += 1;
            peakConcurrency = Math.max(peakConcurrency, active);

            try {
                if (options.delayMs) await delay(options.delayMs);

                if (failuresLeft > 0) {
                    failuresLeft -= 1;
                    throw new Error("relay unavailable");
                }

                sent.push(mail);
            } finally {
                active -= 1;
            }
        },
    };

    return {
        mailer,
        sent,
        get attempts() {
            return attempts;
        },
        get peakConcurrency() {
            return peakConcurrency;
        },
    };
};

describe("createDispatcher", () => {
    it("delivers queued messages in the background and reports idle", async () => {
        const { mailer, sent } = fakeMailer();
        const dispatcher = createDispatcher(mailer);

        assert.equal(dispatcher.enqueue(message("a@example.com")), true);

        await dispatcher.idle();

        assert.equal(sent.length, 1);
        assert.equal(sent[0].to, "a@example.com");
        assert.equal(dispatcher.queued, 0);
        assert.equal(dispatcher.inFlight, 0);
    });

    it("respects the concurrency limit", async () => {
        const fake = fakeMailer({ delayMs: 10 });
        const dispatcher = createDispatcher(fake.mailer, { concurrency: 2 });

        for (let i = 0; i < 6; i += 1) {
            assert.equal(dispatcher.enqueue(message(`u${i}@example.com`)), true);
        }

        await dispatcher.idle();

        assert.equal(fake.sent.length, 6);
        assert.equal(fake.peakConcurrency, 2);
    });

    it("retries a failed delivery and succeeds on a later attempt", async () => {
        const fake = fakeMailer({ failures: 2 });
        const dispatcher = createDispatcher(fake.mailer, {
            maxAttempts: 3,
            retryDelayMs: 0,
        });

        dispatcher.enqueue(message("retry@example.com"));
        await dispatcher.idle();

        assert.equal(fake.attempts, 3);
        assert.equal(fake.sent.length, 1);
    });

    it("gives up after maxAttempts instead of retrying forever", async () => {
        const fake = fakeMailer({ failures: 99 });
        const dispatcher = createDispatcher(fake.mailer, {
            maxAttempts: 2,
            retryDelayMs: 0,
        });

        dispatcher.enqueue(message("dead@example.com"));
        await dispatcher.idle();

        assert.equal(fake.attempts, 2);
        assert.equal(fake.sent.length, 0);
        assert.equal(dispatcher.queued, 0);
        assert.equal(dispatcher.inFlight, 0);
    });

    it("applies backpressure instead of buffering without bound", async () => {
        const gate: Array<() => void> = [];
        const mailer: Mailer = {
            send: () =>
                new Promise<void>((resolve) => {
                    gate.push(resolve);
                }),
        };

        const dispatcher = createDispatcher(mailer, {
            concurrency: 1,
            maxQueueSize: 1,
        });

        // First message occupies the only worker, second waits in the queue.
        assert.equal(dispatcher.enqueue(message("first@example.com")), true);
        assert.equal(dispatcher.enqueue(message("second@example.com")), true);
        assert.equal(dispatcher.enqueue(message("third@example.com")), false);

        while (gate.length > 0) {
            gate.pop()?.();
            await delay(1);
        }

        await dispatcher.idle();
        assert.equal(dispatcher.queued, 0);
    });

    it("drains the backlog and stops accepting new work", async () => {
        const { mailer, sent } = fakeMailer({ delayMs: 5 });
        const dispatcher = createDispatcher(mailer);

        dispatcher.enqueue(message("one@example.com"));
        dispatcher.enqueue(message("two@example.com"));

        assert.equal(await dispatcher.drain(1_000), true);
        assert.equal(sent.length, 2);

        // After draining, the dispatcher refuses new messages.
        assert.equal(dispatcher.enqueue(message("late@example.com")), false);
        assert.equal(sent.length, 2);
    });

    it("reports a failed drain when the backlog outlives the timeout", async () => {
        const mailer: Mailer = {
            send: () => delay(200),
        };
        const dispatcher = createDispatcher(mailer, { concurrency: 1 });

        dispatcher.enqueue(message("slow@example.com"));

        assert.equal(await dispatcher.drain(10), false);
        await dispatcher.idle();
    });
});
