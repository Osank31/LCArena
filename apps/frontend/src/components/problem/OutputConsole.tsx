import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Terminal,
  XCircle,
} from "lucide-react";
import { ParsedProblem } from "../../types/problem.types";
import { ExecutionResult } from "../../types/submission.types";
import { parseVerdict } from "../../utils/verdictHelper";
import { Tabs } from "../common/Tabs";

interface OutputConsoleProps {
  problem: ParsedProblem;
  result?: ExecutionResult | null;
  isEvaluating?: boolean;
  runOutput?: string | null;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({
  problem,
  result,
  isEvaluating = false,
  runOutput = null,
}) => {
  const [activeTab, setActiveTab] = useState<string>("result");

  const verdictInfo = result ? parseVerdict(result) : null;

  const tabs = [
    { id: "result", label: "Verdict & Output" },
    { id: "sample", label: "Sample Testcase" },
  ];

  return (
    <div
      className="h-full flex flex-col bg-slate-950 border-t border-slate-800 text-xs text-slate-300"
      data-testid="output-console"
    >
      {/* Console Tab Header */}
      <div className="flex items-center justify-between px-3 border-b border-slate-850 bg-slate-900/50">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          className="border-none"
        />

        {isEvaluating && (
          <div className="flex items-center gap-1.5 text-blue-400 font-mono text-[11px] animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Executing inside Docker...</span>
          </div>
        )}
      </div>

      {/* Console Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 font-mono">
        {activeTab === "sample" && (
          <div className="space-y-4">
            <div>
              <div className="text-slate-500 mb-1 select-none text-[11px]">
                Sample Input:
              </div>
              <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-200 overflow-x-auto">
                {problem.examples[0]?.input || "No sample input"}
              </pre>
            </div>

            <div>
              <div className="text-slate-500 mb-1 select-none text-[11px]">
                Expected Output:
              </div>
              <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-cyan-300 overflow-x-auto">
                {problem.examples[0]?.output || "No sample output"}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "result" && (
          <div>
            {isEvaluating ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <div className="text-sm font-semibold text-slate-200">
                  Running Evaluation
                </div>
                <p className="text-xs text-slate-500 max-w-sm">
                  Compiling and executing your code against the test suite in an
                  isolated Docker container.
                </p>
              </div>
            ) : runOutput ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Run Finished</span>
                </div>
                <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre-wrap">
                  {runOutput}
                </pre>
              </div>
            ) : verdictInfo ? (
              <div className="space-y-4">
                {/* Verdict Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${verdictInfo.badgeClass}`}
                >
                  <div className="flex items-center gap-3">
                    {verdictInfo.verdict === "Accepted" ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : verdictInfo.verdict === "Compilation Error" ||
                      verdictInfo.verdict === "Runtime Error" ||
                      verdictInfo.verdict === "Wrong Answer" ? (
                      <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
                    )}

                    <div>
                      <h3 className="text-base font-bold tracking-tight">
                        {verdictInfo.verdict}
                      </h3>
                      <p className="text-xs opacity-90">{verdictInfo.summary}</p>
                    </div>
                  </div>

                  {typeof verdictInfo.timeMs === "number" && (
                    <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-950/60 px-3 py-1.5 rounded-lg border border-current/20 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{verdictInfo.timeMs} ms</span>
                    </div>
                  )}
                </div>

                {/* Test case passed counter */}
                {typeof verdictInfo.passedCount === "number" &&
                  typeof verdictInfo.totalCount === "number" && (
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400 text-xs">
                        Test Cases Passed:
                      </span>
                      <span className="font-bold text-slate-100">
                        {verdictInfo.passedCount} / {verdictInfo.totalCount}
                      </span>
                    </div>
                  )}

                {/* Compilation / Error Details */}
                {verdictInfo.details && (
                  <div>
                    <div className="text-slate-400 text-xs mb-1 font-semibold">
                      Diagnostic Output:
                    </div>
                    <pre className="bg-slate-900/90 text-rose-300 p-3 rounded-lg border border-rose-900/40 text-xs overflow-x-auto whitespace-pre-wrap">
                      {verdictInfo.details}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2">
                <Terminal className="w-8 h-8 opacity-40" />
                <p>Run code or submit to view execution results.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
