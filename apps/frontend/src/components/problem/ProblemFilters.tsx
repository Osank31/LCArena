import React from "react";
import { Filter, RotateCcw, Search } from "lucide-react";
import { Difficulty, ProblemFilterState } from "../../types/problem.types";
import { Button } from "../common/Button";

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
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search problems by title, keywords..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Difficulty Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {difficulties.map((diff) => {
            const isSelected = filters.difficulty === diff;
            const colorClass =
              diff === "Easy"
                ? isSelected
                  ? "bg-emerald-600 text-white"
                  : "text-emerald-400 hover:bg-emerald-500/10"
                : diff === "Medium"
                ? isSelected
                  ? "bg-amber-600 text-white"
                  : "text-amber-400 hover:bg-amber-500/10"
                : diff === "Hard"
                ? isSelected
                  ? "bg-rose-600 text-white"
                  : "text-rose-400 hover:bg-rose-500/10"
                : isSelected
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800";

            return (
              <button
                key={diff}
                onClick={() => onChange({ difficulty: diff, page: 1 })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer select-none shrink-0 ${
                  isSelected ? "border-transparent shadow-sm" : "border-slate-800 bg-slate-950/60"
                } ${colorClass}`}
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
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All">All Topics ({availableTags.length})</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-slate-400 hover:text-slate-200"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
