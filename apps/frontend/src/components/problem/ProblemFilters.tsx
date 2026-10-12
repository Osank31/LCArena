import React from "react";
import { RotateCcw, Search } from "lucide-react";
import { useEntrance } from "../../animations";
import { Difficulty, ProblemFilterState } from "../../types/problem.types";
import { Button } from "../common/Button";

/** Reset control fades in when filters become active (mount = appearance). */
const ResetFiltersButton: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const ref = useEntrance();
  return (
    <div ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
      >
        Reset
      </Button>
    </div>
  );
};

interface ProblemFiltersProps {
  filters: ProblemFilterState;
  onChange: (filters: Partial<ProblemFilterState>) => void;
  onReset: () => void;
  availableTags: string[];
}

export const ProblemFilters: React.FC<ProblemFiltersProps> = ({
  filters,
  onChange,
  onReset,
  availableTags,
}) => {
  const difficulties: ("All" | Difficulty)[] = ["All", "Easy", "Medium", "Hard"];

  const hasActiveFilters =
    filters.search !== "" ||
    filters.difficulty !== "All" ||
    filters.tag !== "All";

  return (
    <div className="bg-paper-2/50 border border-rule rounded-sm p-4 space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search problems by title, keywords..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="w-full bg-paper border border-rule-2 rounded-sm pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-3/70 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          />
        </div>

        {/* Difficulty Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {difficulties.map((diff) => {
            const isSelected = filters.difficulty === diff;

            return (
              <button
                key={diff}
                onClick={() => onChange({ difficulty: diff, page: 1 })}
                className={`px-3 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wide border transition-colors cursor-pointer select-none shrink-0 ${
                  isSelected
                    ? "bg-ink text-paper border-ink"
                    : "text-ink-2 border-rule hover:bg-paper-2 hover:text-ink"
                }`}
              >
                {diff}
              </button>
            );
          })}
        </div>

        {/* Tag Selector & Reset */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative">
            <select
              value={filters.tag}
              onChange={(e) => onChange({ tag: e.target.value, page: 1 })}
              aria-label="Filter by topic tag"
              className="bg-paper border border-rule-2 rounded-sm px-3 py-2 text-xs text-ink-2 focus:outline-none focus:border-ink cursor-pointer"
            >
              <option value="All">All Topics ({availableTags.length})</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && <ResetFiltersButton onReset={onReset} />}
        </div>
      </div>
    </div>
  );
};
