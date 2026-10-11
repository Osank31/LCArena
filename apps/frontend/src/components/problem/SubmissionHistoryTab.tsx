import React, { useState } from "react";
import { Clock, Code, Eye } from "lucide-react";
import { ISubmission } from "../../types/submission.types";
import { parseVerdict } from "../../utils/verdictHelper";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { Modal } from "../common/Modal";

interface SubmissionHistoryTabProps {
  submissions: ISubmission[];
  isLoading?: boolean;
}

export const SubmissionHistoryTab: React.FC<SubmissionHistoryTabProps> = ({
  submissions,
  isLoading = false,
}) => {
  const [selectedSubmission, setSelectedSubmission] = useState<ISubmission | null>(null);

  if (submissions.length === 0 && !isLoading) {
    return (
      <EmptyState
        title="No submissions yet"
        description="Submit your solution using the button above to record your attempts."
        className="m-4"
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3" data-testid="submissions-list">
      <div className="divide-y divide-slate-800">
        {submissions.map((sub) => {
          const info = parseVerdict(sub.status);
          const dateStr = sub.createdAt
            ? new Date(sub.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Just now";

          return (
            <div
              key={sub._id}
              className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/40 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 rounded font-semibold text-xs ${info.badgeClass}`}
                >
                  {info.verdict}
                </span>
                <span className="text-slate-400 uppercase font-mono text-[11px]">
                  {sub.language}
                </span>
                {typeof info.timeMs === "number" && (
                  <span className="text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {info.timeMs}ms
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-[11px] hidden sm:inline">
                  {dateStr}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubmission(sub)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  className="py-1 px-2 text-xs"
                >
                  Inspect
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <Modal
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          title={`Submission Details (${selectedSubmission.language.toUpperCase()})`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Verdict summary */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between ${
                parseVerdict(selectedSubmission.status).badgeClass
              }`}
            >
              <span className="font-bold">
                {parseVerdict(selectedSubmission.status).verdict}
              </span>
              <span className="text-xs">
                {parseVerdict(selectedSubmission.status).summary}
              </span>
            </div>

            {/* Submitted Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-400">
                  Submitted Code:
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ID: {selectedSubmission._id}
                </span>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 text-xs font-mono max-h-72 overflow-y-auto">
                {selectedSubmission.code}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
