import amqplib, { Channel } from "amqplib";
import {logger} from "@LCArena/utils";

export interface QueueConnection {
    channel: Channel;
    queue: string;
}

let channel: Channel;
let connection: Awaited<ReturnType<typeof amqplib.connect>>;
let queue = {
    submissionCreated: "submission.created",
    submissionCompleted: "submission.completed",
    // Bounded-retry safety net: malformed or repeatedly failing messages are
    // parked here instead of being re-queued forever.
    submissionCreatedDeadLetter: "submission.created.dead"
};

export async function connectToQueue() {
    try {
        connection = await amqplib.connect(
            process.env.RABBITMQ_URL || "amqp://localhost"
        );

        channel = await connection.createChannel();

        await channel.assertQueue(queue.submissionCreated);

        logger.info("Connected to RabbitMQ")
    } catch (error) {
        logger.error(error);
        throw error;
    }
}

/**
 * Closes the shared channel and its underlying connection, letting in-flight
 * publishes drain. Safe to call when nothing was ever connected.
 */
export async function closeQueue() {
    try {
        if (channel) {
            await channel.close();
        }
    } catch (error) {
        logger.error(error);
    }

    try {
        if (connection) {
            await connection.close();
        }
    } catch (error) {
        logger.error(error);
    }
}

export { channel, queue };