// src/validations/problem.validation.ts
import { z } from "zod";

export const testCaseSchema = z.object({
  input: z.string().min(1, "Input is required"),
  output: z.string().min(1, "Output is required"),
});

export const createProblemSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters"),

  difficulty: z.enum(["Easy", "Medium", "Hard"]),

  editorial: z
    .string()
    .min(10, "Editorial must be at least 10 characters").optional(),

  testCases: z
    .array(testCaseSchema)
    .min(1, "At least one test case is required"),
});

export const updateProblemSchema = createProblemSchema.partial();

export type createProblemType = z.infer<typeof createProblemSchema>;
export type updateProblemType = z.infer<typeof updateProblemSchema>;