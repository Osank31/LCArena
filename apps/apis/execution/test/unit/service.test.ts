import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ELanguage, type IProblem, type ISubmission } from "@LCArena/models";
import { type ExecutionResult } from "@LCArena/execution";
import {
    firstFailedTestCase,
    processSubmission,
    timeLimitSeconds,
    type AcquiredTestCases,
    type EvaluationDeps,
    type SubmissionCompletedPayload,
} from "../../src/service";
import { type SubmissionCreatedMessage } from "../../src/validation";

const IDS = {
    submissionId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    userId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    problemId: "cccccccccccccccccccccccc",
};

const SUCCESS_VERDICT: ExecutionResult = {
    status: "SUCCESS",
    passed: 1,
    total: 2,
    failedCases: { tle: [], re: [], wa: ["test_case_id002"] },
    executionTimeMs: { test_case_id001: 12, test_case_id002: 4 },
};

const message: SubmissionCreatedMessage = {
    submissionId: IDS.submissionId,
    userId: IDS.userId,
    problemId: IDS.problemId,
    code: "// submitted code",
    language: ELanguage.js,
};

const pendingSubmission = (overrides: Partial<ISubmission> = {}) =>
    ({
        _id: IDS.submissionId,
        userId: IDS.userId,
        problemId: IDS.problemId,
        code: "// persisted code",
        language: ELanguage.js,
        status: { status: "PENDING" },
        ...overrides,
    }) as unknown as ISubmission;

const makeProblem = (overrides: Partial<IProblem> = {}) =>
    ({
        time_limit: 2000,
        testCasesUrl: "/tmp/problem-testcases",
        ...overrides,
    }) as unknown as IProblem;

interface HarnessOptions {
    submission?: ISubmission | null;
    problem?: IProblem | null;
    acquired?: AcquiredTestCases;
    verdict?: ExecutionResult;
    executeError?: Error;
    persistResult?: ISubmission | null;
}

interface Harness {
    deps: EvaluationDeps;
    calls: {
        executed: {
            language: ELanguage;
            code: string;
            timeLimitSeconds: number;
            testCasesDir: string;
        }[];
        persisted: ExecutionResult[];
        published: SubmissionCompletedPayload[];
        cleanedUp: number;
    };
}

const createHarness = (options: HarnessOptions = {}): Harness => {
    const calls: Harness["calls"] = {
        executed: [],
        persisted: [],
        published: [],
        cleanedUp: 0,
    };

    const acquired: AcquiredTestCases = options.acquired ?? {
        testCasesDir: "/tmp/lcarena-testcases-fake",
        cleanup: async () => {
            calls.cleanedUp += 1;
        },
    };

    const deps: EvaluationDeps = {
        loadSubmission: async () =>
            options.submission === undefined
                ? pendingSubmission()
                : options.submission,

        loadProblem: async () =>
            options.problem === undefined ? makeProblem() : options.problem,

        acquireTestCases: async () => acquired,

        runExecutor: async (language, code, limit, dir) => {
            calls.executed.push({
                language,
                code,
                timeLimitSeconds: limit,
                testCasesDir: dir,
            });

            if (options.executeError) {
                throw options.executeError;
            }

            return options.verdict ?? SUCCESS_VERDICT;
        },

        persistVerdict: async (_submissionId, status) => {
            calls.persisted.push(status);

            if (options.persistResult !== undefined) {
                return options.persistResult;
            }

            return pendingSubmission({ status }) as unknown as ISubmission;
        },

        publishCompletion: async (payload) => {
            calls.published.push(payload);
        },
    };

    return { deps, calls };
};

describe("timeLimitSeconds", () => {
    it("rounds milliseconds up to whole seconds with a floor of one", () => {
        assert.equal(timeLimitSeconds(2000), 2);
        assert.equal(timeLimitSeconds(2501), 3);
        assert.equal(timeLimitSeconds(0), 5);
        assert.equal(timeLimitSeconds(undefined), 5);
        assert.equal(timeLimitSeconds(1), 1);
    });
});

describe("firstFailedTestCase", () => {
    it("prefers tle, then re, then wa, and is null otherwise", () => {
        assert.equal(firstFailedTestCase(SUCCESS_VERDICT), "test_case_id002");
        assert.equal(
            firstFailedTestCase({
                status: "SUCCESS",
                passed: 0,
                total: 1,
                failedCases: { tle: ["t"], re: ["r"], wa: ["w"] },
                executionTimeMs: {},
            }),
            "t"
        );
        assert.equal(
            firstFailedTestCase({ status: "COMPILE_ERROR", compileError: "x" }),
            null
        );
    });
});

