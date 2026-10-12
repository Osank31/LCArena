import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Terminal,
  XCircle,
} from "lucide-react";
import { useReveal } from "../../animations";
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

  // Verdict/results surface fades in when execution finishes or the tab
  // changes — never on every polling update, so feedback stays immediate.
  const contentScope = useReveal({
    selector: "[data-output-reveal]",
    stagger: 0.05,
    deps: [activeTab, isEvaluating],
  });

  const verdictInfo = result ? parseVerdict(result) : null;

  const tabs = [
    { id: "result", label: "Verdict & Output" },
    { id: "sample", label: "Sample Testcase" },
  ];

  return (
    <div
      className="h-full flex flex-col bg-paper-2/40 border-t border-rule text-xs text-ink-2"
      data-testid="output-console"
    >
      {/* Console Tab Header */}
      <div className="flex items-center justify-between px-3 border-b border-rule bg-paper-2/60">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          className="border-none"
        />

        {isEvaluating && (
          <div className="flex items-center gap-1.5 text-ink-2 font-mono text-[11px] animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Executing inside Docker...</span>
          </div>
        )}
      </div>

      {/* Console Tab Content */}
      <div ref={contentScope} className="flex-1 overflow-y-auto p-4 font-mono">
        {activeTab === "sample" && (
          <div className="space-y-4">
            <div data-output-reveal>
              <div className="text-ink-3 mb-1 select-none text-[11px]">
                Sample Input:
              </div>
              <pre className="bg-paper p-3 rounded-sm border border-rule text-ink overflow-x-auto">
                {problem.examples[0]?.input || "No sample input"}
              </pre>
            </div>

            <div data-output-reveal>
              <div className="text-ink-3 mb-1 select-none text-[11px]">
                Expected Output:
              </div>
              <pre className="bg-paper p-3 rounded-sm border border-rule text-ink overflow-x-auto">
                {problem.examples[0]?.output || "No sample output"}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "result" && (
          <div>
            {isEvaluating ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <Loader2 className="w-8 h-8 text-ink-3 animate-spin" />
                <div className="text-sm font-serif font-bold text-ink">
                  Running Evaluation
                </div>
                <p className="text-xs text-ink-3 max-w-sm font-serif">
                  Compiling and executing your code against the test suite in an
                  isolated Docker container.
                </p>
              </div>
            ) : runOutput ? (
              <div data-output-reveal className="space-y-3">
                <div className="flex items-center gap-2 font-serif font-bold text-sm text-ink">
                  {runOutput.includes("Compilation Error") ||
                  runOutput.includes("Runtime Error") ? (
                    <XCircle className="w-4 h-4" />
                  ) : runOutput.includes("Wrong Answer") ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    Run Finished{" "}
                    {runOutput.includes("Compilation Error")
                      ? "(Compilation Error)"
                      : runOutput.includes("Runtime Error")
                      ? "(Runtime Error)"
                      : runOutput.includes("Wrong Answer")
                      ? "(Wrong Answer)"
                      : "(All Passed)"}
                  </span>
                </div>
                <pre className="bg-paper p-3 rounded-sm border border-rule text-ink overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                  {runOutput}
                </pre>
              </div>
            ) : verdictInfo ? (
              <div className="space-y-4">
                {/* Verdict Banner */}
                <div
                  data-output-reveal
                  className={`p-4 rounded-sm border flex items-center justify-between gap-4 ${verdictInfo.badgeClass}`}
                >
                  <div className="flex items-center gap-3">
                    {verdictInfo.verdict === "Accepted" ? (
                      <CheckCircle2 className="w-6 h-6 shrink-0" />
                    ) : verdictInfo.verdict === "Compilation Error" ||
                      verdictInfo.verdict === "Runtime Error" ||
                      verdictInfo.verdict === "Wrong Answer" ? (
                      <XCircle className="w-6 h-6 shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 shrink-0" />
                    )}

                    <div>
                      <h3 className="text-base font-serif font-bold tracking-tight">
                        {verdictInfo.verdict}
                      </h3>
                      <p className="text-xs opacity-90">{verdictInfo.summary}</p>
                    </div>
                  </div>

                  {typeof verdictInfo.timeMs === "number" && (
                    <div className="flex items-center gap-1.5 font-mono text-xs bg-paper/60 px-3 py-1.5 rounded-sm border border-rule shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{verdictInfo.timeMs} ms</span>
                    </div>
                  )}
                </div>

                {/* Test case passed counter */}
                {typeof verdictInfo.passedCount === "number" &&
                  typeof verdictInfo.totalCount === "number" && (
                    <div
                      data-output-reveal
                      className="bg-paper p-3 rounded-sm border border-rule flex items-center justify-between"
                    >
                      <span className="text-ink-3 text-xs">
                        Test Cases Passed:
                      </span>
                      <span className="font-bold text-ink">
                        {verdictInfo.passedCount} / {verdictInfo.totalCount}
                      </span>
                    </div>
                  )}

                {/* Compilation / Error Details */}
                {verdictInfo.details && (
                  <div data-output-reveal>
                    <div className="text-ink-2 text-xs mb-1 font-semibold">
                      Diagnostic Output:
                    </div>
                    <pre className="bg-paper text-ink p-3 rounded-sm border border-rule-2 text-xs overflow-x-auto whitespace-pre-wrap">
                      {verdictInfo.details}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-ink-3 gap-2">
                <Terminal className="w-8 h-8 opacity-40" />
                <p className="font-serif">Run code or submit to view execution results.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
