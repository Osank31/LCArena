import { ApiResponse } from "../types/auth.types";
import { IProblem, ParsedProblem } from "../types/problem.types";
import { parseProblem } from "../utils/problemParser";
import { apiClient } from "./apiClient";

export const problemService = {
  /** Fetch all problems from backend */
  async getAllProblems(): Promise<ParsedProblem[]> {
    const response = await apiClient.get<ApiResponse<IProblem[]>>("/api/problems");
    const rawList = response.data?.data || [];
    return rawList.map(parseProblem);
  },

  /** Fetch a single problem by ID */
  async getProblemById(id: string): Promise<ParsedProblem> {
    const response = await apiClient.get<ApiResponse<IProblem>>(`/api/problems/${id}`);
    const raw = response.data?.data;
    if (!raw) {
      throw new Error("Problem not found");
    }
    return parseProblem(raw);
  },
};
