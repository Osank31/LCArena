import { z } from "zod";
import mongoose from "mongoose";
import { ELanguage } from "@LCArena/models";

// Mirrors the ObjectId check used by the HTTP controllers so message ids are
// validated the same way as request ids.
const objectIdSchema = z
    .string()
    .refine((value) => mongoose.Types.ObjectId.isValid(value), {
        message: "Invalid ObjectId",
    });

/**
 * Shape of a `submission.created` message. Only the fields needed to locate the
 * persisted records are trusted; `code`, `language` and the ids are re-read
 * from MongoDB where possible.
 */
export const submissionCreatedMessageSchema = z.object({
    submissionId: objectIdSchema,
    userId: objectIdSchema,
    problemId: objectIdSchema,
    code: z.string().min(1, "Code is required"),
    language: z.nativeEnum(ELanguage),
    // Present in the published payload but never trusted: the persisted
    // submission's status is the source of truth.
    status: z.unknown().optional(),
});

export type SubmissionCreatedMessage = z.infer<
    typeof submissionCreatedMessageSchema
>;
