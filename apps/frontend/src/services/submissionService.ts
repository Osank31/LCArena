import { ApiResponse } from "../types/auth.types";
import {
  CreateSubmissionPayload,
  ISubmission,
} from "../types/submission.types";
import { apiClient } from "./apiClient";

export const submissionService = {
  /** Submit code for evaluation */
  async createSubmission(payload: CreateSubmissionPayload): Promise<ISubmission> {
    const response = await apiClient.post<ApiResponse<ISubmission>>(
      "/api/submissions",
      payload
    );
    const submission = response.data?.data;
    if (submission) {
      submissionService.recordLocalSubmission(submission);
    }
    return submission;
  },

  /** Fetch status and execution details of a submission */
  async getSubmission(submissionId: string): Promise<ISubmission> {
    const response = await apiClient.get<ApiResponse<ISubmission>>(
      `/api/submissions/${submissionId}`
    );
    return response.data?.data;
  },

  /** Poll submission until status is no longer PENDING */
  async pollVerdict(
    submissionId: string,
    onProgress?: (submission: ISubmission) => void,
    maxAttempts = 20,
    intervalMs = 1500
  ): Promise<ISubmission> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      const submission = await submissionService.getSubmission(submissionId);

      onProgress?.(submission);

      if (submission.status && submission.status.status !== "PENDING") {
        submissionService.recordLocalSubmission(submission);
        return submission;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    // Return the latest submission even if still pending
    return submissionService.getSubmission(submissionId);
  },

  /** Record submission in local history for problem/user views */
  recordLocalSubmission(submission: ISubmission): void {
    try {
      const key = `lcarena_submissions_${submission.userId || "anonymous"}`;
      const existingRaw = localStorage.getItem(key);
      const existing: ISubmission[] = existingRaw ? JSON.parse(existingRaw) : [];

      const filtered = existing.filter((s) => s._id !== submission._id);
      const updated = [submission, ...filtered].slice(0, 50); // Keep last 50
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // Storage error fallback
    }
  },

  /** Get local submissions for a specific user */
  getLocalSubmissions(userId?: string): ISubmission[] {
    try {
      const key = `lcarena_submissions_${userId || "anonymous"}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /** Get local submissions for a specific problem */
  getProblemSubmissions(problemId: string, userId?: string): ISubmission[] {
    const all = submissionService.getLocalSubmissions(userId);
    return all.filter((s) => s.problemId === problemId);
  },
};
