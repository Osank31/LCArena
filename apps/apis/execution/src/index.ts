import express from "express";
import "dotenv/config";
import {
    channel,
    closeQueue,
    connectToQueue,
    dbConnect,
    queue,
} from "@LCArena/config";
import { appErrorHandler } from "@LCArena/middlewares";
import { logger } from "@LCArena/utils";
import { APP_PORT, MAX_MESSAGE_ATTEMPTS, MONGODB_URL } from "./constants";
import { startConsumer } from "./consumer";
import { evaluationDeps } from "./evaluation";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
    res.status(200).json({ message: "Execution Service Healthy" });
});

app.use(appErrorHandler);

const start = async (): Promise<void> => {
    await dbConnect(MONGODB_URL);
    await connectToQueue();

    if (!channel) {
        throw new Error("RabbitMQ channel is not available");
    }

    // The completion queue and the dead-letter safety net are owned by this
    // worker; the submission-created queue is asserted by @LCArena/config.
    await channel.assertQueue(queue.submissionCompleted, { durable: true });
    await channel.assertQueue(queue.submissionCreatedDeadLetter, {
        durable: true,
    });

    const server = app.listen(APP_PORT, () => {
        logger.info(`Execution service listening on port ${APP_PORT}`);
    });

    await startConsumer({
        channel,
        queues: {
            submissionCreated: queue.submissionCreated,
            deadLetter: queue.submissionCreatedDeadLetter,
        },
        maxAttempts: MAX_MESSAGE_ATTEMPTS,
        evaluation: evaluationDeps,
    });

    const shutdown = async (signal: string): Promise<void> => {
        logger.info(`Received ${signal}; shutting down the execution service`);
        server.close();
        await closeQueue();
        process.exit(0);
    };

    process.once("SIGINT", () => void shutdown("SIGINT"));
    process.once("SIGTERM", () => void shutdown("SIGTERM"));
};

start().catch((error) => {
    logger.error(error);
    process.exit(1);
});
