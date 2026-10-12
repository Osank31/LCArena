import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, History, RotateCcw } from "lucide-react";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { Modal } from "../components/common/Modal";
import { useReveal } from "../animations";
import { useAuth } from "../context/AuthContext";
import { problemService } from "../services/problemService";
import { submissionService } from "../services/submissionService";
import { ParsedProblem } from "../types/problem.types";
import { ISubmission } from "../types/submission.types";
import { parseVerdict } from "../utils/verdictHelper";

export const SubmissionsPage: React.FC = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ISubmission[]>([]);
  const [problems, setProblems] = useState<ParsedProblem[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ISubmission | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [langFilter, setLangFilter] = useState<string>("All");

  // Quiet editorial entrance for the record masthead and list.
  const pageScope = useReveal({ stagger: 0.055, duration: 0.34 });

  useEffect(() => {
    const effectiveUserId = user?.userId || (user as any)?.id;
    const list = submissionService.getLocalSubmissions(effectiveUserId);
    setSubmissions(list);

    problemService
      .getAllProblems()
      .then((data) => setProblems(data))
      .catch(() => {});
  }, [user]);

  const problemMap = useMemo(() => {
    const map = new Map<string, ParsedProblem>();
    problems.forEach((p) => map.set(p.id, p));
    return map;
  }, [problems]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const verdict = parseVerdict(sub.status).verdict;
      if (statusFilter !== "All" && verdict !== statusFilter) {
        return false;
      }
      if (langFilter !== "All" && sub.language !== langFilter) {
        return false;
      }
      return true;
    });
  }, [submissions, statusFilter, langFilter]);

  return (
    <div
      ref={pageScope}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6"
    >
      {/* Masthead */}
      <div className="border-b-2 border-ink pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div
            data-reveal
            className="text-[11px] font-mono uppercase tracking-[0.25em] text-ink-3 mb-2"
          >
            The Record
          </div>
          <h1
            data-reveal
            className="font-serif text-3xl font-bold text-ink flex items-center gap-2"
          >
            <History className="w-6 h-6 text-ink-3" />
            <span>Submission History</span>
          </h1>
          <p data-reveal className="text-sm text-ink-3 mt-2 leading-relaxed">
            Review your past evaluated code solutions and test verdicts.
          </p>
        </div>

        {/* Filter controls */}
        <div data-reveal className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by verdict status"
            className="bg-paper border border-rule-2 rounded-sm px-3 py-1.5 text-xs text-ink-2 font-mono focus:outline-none focus:border-ink cursor-pointer"
          >
            <option value="All">All Verdicts</option>
            <option value="Accepted">Accepted</option>
            <option value="Wrong Answer">Wrong Answer</option>
            <option value="Time Limit Exceeded">Time Limit Exceeded</option>
            <option value="Runtime Error">Runtime Error</option>
            <option value="Compilation Error">Compilation Error</option>
          </select>

          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            aria-label="Filter by language"
            className="bg-paper border border-rule-2 rounded-sm px-3 py-1.5 text-xs text-ink-2 font-mono focus:outline-none focus:border-ink cursor-pointer"
          >
            <option value="All">All Languages</option>
            <option value="cpp">C++</option>
            <option value="py">Python</option>
            <option value="java">Java</option>
            <option value="js">JavaScript</option>
          </select>

          {(statusFilter !== "All" || langFilter !== "All") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("All");
                setLangFilter("All");
              }}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Submissions List */}
      <div data-reveal className="border border-rule rounded-sm bg-paper-2/20 overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No submissions found"
              description={
                submissions.length === 0
                  ? "You haven't submitted any solutions yet. Head over to the Problems catalog to start coding!"
                  : "No submissions match your selected filter criteria."
              }
              actionText={submissions.length === 0 ? "Browse Problems" : "Clear Filters"}
              onAction={() => {
                if (submissions.length === 0) {
                  window.location.href = "/problems";
                } else {
                  setStatusFilter("All");
                  setLangFilter("All");
                }
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-ink/70 font-mono font-semibold text-ink-2 uppercase tracking-[0.15em] text-[11px]">
                  <th className="py-3 px-4 w-36">Status</th>
                  <th className="py-3 px-4">Problem</th>
                  <th className="py-3 px-4 w-24">Language</th>
                  <th className="py-3 px-4 w-28 text-right hidden sm:table-cell">
                    Time
                  </th>
                  <th className="py-3 px-4 w-36 text-right hidden md:table-cell">
                    Submitted
                  </th>
                  <th className="py-3 px-4 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {filteredSubmissions.map((sub) => {
                  const verdict = parseVerdict(sub.status);
                  const prob = problemMap.get(sub.problemId);
                  const dateStr = sub.createdAt
                    ? new Date(sub.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Just now";

                  return (
                    <tr
                      key={sub._id}
                      className="hover:bg-paper-2/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-sm font-mono uppercase tracking-wide text-xs ${verdict.badgeClass}`}
                        >
                          {verdict.verdict}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-serif font-medium text-ink">
                        <Link
                          to={`/problems/${sub.problemId}`}
                          className="hover:underline underline-offset-4 transition-colors"
                        >
                          {prob?.title || `Problem ${sub.problemId.slice(-4)}`}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 uppercase font-mono text-ink-2">
                        {sub.language}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-ink-3 hidden sm:table-cell">
                        {typeof verdict.timeMs === "number" ? `${verdict.timeMs}ms` : "-"}
                      </td>

                      <td className="py-3.5 px-4 text-right text-ink-3 hidden md:table-cell">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSubmission(sub)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          className="py-1 px-2"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {selectedSubmission && (
        <Modal
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          title={`Submission: ${
            problemMap.get(selectedSubmission.problemId)?.title ||
            `#${selectedSubmission.problemId.slice(-4)}`
          }`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div
              className={`p-3 rounded-sm border flex items-center justify-between ${
                parseVerdict(selectedSubmission.status).badgeClass
              }`}
            >
              <div>
                <span className="font-serif font-bold text-sm block">
                  {parseVerdict(selectedSubmission.status).verdict}
                </span>
                <span className="text-xs">
                  {parseVerdict(selectedSubmission.status).summary}
                </span>
              </div>
              <span className="uppercase font-mono text-xs px-2 py-1 rounded-sm bg-paper/60 border border-rule">
                {selectedSubmission.language}
              </span>
            </div>

            <div>
              <div className="text-xs font-semibold text-ink-2 mb-1.5 flex items-center justify-between">
                <span>Submitted Source Code:</span>
                <span className="font-mono text-ink-3 text-[10px]">
                  ID: {selectedSubmission._id}
                </span>
              </div>
              <pre className="bg-paper p-4 rounded-sm border border-rule text-ink text-xs font-mono max-h-80 overflow-y-auto">
                {selectedSubmission.code}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
