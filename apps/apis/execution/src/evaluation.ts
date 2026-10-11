import { channel, queue } from "@LCArena/config";
import { Problem, Submission } from "@LCArena/models";
import { createExecutor } from "./executors";
import { acquireTestCases } from "./testCases";
import { type EvaluationDeps } from "./service";
import { MAX_TESTCASES_BYTES, MAX_TESTCASES_ENTRIES } from "./constants";

/**
 * Production collaborators for {@link EvaluationDeps}. Tests never import this
 * module, so no live Mongo/RabbitMQ/Docker connection is required to unit test
 * the pipeline.
 */
export const evaluationDeps: EvaluationDeps = {
    loadSubmission: (submissionId) => Submission.findById(submissionId),

    loadProblem: (problemId) => Problem.findById(problemId),

    acquireTestCases: (problem) =>
        acquireTestCases({
            testCasesUrl: problem.testCasesUrl,
            testCaseStoragePrefix: problem.testCaseStoragePrefix,
            problemId: String(problem._id),
            maxBytes: MAX_TESTCASES_BYTES,
            maxEntries: MAX_TESTCASES_ENTRIES,
        }),

    runExecutor: (language, code, timeLimitSeconds, testCasesDir) =>
        createExecutor(language, testCasesDir).execute(
            code,
            timeLimitSeconds,
            "testcases"
        ),

    persistVerdict: (submissionId, status) =>
        Submission.findOneAndUpdate(
            { _id: submissionId, "status.status": "PENDING" },
            { $set: { status } },
            { returnDocument: "after" }
        ),

    publishCompletion: async (payload) => {
        if (!channel) {
            throw new Error("RabbitMQ channel is not connected");
        }

        channel.sendToQueue(
            queue.submissionCompleted,
            Buffer.from(JSON.stringify(payload)),
            { persistent: true }
        );
    },
};
