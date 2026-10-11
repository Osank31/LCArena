import { z } from "zod";

export const MAX_TEST_CASES_PER_PROBLEM = 100;
export const MAX_TEST_CASE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const testCaseItemSchema = z.object({
    input: z.string({ message: "Input is required for test case" }),
    output: z.string({ message: "Output is required for test case" }),
});

export const createProblemSchema = z.preprocess(
    (raw: any) => {
        if (raw && typeof raw === "object") {
            if (
                Array.isArray(raw.testCases) &&
                raw.testCases.length > 0 &&
                !raw.testCasesUrl
            ) {
                return { ...raw, testCasesUrl: "storage://auto" };
            }
        }
        return raw;
    },
    z
        .object({
            description: z
                .string({ message: "Description must be at least 10 characters" })
                .min(10, "Description must be at least 10 characters"),

            difficulty: z.enum(["Easy", "Medium", "Hard"]),

            sampleTestCaseUrl: z
                .string({ message: "Sample test case URL is required" })
                .min(1, "Sample test case URL is required"),

            testCasesUrl: z
                .string({ message: "Test cases URL is required" })
                .min(1, "Test cases URL is required"),

            time_limit: z
                .number({ message: "Time limit must be greater than 0" })
                .positive("Time limit must be greater than 0"),

            testCases: z
                .array(testCaseItemSchema)
                .min(
                    1,
                    "At least one test case must be provided when supplying testCases"
                )
                .max(
                    MAX_TEST_CASES_PER_PROBLEM,
                    `Exceeded maximum test cases (${MAX_TEST_CASES_PER_PROBLEM})`
                )
                .refine(
                    (cases) =>
                        cases.every(
                            (tc) =>
                                Buffer.byteLength(tc.input, "utf-8") <=
                                    MAX_TEST_CASE_SIZE_BYTES &&
                                Buffer.byteLength(tc.output, "utf-8") <=
                                    MAX_TEST_CASE_SIZE_BYTES
                        ),
                    {
                        message: `Individual test case input and output must not exceed ${MAX_TEST_CASE_SIZE_BYTES} bytes`,
                    }
                )
                .optional(),
        })
        .refine(
            (data) =>
                Boolean(data.testCasesUrl) ||
                (Array.isArray(data.testCases) && data.testCases.length > 0),
            {
                message:
                    "Either testCasesUrl or a non-empty testCases array must be provided",
                path: ["testCases"],
            }
        )
);

export const updateProblemSchema = z.object({
    description: z
        .string()
        .min(10, "Description must be at least 10 characters")
        .optional(),
    difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
    sampleTestCaseUrl: z.string().optional(),
    testCasesUrl: z.string().optional(),
    time_limit: z.number().positive().optional(),
    testCases: z
        .array(testCaseItemSchema)
        .min(1)
        .max(MAX_TEST_CASES_PER_PROBLEM)
        .refine(
            (cases) =>
                cases.every(
                    (tc) =>
                        Buffer.byteLength(tc.input, "utf-8") <=
                            MAX_TEST_CASE_SIZE_BYTES &&
                        Buffer.byteLength(tc.output, "utf-8") <=
                            MAX_TEST_CASE_SIZE_BYTES
                ),
            {
                message: `Individual test case input and output must not exceed ${MAX_TEST_CASE_SIZE_BYTES} bytes`,
            }
        )
        .optional(),
});

export type createProblemType = z.infer<typeof createProblemSchema>;
export type updateProblemType = z.infer<typeof updateProblemSchema>;
export type TestCaseItem = z.infer<typeof testCaseItemSchema>;