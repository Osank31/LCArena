import { ApiResponse } from "../types/auth.types";
import {
  CreateSubmissionPayload,
  ISubmission,
} from "../types/submission.types";
import { apiClient, getStoredToken } from "./apiClient";

export const submissionService = {
  /** Resolve current effective userId from parameter, stored JWT, or anonymous */
  getEffectiveUserId(userId?: string): string {
    if (userId && userId.trim() !== "") return userId;
    try {
      const token = getStoredToken();
      if (token) {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(
            atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
          );
          if (payload.userId) return payload.userId;
          if (payload.id) return payload.id;
        }
      }
    } catch {
      // Fallback
    }
    return "anonymous";
  },

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
      const effectiveUserId =
        submission.userId || submissionService.getEffectiveUserId();
      const submissionWithUser: ISubmission = {
        ...submission,
        userId: effectiveUserId,
      };

      const key = `lcarena_submissions_${effectiveUserId}`;
      const existingRaw = localStorage.getItem(key);
      const existing: ISubmission[] = existingRaw ? JSON.parse(existingRaw) : [];

      const filtered = existing.filter((s) => s._id !== submissionWithUser._id);
      const updated = [submissionWithUser, ...filtered].slice(0, 50); // Keep last 50
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // Storage error fallback
    }
  },

  /** Get local submissions for a specific user */
  getLocalSubmissions(userId?: string): ISubmission[] {
    try {
      const effectiveUserId = submissionService.getEffectiveUserId(userId);
      const key = `lcarena_submissions_${effectiveUserId}`;
      const raw = localStorage.getItem(key);
      let submissions: ISubmission[] = raw ? JSON.parse(raw) : [];

      // If user is authenticated, also check if there are any submissions in anonymous to merge
      if (effectiveUserId !== "anonymous") {
        try {
          const anonRaw = localStorage.getItem("lcarena_submissions_anonymous");
          if (anonRaw) {
            const anonSubs: ISubmission[] = JSON.parse(anonRaw);
            if (anonSubs.length > 0) {
              const existingIds = new Set(submissions.map((s) => s._id));
              const missing = anonSubs.filter((s) => !existingIds.has(s._id));
              if (missing.length > 0) {
                submissions = [...missing, ...submissions].slice(0, 50);
                localStorage.setItem(key, JSON.stringify(submissions));
              }
            }
          }
        } catch {
          // Ignore merge error
        }
      }

      return submissions;
    } catch {
      return [];
    }
  },

  /** Get local submissions for a specific problem */
  getProblemSubmissions(problemId: string, userId?: string): ISubmission[] {
    const all = submissionService.getLocalSubmissions(userId);
    return all.filter((s) => {
      const subProbId =
        typeof s.problemId === "object" && s.problemId !== null
          ? (s.problemId as any)._id || s.problemId
          : s.problemId;
      return String(subProbId) === String(problemId);
    });
  },
};
