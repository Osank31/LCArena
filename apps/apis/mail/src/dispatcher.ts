import { logger } from "@LCArena/utils";
import { type Mailer, type MailMessage } from "./mailer";

export interface DispatcherOptions {
    /** Deliveries attempted in parallel. */
    concurrency?: number;
    /** Messages allowed to wait in memory; further sends are rejected (backpressure). */
    maxQueueSize?: number;
    /** Attempts per message, including the first one. */
    maxAttempts?: number;
    /** Base delay for linear backoff between attempts. */
    retryDelayMs?: number;
}

export interface MailDispatcher {
    /**
     * Queues a message for background delivery. Returns `false` when the queue
     * is full or the dispatcher is draining, so the caller can answer with 503
     * instead of buffering without bound.
     */
    enqueue(message: MailMessage): boolean;
    /** Messages waiting for a free worker. */
    readonly queued: number;
    /** Deliveries currently in progress. */
    readonly inFlight: number;
    /** Resolves once nothing is queued or in flight. */
    idle(): Promise<void>;
    /**
     * Stops accepting work and waits for the backlog to finish. Resolves
     * `false` if the backlog did not clear within `timeoutMs`.
     */
    drain(timeoutMs?: number): Promise<boolean>;
}

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number,
    onTimeout: T
): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(onTimeout), timeoutMs);
    });

    return Promise.race([promise, timeout]).finally(() => {
        if (timer) clearTimeout(timer);
    });
};

/**
 * Decouples `POST /otp` from SMTP. The request only has to append the rendered
 * message to this queue; nodemailer then runs on its own clock, so a slow or
 * unreachable relay no longer inflates auth latency.
 *
 * Delivery is at-most-once in the happy path and bounded on failure: each
 * message is retried `maxAttempts` times with linear backoff, then dropped with
 * an error log. OTPs are short-lived (5 minutes) and cheap to re-request, so a
 * bounded in-memory queue is a deliberate trade-off against running RabbitMQ
 * for a service that otherwise needs no infrastructure.
 */
export const createDispatcher = (
    mailer: Mailer,
    options: DispatcherOptions = {}
): MailDispatcher => {
    const concurrency = Math.max(1, Math.floor(options.concurrency ?? 2));
    const maxQueueSize = Math.max(1, Math.floor(options.maxQueueSize ?? 500));
    const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 3));
    const retryDelayMs = Math.max(0, options.retryDelayMs ?? 500);

    const waiting: MailMessage[] = [];
    const idleResolvers: Array<() => void> = [];

    let inFlight = 0;
    let accepting = true;

    const settle = (): void => {
        if (waiting.length > 0 || inFlight > 0) return;

        while (idleResolvers.length > 0) {
            idleResolvers.shift()?.();
        }
    };

    const waitForIdle = (): Promise<void> => {
        if (waiting.length === 0 && inFlight === 0) return Promise.resolve();

        return new Promise<void>((resolve) => {
            idleResolvers.push(resolve);
        });
    };

    const deliver = async (message: MailMessage): Promise<void> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                await mailer.send(message);
                return;
            } catch (error) {
                const lastAttempt = attempt === maxAttempts;

                // Never log the body: it carries the OTP.
                logger.error(
                    lastAttempt
                        ? "Email delivery failed; giving up"
                        : "Email delivery failed; retrying",
                    {
                        to: message.to,
                        subject: message.subject,
                        attempt,
                        maxAttempts,
                        error:
                            error instanceof Error
                                ? error.message
                                : "unknown error",
                    }
                );

                if (lastAttempt) return;

                if (retryDelayMs > 0) {
                    await sleep(retryDelayMs * attempt);
                }
            }
        }
    };

    const pump = (): void => {
        while (inFlight < concurrency && waiting.length > 0) {
            const message = waiting.shift();

            if (!message) break;

            inFlight += 1;

            void deliver(message)
                .catch((error: unknown) => {
                    // `deliver` swallows send failures; this only guards against
                    // an unexpected bug so one bad message cannot wedge a worker.
                    logger.error("Unexpected mail dispatcher failure", { error });
                })
                .finally(() => {
                    inFlight -= 1;
                    pump();
                    settle();
                });
        }

        settle();
    };

    const enqueue = (message: MailMessage): boolean => {
        if (!accepting || waiting.length >= maxQueueSize) return false;

        waiting.push(message);
        pump();

        return true;
    };

    const drain = async (timeoutMs = 10_000): Promise<boolean> => {
        accepting = false;

        const finished = await withTimeout(
            waitForIdle().then(() => true),
            timeoutMs,
            false
        );

        if (!finished) {
            logger.warn("Mail dispatcher drain timed out", {
                queued: waiting.length,
                inFlight,
            });
        }

        return finished;
    };

    return {
        enqueue,
        get queued() {
            return waiting.length;
        },
        get inFlight() {
            return inFlight;
        },
        idle: waitForIdle,
        drain,
    };
};
