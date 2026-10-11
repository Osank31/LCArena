import { logger } from "@LCArena/utils";
import { type ELanguage, type IProblem, type ISubmission } from "@LCArena/models";
import { type ExecutionResult } from "@LCArena/execution";
import { type SubmissionCreatedMessage } from "./validation";

/** Result of staging a problem's test cases into an isolated workspace. */
export interface AcquiredTestCases {
    /** Directory whose immediate children are the `test_case_*` folders. */
    testCasesDir: string;
    /** Removes the whole per-submission workspace. Never throws. */
    cleanup: () => Promise<void>;
}

/**
 * The `submission.completed` payload contract (see AGENTS.md §5.3).
 */
export interface SubmissionCompletedPayload {
    submissionId: string;
    userId: string;
    problemId: string;
    status: ExecutionResult;
    results: ExecutionResult;
    failedTestCase: string | null;
}

/** Collaborators the pipeline needs; all of them are faked in unit tests. */
export interface EvaluationDeps {
    loadSubmission(submissionId: string): Promise<ISubmission | null>;
    loadProblem(problemId: string): Promise<IProblem | null>;
    acquireTestCases(problem: IProblem): Promise<AcquiredTestCases>;
    runExecutor(
        language: ELanguage,
        code: string,
        timeLimitSeconds: number,
        testCasesDir: string
    ): Promise<ExecutionResult>;
    /**
     * Atomically writes the verdict only while the submission is still
     * `PENDING`. Resolves `null` when another worker already finalized it.
     */
    persistVerdict(
        submissionId: string,
        status: ExecutionResult
    ): Promise<ISubmission | null>;
    publishCompletion(payload: SubmissionCompletedPayload): Promise<void>;
}

export type ProcessOutcome = "executed" | "skipped";

export interface ProcessResult {
    outcome: ProcessOutcome;
    reason?: string;
    status?: ExecutionResult;
}

const DEFAULT_TIME_LIMIT_MS = 5000;

/** First non-empty failing test-case folder, honouring tle > re > wa. */
export const firstFailedTestCase = (
    result: ExecutionResult
): string | null => {
    if (result.status !== "SUCCESS") {
        return null;
    }

    return (
        result.failedCases.tle[0] ??
        result.failedCases.re[0] ??
        result.failedCases.wa[0] ??
        null
    );
};

export const buildCompletionPayload = (
    submission: ISubmission,
    status: ExecutionResult
): SubmissionCompletedPayload => ({
    submissionId: String(submission._id),
    userId: String(submission.userId),
    problemId: String(submission.problemId),
    status,
    results: status,
    failedTestCase: firstFailedTestCase(status),
});

export const timeLimitSeconds = (timeLimitMs: number | undefined): number => {
    const effective =
        typeof timeLimitMs === "number" && timeLimitMs > 0
            ? timeLimitMs
            : DEFAULT_TIME_LIMIT_MS;

    return Math.max(1, Math.ceil(effective / 1000));
};

/**
 * Evaluates a single submission.
 *
 * The persisted submission is the source of truth, so the message is only used
 * to locate it. Failures that belong to the infrastructure (workspace staging,
 * Docker, persistence) are thrown and left to the consumer's bounded-retry
 * policy; only genuine execution verdicts are persisted here.
 */
export async function processSubmission(
    message: SubmissionCreatedMessage,
    deps: EvaluationDeps
): Promise<ProcessResult> {
    const submission = await deps.loadSubmission(message.submissionId);

    if (!submission) {
        logger.warn("Skipping submission.created for a missing submission", {
            submissionId: message.submissionId,
        });

        return { outcome: "skipped", reason: "submission-not-found" };
    }

    // Idempotency: never recompute a terminal verdict. Re-emitting the stored
    // verdict also repairs the case where a previous attempt persisted the
    // result but crashed before publishing the completion event.
    if (submission.status?.status !== "PENDING") {
        await deps.publishCompletion(
            buildCompletionPayload(submission, submission.status)
        );

        return {
            outcome: "skipped",
            reason: "already-finalized",
            status: submission.status,
        };
    }

    const problem = await deps.loadProblem(String(submission.problemId));

    if (!problem) {
        const verdict: ExecutionResult = {
            status: "INTERNAL_ERROR",
            message: "Referenced problem could not be loaded",
        };

        const finalized = await deps.persistVerdict(
            String(submission._id),
            verdict
        );

        if (finalized) {
            await deps.publishCompletion(
                buildCompletionPayload(finalized, verdict)
            );
        }

        return { outcome: "executed", reason: "problem-not-found", status: verdict };
    }

    const acquired = await deps.acquireTestCases(problem);

    let verdict: ExecutionResult;

    try {
        verdict = await deps.runExecutor(
            submission.language,
            submission.code,
            timeLimitSeconds(problem.time_limit),
            acquired.testCasesDir
        );
    } finally {
        await acquired.cleanup();
    }

    const finalized = await deps.persistVerdict(
        String(submission._id),
        verdict
    );

    if (!finalized) {
        // Another consumer finalized this submission concurrently; its verdict
        // wins and it owns the completion event.
        logger.info("Lost the finalize race for a submission", {
            submissionId: message.submissionId,
        });

        return { outcome: "skipped", reason: "lost-finalize-race", status: verdict };
    }

    await deps.publishCompletion(buildCompletionPayload(finalized, verdict));

    return { outcome: "executed", status: verdict };
}
