import { ApiResponse } from "../types/auth.types";
import { IProblem, ParsedProblem } from "../types/problem.types";
import { parseProblem } from "../utils/problemParser";
import { getSampleProblemById, getSampleProblems } from "../data/sampleProblems";
import { apiClient } from "./apiClient";

export const problemService = {
  /**
   * Fetch all problems. In frontend demo mode, returns local static sample
   * problems without making any network requests.
   */
  async getAllProblems(): Promise<ParsedProblem[]> {
    return getSampleProblems();
  },

  /**
   * Fetch a single problem by ID or slug from local static sample problems.
   */
  async getProblemById(id: string): Promise<ParsedProblem> {
    const found = getSampleProblemById(id);
    if (found) {
      return found;
    }
    throw new Error("Problem not found");
  },

  /**
   * Preserved remote fetcher: fetch all problems from backend API.
   * Can be used when the backend judge is deployed.
   */
  async fetchRemoteProblems(): Promise<ParsedProblem[]> {
    const response = await apiClient.get<ApiResponse<IProblem[]>>("/api/problems");
    const rawList = response.data?.data || [];
    return rawList.map(parseProblem);
  },

  /**
   * Preserved remote fetcher: fetch a single problem by ID from backend API.
   * Can be used when the backend judge is deployed.
   */
  async fetchRemoteProblemById(id: string): Promise<ParsedProblem> {
    const response = await apiClient.get<ApiResponse<IProblem>>(`/api/problems/${id}`);
    const raw = response.data?.data;
    if (!raw) {
      throw new Error("Problem not found");
    }
    return parseProblem(raw);
  },
};
