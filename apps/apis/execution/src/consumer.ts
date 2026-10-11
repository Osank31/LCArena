import { type Channel, type ConsumeMessage } from "amqplib";
import { logger } from "@LCArena/utils";
import { type ExecutionResult } from "@LCArena/execution";
import {
    buildCompletionPayload,
    processSubmission,
    type EvaluationDeps,
} from "./service";
import {
    submissionCreatedMessageSchema,
    type SubmissionCreatedMessage,
} from "./validation";

export interface SubmissionConsumerQueues {
    submissionCreated: string;
    deadLetter: string;
}

export interface SubmissionConsumerOptions {
    channel: Channel;
    queues: SubmissionConsumerQueues;
    /** Total processing attempts before the message is parked. */
    maxAttempts: number;
    evaluation: EvaluationDeps;
}

const ATTEMPTS_HEADER = "x-attempts";

const readAttempts = (message: ConsumeMessage): number => {
    const raw = message.properties.headers?.[ATTEMPTS_HEADER];
    const value = Number(raw);

    return Number.isFinite(value) && value > 0 ? value : 0;
};

const parkMessage = (
    channel: Channel,
    queue: string,
    message: ConsumeMessage,
    reason: string
): void => {
    try {
        channel.sendToQueue(queue, message.content, {
            persistent: true,
            contentType: message.properties.contentType,
            headers: {
                ...message.properties.headers,
                "x-park-reason": reason,
                "x-parked-at": new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error("Failed to park a submission.created message", {
            reason,
            error: error instanceof Error ? error.message : "unknown error",
        });
    }
};

const recordPermanentFailure = async (
    submissionId: string,
    evaluation: EvaluationDeps
): Promise<void> => {
    const verdict: ExecutionResult = {
        status: "INTERNAL_ERROR",
        message: "Evaluation failed after repeated attempts",
    };

    try {
        const finalized = await evaluation.persistVerdict(
            submissionId,
            verdict
        );

        if (finalized) {
            await evaluation.publishCompletion(
                buildCompletionPayload(finalized, verdict)
            );
        }
    } catch (error) {
        logger.error("Failed to persist an INTERNAL_ERROR verdict", {
            submissionId,
            error: error instanceof Error ? error.message : "unknown error",
        });
    }
};

const handleProcessingFailure = async (params: {
    channel: Channel;
    queues: SubmissionConsumerQueues;
    maxAttempts: number;
    evaluation: EvaluationDeps;
    message: ConsumeMessage;
    parsed: SubmissionCreatedMessage;
    attempts: number;
    error: unknown;
}): Promise<void> => {
    const {
        channel,
        queues,
        maxAttempts,
        evaluation,
        message,
        parsed,
        attempts,
        error,
    } = params;

    const nextAttempt = attempts + 1;
    const reason = error instanceof Error ? error.message : "unknown error";

    if (nextAttempt < maxAttempts) {
        logger.warn("Retrying a submission.created message", {
            submissionId: parsed.submissionId,
            attempt: nextAttempt,
            maxAttempts,
            reason,
        });

        channel.sendToQueue(queues.submissionCreated, message.content, {
            persistent: true,
            contentType: message.properties.contentType,
            headers: { ...message.properties.headers, [ATTEMPTS_HEADER]: nextAttempt },
        });
        channel.ack(message);
        return;
    }

    logger.error("Exhausted retries for a submission.created message", {
        submissionId: parsed.submissionId,
        attempts: nextAttempt,
        reason,
    });

    await recordPermanentFailure(parsed.submissionId, evaluation);
    parkMessage(channel, queues.deadLetter, message, "retries-exhausted");
    channel.ack(message);
};

/**
 * Builds the `submission.created` message handler. It always acknowledges a
 * message it has dealt with: successful runs are only acked after the verdict
 * is durably persisted, retryable failures are re-published with an incremented
 * attempt counter, and everything else is parked on the dead-letter queue.
 */
export const createSubmissionHandler =
    (options: SubmissionConsumerOptions) =>
    async (message: ConsumeMessage | null): Promise<void> => {
        if (!message) {
            return;
        }

        const { channel, queues, maxAttempts, evaluation } = options;
        const attempts = readAttempts(message);

        let parsed: SubmissionCreatedMessage;

        try {
            parsed = submissionCreatedMessageSchema.parse(
                JSON.parse(message.content.toString())
            );
        } catch (error) {
            logger.warn("Parking a malformed submission.created message", {
                error: error instanceof Error ? error.message : "invalid message",
            });
            parkMessage(channel, queues.deadLetter, message, "malformed");
            channel.ack(message);
            return;
        }

        try {
            const result = await processSubmission(parsed, evaluation);
            channel.ack(message);
            logger.info("Handled a submission.created message", {
                submissionId: parsed.submissionId,
                outcome: result.outcome,
                reason: result.reason,
                verdict: result.status?.status,
                attempt: attempts,
            });
        } catch (error) {
            await handleProcessingFailure({
                channel,
                queues,
                maxAttempts,
                evaluation,
                message,
                parsed,
                attempts,
                error,
            });
        }
    };

/** Starts consuming; returns the consumer tag so it can be cancelled later. */
export const startConsumer = async (
    options: SubmissionConsumerOptions
): Promise<string> => {
    const { channel, queues } = options;
    const handler = createSubmissionHandler(options);

    channel.prefetch(1);

    const { consumerTag } = await channel.consume(
        queues.submissionCreated,
        (message) => {
            void handler(message).catch((error) => {
                logger.error("Unhandled error in the submission consumer", {
                    error:
                        error instanceof Error ? error.message : "unknown error",
                });
            });
        },
        { noAck: false }
    );

    logger.info(
        `Execution service is consuming ${queues.submissionCreated}`
    );

    return consumerTag;
};
