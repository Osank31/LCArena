import { z } from "zod";
import { ELanguage, ESubmissionStatus } from "../models/submission.model.js";

// Create Submission Validation
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

    status: z
        .nativeEnum(ESubmissionStatus)
        .default(ESubmissionStatus.Pending),
});

// Update Submission Validation
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

    status: z
        .nativeEnum(ESubmissionStatus)
        .optional(),
});

// Types
export type CreateSubmissionInput = z.infer<
    typeof createSubmissionSchema
>;

export type UpdateSubmissionInput = z.infer<
    typeof updateSubmissionSchema
>;