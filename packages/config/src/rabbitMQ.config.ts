import amqplib, { Channel } from "amqplib";
import {logger} from "@LCArena/utils";

export interface QueueConnection {
    channel: Channel;
    queue: string;
}

let channel: Channel;
let queue = {
    submissionCreated: "submission.created",
    submissionCompleted: "submission.completed"
};

export async function connectToQueue() {
    try {
        const connection = await amqplib.connect(
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

export { channel, queue };