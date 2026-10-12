import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { TableSkeleton } from "../components/common/Skeleton";
import { ProblemFilters } from "../components/problem/ProblemFilters";
import { ProblemRow } from "../components/problem/ProblemRow";
import { DeveloperApologyBanner } from "../components/common/DeveloperApologyBanner";
import { useReveal } from "../animations";
import { useAuth } from "../context/AuthContext";
import { problemService } from "../services/problemService";
import { submissionService } from "../services/submissionService";
import { ParsedProblem, ProblemFilterState } from "../types/problem.types";

const INITIAL_FILTERS: ProblemFilterState = {
  search: "",
  difficulty: "All",
  tag: "All",
  sortBy: "id",
  sortOrder: "asc",
  page: 1,
  pageSize: 20,
};

export const ProblemsPage: React.FC = () => {
  const { user } = useAuth();
  const [problems, setProblems] = useState<ParsedProblem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProblemFilterState>(INITIAL_FILTERS);

  // Editorial entrance for the masthead, summary and filter bar. Runs once on
  // load only, so filtering, searching and pagination never replay it.
  const pageScope = useReveal({ stagger: 0.06, duration: 0.34 });

  // Problem rows are revealed in small batches: the visible first rows animate
  // immediately, later rows as they scroll into view. Keyed on the initial
  // load so filter/search/pagination updates apply instantly.
  const rowsScope = useReveal({
    selector: "tbody tr",
    batch: true,
    immediate: 10,
    stagger: 0.035,
    deps: [isLoading],
  });

  const fetchProblems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await problemService.getAllProblems();
      setProblems(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load problems. Please check your connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  // Compute set of solved problem IDs
  const solvedProblemIds = useMemo(() => {
    const effectiveUserId = user?.userId || (user as any)?.id;
    const submissions = submissionService.getLocalSubmissions(effectiveUserId);
    const set = new Set<string>();
    for (const sub of submissions) {
      if (
        sub.status &&
        sub.status.status === "SUCCESS" &&
        sub.status.passed === sub.status.total &&
        sub.status.total > 0
      ) {
        set.add(sub.problemId);
      }
    }
    return set;
  }, [user]);

  // Extract all unique tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    problems.forEach((p) => p.tags.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [problems]);

  // Filter and sort
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesTag = p.tags.some((t: string) => t.toLowerCase().includes(query));
        const matchesSlug = p.slug.toLowerCase().includes(query);
        if (!matchesTitle && !matchesTag && !matchesSlug) return false;
      }

      // Difficulty
      if (filters.difficulty !== "All" && p.difficulty !== filters.difficulty) {
        return false;
      }

      // Tag
      if (filters.tag !== "All" && !p.tags.includes(filters.tag)) {
        return false;
      }

      return true;
    });
  }, [problems, filters]);

  // Pagination calculation
  const totalItems = filteredProblems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
  const currentPage = Math.min(filters.page, totalPages);

  const paginatedProblems = useMemo(() => {
    const start = (currentPage - 1) * filters.pageSize;
    return filteredProblems.slice(start, start + filters.pageSize);
  }, [filteredProblems, currentPage, filters.pageSize]);

  // Counts for summary
  const easyCount = problems.filter((p) => p.difficulty === "Easy").length;
  const medCount = problems.filter((p) => p.difficulty === "Medium").length;
  const hardCount = problems.filter((p) => p.difficulty === "Hard").length;

  return (
    <div
      ref={pageScope}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6"
    >
      {/* Masthead / Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-ink pb-5">
        <div className="max-w-xl">
          <div
            data-reveal
            className="text-[11px] font-mono uppercase tracking-[0.25em] text-ink-3 mb-2"
          >
            The Index
          </div>
          <h1 data-reveal className="font-serif text-3xl font-bold text-ink">
            Problems Catalog
          </h1>
          <p data-reveal className="text-sm text-ink-3 mt-2 leading-relaxed">
            Browse and solve algorithmic challenges across all difficulty tiers.
          </p>
        </div>

        <div
          data-reveal
          className="flex flex-wrap items-center gap-3 text-xs bg-paper-2/60 border border-rule px-4 py-2 rounded-sm font-mono"
        >
          <div className="flex items-center gap-1.5 text-ink-2">
            <span className="font-semibold text-ink">{problems.length}</span>
            <span>Total</span>
          </div>
          <span className="text-rule-2">•</span>
          <div className="text-ink-3">
            <span className="font-semibold text-ink">{easyCount}</span> Easy
          </div>
          <span className="text-rule-2">•</span>
          <div className="text-ink-3">
            <span className="font-semibold text-ink">{medCount}</span> Med
          </div>
          <span className="text-rule-2">•</span>
          <div className="text-ink-3">
            <span className="font-semibold text-ink">{hardCount}</span> Hard
          </div>
          {solvedProblemIds.size > 0 && (
            <>
              <span className="text-rule-2">•</span>
              <div className="text-ink flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span className="font-semibold">{solvedProblemIds.size}</span> Solved
              </div>
            </>
          )}
        </div>
      </div>

      {/* Developer Apology / Demo Mode Notice */}
      <DeveloperApologyBanner />

      {/* Filter Controls */}
      <div data-reveal>
        <ProblemFilters
          filters={filters}
          onChange={(partial) => setFilters((prev: ProblemFilterState) => ({ ...prev, ...partial }))}
          onReset={() => setFilters(INITIAL_FILTERS)}
          availableTags={availableTags}
        />
      </div>

      {/* Error Notice */}
      {error && (
        <Alert
          type="error"
          title="Loading Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Problems Table View */}
      <div
        ref={rowsScope}
        className="border border-rule rounded-sm bg-paper-2/20 overflow-hidden"
      >
        {isLoading ? (
          <TableSkeleton rows={10} />
        ) : paginatedProblems.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No problems found"
              description="No problems match your current search and filter criteria. Try adjusting your query or resetting filters."
              actionText="Reset All Filters"
              onAction={() => setFilters(INITIAL_FILTERS)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-ink/70 text-[11px] font-mono font-semibold text-ink-2 uppercase tracking-[0.15em]">
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4 w-28 text-center">Difficulty</th>
                  <th className="py-3 px-4 w-28 text-right hidden sm:table-cell">
                    Time Limit
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProblems.map((problem, i) => {
                  const globalIndex =
                    (currentPage - 1) * filters.pageSize + i + 1;
                  return (
                    <ProblemRow
                      key={problem.id}
                      problem={problem}
                      index={globalIndex}
                      isSolved={solvedProblemIds.has(problem.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && totalPages > 1 && (
          <div className="px-4 py-3 bg-paper-2/60 border-t border-rule flex items-center justify-between text-xs text-ink-3 font-mono">
            <div>
              Showing{" "}
              <span className="font-semibold text-ink">
                {(currentPage - 1) * filters.pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-ink">
                {Math.min(currentPage * filters.pageSize, totalItems)}
              </span>{" "}
              of <span className="font-semibold text-ink">{totalItems}</span> problems
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() =>
                  setFilters((prev: ProblemFilterState) => ({ ...prev, page: prev.page - 1 }))
                }
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                aria-label="Previous Page"
              >
                Prev
              </Button>

              <span className="px-2 font-mono text-ink-2">
                {currentPage} / {totalPages}
              </span>

              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setFilters((prev: ProblemFilterState) => ({ ...prev, page: prev.page + 1 }))
                }
                rightIcon={<ChevronRight className="w-4 h-4" />}
                aria-label="Next Page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
