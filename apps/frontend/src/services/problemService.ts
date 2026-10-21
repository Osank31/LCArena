import { ApiResponse } from "../types/auth.types";
import { IProblem, ParsedProblem } from "../types/problem.types";
import { parseProblem } from "../utils/problemParser";
import { getSampleProblemById, getSampleProblems } from "../data/sampleProblems";
import { apiClient } from "./apiClient";
import { backendStatus, isConnectivityError } from "./backendStatus";

/** Concurrent catalog callers (StrictMode mounts, retries) share one request. */
let inFlightCatalog: Promise<ParsedProblem[]> | null = null;

export const problemService = {
  /**
   * Fetch all problems from the live backend. When the backend cannot be
   * reached (hosted frontend demo), fall back to the bundled sample problems
   * so the catalog stays explorable.
   */
  async getAllProblems(): Promise<ParsedProblem[]> {
    if (inFlightCatalog) return inFlightCatalog;

    const request = (async () => {
      if (await backendStatus.ensureChecked()) {
        try {
          return await problemService.fetchRemoteProblems();
        } catch (error) {
          if (!isConnectivityError(error)) throw error;
          backendStatus.markOffline();
        }
      }

      return getSampleProblems();
    })();

    inFlightCatalog = request;
    try {
      return await request;
    } finally {
      inFlightCatalog = null;
    }
  },

  /**
   * Fetch a single problem from the live backend, falling back to the bundled
   * sample problems (by id or slug) when offline.
   */
  async getProblemById(id: string): Promise<ParsedProblem> {
    if (await backendStatus.ensureChecked()) {
      try {
        return await problemService.fetchRemoteProblemById(id);
      } catch (error) {
        if (isConnectivityError(error)) {
          backendStatus.markOffline();
        } else if (!getSampleProblemById(id)) {
          // Server responded but has no such problem: surface the real error.
          throw error;
        }
      }
    }

    const found = getSampleProblemById(id);
    if (found) {
      return found;
    }
    throw new Error("Problem not found");
  },

  /**
   * Fetch all problems from backend API.
   */
  async fetchRemoteProblems(): Promise<ParsedProblem[]> {
    const response = await apiClient.get<ApiResponse<IProblem[]>>("/api/problems");
    const rawList = response.data?.data || [];
    return rawList.map(parseProblem);
  },

  /**
   * Fetch a single problem by ID from backend API.
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
