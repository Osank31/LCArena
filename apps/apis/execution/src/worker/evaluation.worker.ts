import { channel, queue } from "@LCArena/config"
import { logger, NotImplementedError, sendSuccess } from "@LCArena/utils"
import { ConsumeMessage } from 'amqplib'
import { ELanguage, IEvaluationData } from "../types/evaluation.types.js";
import { CPPExecutor, Executor, JavaExecutor, PythonExecutor } from "@LCArena/execution";
import { CompileErrorResult } from "@LCArena/execution/dist/executor/executionResult.type.js";
import { Response } from "express";


const executionFactory = {
    getExecutor(language: ELanguage) {
        switch (language) {
            case ELanguage.cpp: return new CPPExecutor();
            case ELanguage.py: return new PythonExecutor()
            case ELanguage.java: return new JavaExecutor();
            default: throw new NotImplementedError("Language not initialized")
        }
    }
}

export function isCompileErrorResult(result: any): result is CompileErrorResult {
    return (
        result !== null &&
        typeof result === "object" &&
        result.status === "COMPILE_ERROR" &&
        typeof result.compileError === "string"
    );
}

const messageConsumer = async (data: ConsumeMessage | null) => {
    if (!data) {
        logger.warn("No data recieved");
        return;
    }

    try {
        const evaluationData: IEvaluationData = JSON.parse(data.content.toString());

        logger.info(
            `Processing submission: ${evaluationData.submissionId}`
        );

        let executor: Executor = executionFactory.getExecutor(evaluationData.language);

        const result = await executor.execute(evaluationData.code, evaluationData.time_limit, "/here")

        // if (isCompileErrorResult(result)) {
        //     return sendSuccess(res, {
        //         ...evaluationData,
        //         evaluatedData: {
        //             errorType: "COMPILATION ERROR",
        //             ...result
        //         }
        //     },
        //         "Evaluation Successful"
        //     )
        // }

    } catch (error) {
        logger.error(
            "Error while processing queue message",
            error
        );

        channel.nack(data, false, false);
    }
}


export const startWorker = () => {
    try {
        if (!channel) {
            logger.error("RabbitMQ channel not initialized");
            return;
        }

        channel.consume(
            queue.submissionCreated,
            messageConsumer
        )

        logger.info("Worker started successfully")
    } catch (error) {

    }
}