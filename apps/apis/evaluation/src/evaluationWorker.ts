import { channel, queue } from "@LCArena/config"
import { ELanguage } from "@LCArena/models";
import { ConsumeMessage } from "amqplib";
import { type ExecutionResult as SubmissionStatus } from "@LCArena/execution";
import { processExecution } from "./processExecution";
import { logger } from "@LCArena/utils";

export type EvaluationMessage = {
    submissionId: string;
    userId: string;
    problemId: string;
    code: string;
    language: ELanguage;
    status: SubmissionStatus;
};

export const startWorker = async () => {
    try {
        if (!channel) {
            logger.error("Rabbit MQ channel not initialized")
            return;
        }

        channel.consume(
            queue.submissionCreated,
            async (data: ConsumeMessage | null) => {
                if (!data) {
                    logger.warn("No data recieved from queue");
                    return;
                }

                try {
                    const evalutionData = JSON.parse(
                        data.content.toString()
                    ) as EvaluationMessage

                    logger.info(
                        `Processing submission: ${evalutionData.submissionId}`
                    );

                    const result = processExecution({
                        problemId: evalutionData.problemId, 
                        submissionId: evalutionData.submissionId
                    });

                    channel.sendToQueue(
                        queue.submissionCompleted,
                        Buffer.from(JSON.stringify(result))
                    )

                    logger.info(
                        `Finished processing submission: ${evalutionData.submissionId}`
                    );

                    channel.ack(data)
                } catch (error) {
                    logger.error(
                        "Error while processing queue message",
                        error
                    );

                    channel.nack(data, false, false);
                }
            }
        )
        logger.info("Worker started successfully");
    } catch (error) {
        logger.error("Failed to start worker", error);
    }
}
