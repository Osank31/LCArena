import { z } from "zod";
import { ELanguage } from "@LCArena/models";
import type { ExecutionResult } from "@LCArena/execution";

// --- Canonical execution-verdict schema -------------------------------------
// This mirrors the `ExecutionResult` union exported by @LCArena/execution
// (COMPILE_ERROR | SUCCESS | PENDING | INTERNAL_ERROR) so the HTTP layer, the
// database model and the evaluation worker all agree on one shape.

const failedCasesSchema = z.object({
    tle: z.array(z.string()),
    re: z.array(z.string()),
    wa: z.array(z.string()),
});

const pendingResultSchema = z.object({
    status: z.literal("PENDING"),
});

const compileErrorResultSchema = z.object({
    status: z.literal("COMPILE_ERROR"),
    compileError: z.string(),
});

const executionSuccessResultSchema = z.object({
    status: z.literal("SUCCESS"),
    passed: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    failedCases: failedCasesSchema,
    // Maps a test-case folder name to its wall-clock execution time in ms.
    executionTimeMs: z.record(z.string(), z.number()),
});

const internalErrorResultSchema = z.object({
    status: z.literal("INTERNAL_ERROR"),
    message: z.string(),
});

export const submissionStatusSchema = z.discriminatedUnion("status", [
    pendingResultSchema,
    compileErrorResultSchema,
    executionSuccessResultSchema,
    internalErrorResultSchema,
]);

/**
 * Compile-time guard that the Zod verdict union stays assignable to the
 * canonical `ExecutionResult`. If the two drift apart this assignment stops
 * compiling, which is exactly what we want instead of a silent mismatch.
 */
const _assertCanonicalStatusCompatibility: ExecutionResult = {} as z.infer<
    typeof submissionStatusSchema
>;
void _assertCanonicalStatusCompatibility;

// --- Create -----------------------------------------------------------------
// `status` is intentionally absent: a client must never decide the initial
// verdict of a submission. Zod strips unknown keys, so a client-supplied
// `status` is ignored and the service always initialises `{ status: "PENDING" }`.
export const createSubmissionSchema = z.object({
    problemId: z.string().min(1, "Problem Id is required"),

    code: z.string().min(1, "Code is required"),

    language: z.nativeEnum(ELanguage).default(ELanguage.cpp),
});

// --- Update -----------------------------------------------------------------
// Legitimate execution-status updates (and manual admin edits) are supported;
// every verdict must remain one of the canonical outcomes.
export const updateSubmissionSchema = z.object({
    problemId: z.string().min(1, "Problem Id is required").optional(),

    code: z.string().min(1, "Code is required").optional(),

    language: z.nativeEnum(ELanguage).optional(),

    status: submissionStatusSchema.optional(),
});

// Types
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
