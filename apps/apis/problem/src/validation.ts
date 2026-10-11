import { z } from "zod";

export const createProblemSchema = z.object({

    description: z
        .string()
        .min(10, "Description must be at least 10 characters"),

    difficulty: z.enum(["Easy", "Medium", "Hard"]),

    sampleTestCaseUrl: z
        .string()
        .min(1, "Sample test case URL is required"),

    testCasesUrl: z
        .string()
        .min(1, "Test cases URL is required"),

    time_limit: z
        .number()
        .positive("Time limit must be greater than 0"),
});

export const updateProblemSchema = createProblemSchema.partial();

export type createProblemType = z.infer<typeof createProblemSchema>;
export type updateProblemType = z.infer<typeof updateProblemSchema>;