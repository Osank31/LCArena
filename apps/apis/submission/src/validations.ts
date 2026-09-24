import { z } from "zod";
import { ELanguage } from "@LCArena/models";

// 1. Recreate the ExecutionResult TypeScript schema structure using Zod
const failedCasesSchema = z.object({
    tle: z.array(z.string()),
    re: z.array(z.string()),
    wa: z.array(z.string()),
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
    executionTimeMs: z.any(), // Matches 'any' from your interface, but z.number() is recommended if possible
});

// Discriminated union matching: ExecutionResult | "PENDING"
export const submissionStatusSchema = z.discriminatedUnion("status", [
    z.object({ status: z.literal("PENDING") }), // Allows initial creation state
    compileErrorResultSchema,
    executionSuccessResultSchema,
]);

// 2. Create Submission Validation
export const createSubmissionSchema = z.object({
    problemId: z
        .string()
        .min(1, "Problem Id is required"),

    code: z
        .string()
        .min(1, "Code is required"),

    language: z
        .nativeEnum(ELanguage)
        .default(ELanguage.cpp),

    // Defaults to the PENDING state object
    status: submissionStatusSchema
        .default({ status: "PENDING" }), 
});

// 3. Update Submission Validation
export const updateSubmissionSchema = z.object({
    problemId: z
        .string()
        .min(1, "Problem Id is required")
        .optional(),

    code: z
        .string()
        .min(1, "Code is required")
        .optional(),

    language: z
        .nativeEnum(ELanguage)
        .optional(),

    status: submissionStatusSchema
        .optional(),
});

// Types
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
