/**
 * Unit tests for the submission validation contract.
 *
 * These do not touch MongoDB, RabbitMQ or Docker — they only exercise the Zod
 * schemas, which is where the "client can set the initial verdict" bug lived.
 *
 * Run with:
 *   npm run test:unit   (or npm test)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    createSubmissionSchema,
    updateSubmissionSchema,
} from "../../src/validations";
import { ELanguage } from "@LCArena/models";
import type { ExecutionResult } from "@LCArena/execution";

const SUCCESS_VERDICT = {
    status: "SUCCESS",
    passed: 1,
    total: 2,
    failedCases: { tle: [], re: [], wa: ["test_case_id002"] },
    executionTimeMs: { test_case_id001: 12, test_case_id002: 4 },
};

describe("createSubmissionSchema", () => {
    it("ignores a client-supplied execution status", () => {
        // A malicious client tries to pre-seed a passing verdict.
        const parsed = createSubmissionSchema.parse({
            problemId: "p1",
            code: "print(1)",
            language: "py",
            status: SUCCESS_VERDICT,
        });

        assert.equal("status" in parsed, false);
        assert.equal(parsed.problemId, "p1");
        assert.equal(parsed.code, "print(1)");
        assert.equal(parsed.language, ELanguage.py);
    });

    it("ignores a client-supplied PENDING status too", () => {
        const parsed = createSubmissionSchema.parse({
            problemId: "p1",
            code: "x",
            status: { status: "PENDING" },
        });

        assert.equal("status" in parsed, false);
    });

    it("defaults the language to cpp and never produces a status", () => {
        const parsed = createSubmissionSchema.parse({
            problemId: "p1",
            code: "int main(){}",
        });

        assert.equal(parsed.language, ELanguage.cpp);
        assert.equal("status" in parsed, false);
    });

    it("rejects a missing problem id or empty code", () => {
        assert.equal(
            createSubmissionSchema.safeParse({ code: "x" }).success,
            false
        );
        assert.equal(
            createSubmissionSchema.safeParse({ problemId: "p", code: "" })
                .success,
            false
        );
    });

    it("rejects an unsupported language", () => {
        const result = createSubmissionSchema.safeParse({
            problemId: "p",
            code: "x",
            language: "rust",
        });

        assert.equal(result.success, false);
    });
});

describe("updateSubmissionSchema", () => {
    it("accepts every canonical execution verdict", () => {
        const verdicts: ExecutionResult[] = [
            { status: "PENDING" },
            { status: "COMPILE_ERROR", compileError: "boom" },
            SUCCESS_VERDICT,
            { status: "INTERNAL_ERROR", message: "docker unavailable" },
        ];

        for (const verdict of verdicts) {
            const parsed = updateSubmissionSchema.parse({ status: verdict });
            assert.equal(parsed.status?.status, verdict.status);
        }
    });

    it("rejects a non-canonical status", () => {
        const result = updateSubmissionSchema.safeParse({
            status: { status: "NONSENSE" },
        });

        assert.equal(result.success, false);
    });

    it("rejects a malformed SUCCESS verdict", () => {
        const result = updateSubmissionSchema.safeParse({
            status: {
                status: "SUCCESS",
                passed: "not-a-number",
                total: 1,
                failedCases: { tle: [], re: [], wa: [] },
                executionTimeMs: {},
            },
        });

        assert.equal(result.success, false);
    });

    it("allows partial field updates without a status", () => {
        const parsed = updateSubmissionSchema.parse({ code: "updated" });
        assert.equal(parsed.code, "updated");
        assert.equal(parsed.status, undefined);
    });
});