describe("processSubmission", () => {
    it("executes, persists, cleans up and publishes completion", async () => {
        const { deps, calls } = createHarness();

        const result = await processSubmission(message, deps);

        assert.equal(result.outcome, "executed");
        assert.equal(result.status?.status, "SUCCESS");

        assert.equal(calls.executed.length, 1);
        // The persisted submission is the source of truth for code/language.
        assert.equal(calls.executed[0].code, "// persisted code");
        assert.equal(calls.executed[0].language, ELanguage.js);
        assert.equal(calls.executed[0].timeLimitSeconds, 2);
        assert.equal(
            calls.executed[0].testCasesDir,
            "/tmp/lcarena-testcases-fake"
        );

        assert.equal(calls.cleanedUp, 1);
        assert.deepEqual(calls.persisted, [SUCCESS_VERDICT]);
        assert.equal(calls.published.length, 1);

        const payload = calls.published[0];
        assert.equal(payload.submissionId, IDS.submissionId);
        assert.equal(payload.userId, IDS.userId);
        assert.equal(payload.problemId, IDS.problemId);
        assert.equal(payload.status.status, "SUCCESS");
        assert.equal(payload.results.status, "SUCCESS");
        assert.equal(payload.failedTestCase, "test_case_id002");
    });

    it("persists a compile error verbatim", async () => {
        const verdict: ExecutionResult = {
            status: "COMPILE_ERROR",
            compileError: "error: expected ';'",
        };
        const { deps, calls } = createHarness({ verdict });

        const result = await processSubmission(message, deps);

        assert.equal(result.status?.status, "COMPILE_ERROR");
        assert.deepEqual(calls.persisted, [verdict]);
        assert.equal(calls.published.length, 1);
        assert.equal(calls.published[0].failedTestCase, null);
    });

    it("skips a missing submission without executing or publishing", async () => {
        const { deps, calls } = createHarness({ submission: null });

        const result = await processSubmission(message, deps);

        assert.equal(result.outcome, "skipped");
        assert.equal(result.reason, "submission-not-found");
        assert.equal(calls.executed.length, 0);
        assert.equal(calls.published.length, 0);
    });

    it("records INTERNAL_ERROR when the problem is missing", async () => {
        const { deps, calls } = createHarness({ problem: null });

        const result = await processSubmission(message, deps);

        assert.equal(result.outcome, "executed");
        assert.equal(result.reason, "problem-not-found");
        assert.equal(result.status?.status, "INTERNAL_ERROR");
        assert.equal(calls.executed.length, 0);
        assert.equal(calls.persisted.length, 1);
        assert.equal(calls.persisted[0].status, "INTERNAL_ERROR");
        assert.equal(calls.published.length, 1);
        assert.equal(calls.published[0].status.status, "INTERNAL_ERROR");
    });

    it("never re-executes an already-finalized submission but re-publishes its verdict", async () => {
        const { deps, calls } = createHarness({
            submission: pendingSubmission({ status: SUCCESS_VERDICT }),
        });

        const result = await processSubmission(message, deps);

        assert.equal(result.outcome, "skipped");
        assert.equal(result.reason, "already-finalized");
        assert.equal(calls.executed.length, 0);
        assert.equal(calls.persisted.length, 0);
        assert.equal(calls.published.length, 1);
        assert.equal(calls.published[0].status.status, "SUCCESS");
    });

    it("cleans up the workspace and propagates executor failures", async () => {
        const { deps, calls } = createHarness({
            executeError: new Error("docker daemon unavailable"),
        });

        await assert.rejects(
            () => processSubmission(message, deps),
            /docker daemon unavailable/
        );

        assert.equal(calls.cleanedUp, 1);
        assert.equal(calls.persisted.length, 0);
        assert.equal(calls.published.length, 0);
    });

    it("does not publish when it loses the finalize race", async () => {
        const { deps, calls } = createHarness({ persistResult: null });

        const result = await processSubmission(message, deps);

        assert.equal(result.outcome, "skipped");
        assert.equal(result.reason, "lost-finalize-race");
        assert.equal(calls.persisted.length, 1);
        assert.equal(calls.published.length, 0);
    });
});
