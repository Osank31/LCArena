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
      badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      bgClass: "bg-amber-500/10",
      textClass: "text-amber-400",
      summary: "Judging solution in ephemeral Docker container...",
    };
  }

  if (status.status === "COMPILE_ERROR") {
    return {
      verdict: "Compilation Error",
      badgeClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      bgClass: "bg-rose-500/10",
      textClass: "text-rose-400",
      summary: "Compilation or syntax check failed.",
      details: status.compileError,
    };
  }

  if (status.status === "INTERNAL_ERROR") {
    return {
      verdict: "Internal Error",
      badgeClass: "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20",
      bgClass: "bg-neutral-500/10",
      textClass: "text-neutral-400",
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
        badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        bgClass: "bg-amber-500/10",
        textClass: "text-amber-400",
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
        badgeClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
        bgClass: "bg-rose-500/10",
        textClass: "text-rose-400",
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
        badgeClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
        bgClass: "bg-rose-500/10",
        textClass: "text-rose-400",
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
      badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      bgClass: "bg-emerald-500/10",
      textClass: "text-emerald-400",
      summary: `All ${total} test cases passed!`,
      passedCount: passed,
      totalCount: total,
      timeMs: maxTime,
    };
  }

  return {
    verdict: "Pending",
    badgeClass: "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20",
    bgClass: "bg-neutral-500/10",
    textClass: "text-neutral-400",
    summary: "Status unknown.",
  };
}
