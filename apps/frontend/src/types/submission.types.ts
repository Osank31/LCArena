export type SupportedLanguage = "cpp" | "py" | "java" | "js";

export interface FailedCases {
  tle: string[];
  re: string[];
  wa: string[];
}

export interface CompileErrorResult {
  status: "COMPILE_ERROR";
  compileError: string;
}

export interface ExecutionSuccessResult {
  status: "SUCCESS";
  passed: number;
  total: number;
  failedCases: FailedCases;
  executionTimeMs: Record<string, number>;
}

export interface PendingResult {
  status: "PENDING";
}

export interface InternalErrorResult {
  status: "INTERNAL_ERROR";
  message: string;
}

export type ExecutionResult =
  | CompileErrorResult
  | ExecutionSuccessResult
  | PendingResult
  | InternalErrorResult;

export interface ISubmission {
  _id: string;
  problemId: string;
  userId: string;
  code: string;
  language: SupportedLanguage;
  status: ExecutionResult;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubmissionPayload {
  problemId: string;
  code: string;
  language: SupportedLanguage;
}

export type VerdictType =
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Runtime Error"
  | "Compilation Error"
  | "Pending"
  | "Internal Error";
