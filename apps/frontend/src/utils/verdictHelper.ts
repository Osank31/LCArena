import { ExecutionResult, VerdictType } from "../types/submission.types";

export interface VerdictInfo {
  verdict: VerdictType;
  badgeClass: string;
  bgClass: string;
  textClass: string;
  summary: string;
  passedCount?: number;
  totalCount?: number;
  timeMs?: number;
  details?: string;
}

export function parseVerdict(status?: ExecutionResult): VerdictInfo {
  if (!status || status.status === "PENDING") {
    return {
      verdict: "Pending",
      badgeClass: "bg-transparent text-ink-3 border border-dashed border-rule-2",
      bgClass: "bg-transparent",
      textClass: "text-ink-3",
      summary: "Judging solution in ephemeral Docker container...",
    };
  }

  if (status.status === "COMPILE_ERROR") {
    return {
      verdict: "Compilation Error",
      badgeClass: "bg-paper-2 text-ink border-2 border-ink",
      bgClass: "bg-paper-2",
      textClass: "text-ink",
      summary: "Compilation or syntax check failed.",
      details: status.compileError,
    };
  }

  if (status.status === "INTERNAL_ERROR") {
    return {
      verdict: "Internal Error",
      badgeClass: "bg-paper-2 text-ink-3 border border-rule",
      bgClass: "bg-paper-2",
      textClass: "text-ink-3",
      summary: status.message || "An internal error occurred during execution.",
    };
  }

  if (status.status === "SUCCESS") {
    const { passed, total, failedCases, executionTimeMs } = status;
    const times = Object.values(executionTimeMs || {});
    const maxTime = times.length > 0 ? Math.max(...times) : 0;

    if (failedCases.tle && failedCases.tle.length > 0) {
      return {
        verdict: "Time Limit Exceeded",
        badgeClass: "bg-transparent text-ink border border-dashed border-ink-3",
        bgClass: "bg-transparent",
        textClass: "text-ink",
        summary: `Time limit exceeded on test case ${failedCases.tle[0]}`,
        passedCount: passed,
        totalCount: total,
        timeMs: maxTime,
        details: `Failed case: ${failedCases.tle[0]}`,
      };
    }

    if (failedCases.re && failedCases.re.length > 0) {
      return {
        verdict: "Runtime Error",
        badgeClass: "bg-paper-2 text-ink border-2 border-ink",
        bgClass: "bg-paper-2",
        textClass: "text-ink",
        summary: `Runtime error on test case ${failedCases.re[0]}`,
        passedCount: passed,
        totalCount: total,
        timeMs: maxTime,
        details: `Failed case: ${failedCases.re[0]}`,
      };
    }

    if (failedCases.wa && failedCases.wa.length > 0) {
      return {
        verdict: "Wrong Answer",
        badgeClass: "bg-paper-2 text-ink border-2 border-ink",
        bgClass: "bg-paper-2",
        textClass: "text-ink",
        summary: `Wrong answer on test case ${failedCases.wa[0]}`,
        passedCount: passed,
        totalCount: total,
        timeMs: maxTime,
        details: `Failed case: ${failedCases.wa[0]}`,
      };
    }

    // All passed!
    return {
      verdict: "Accepted",
      badgeClass: "bg-ink text-paper border border-ink",
      bgClass: "bg-ink",
      textClass: "text-paper",
      summary: `All ${total} test cases passed!`,
      passedCount: passed,
      totalCount: total,
      timeMs: maxTime,
    };
  }

  return {
    verdict: "Pending",
    badgeClass: "bg-paper-2 text-ink-3 border border-rule",
    bgClass: "bg-paper-2",
    textClass: "text-ink-3",
    summary: "Status unknown.",
  };
}
