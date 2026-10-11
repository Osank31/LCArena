import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Play,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { ParsedProblem } from "../../types/problem.types";
import { SupportedLanguage } from "../../types/submission.types";
import { LANGUAGE_OPTIONS } from "../../utils/starterCode";
import { DifficultyBadge } from "../common/Badge";
import { Button } from "../common/Button";

interface WorkspaceHeaderProps {
  problem: ParsedProblem;
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onRun: () => void;
  onSubmit: () => void;
  onReset: () => void;
  isEvaluating: boolean;
  aiEnabled: boolean;
  onToggleAi: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  problem,
  selectedLanguage,
  onLanguageChange,
  onRun,
  onSubmit,
  onReset,
  isEvaluating,
  aiEnabled,
  onToggleAi,
}) => {
  return (
    <header className="h-12 border-b border-slate-800 bg-slate-950 px-3 flex items-center justify-between gap-2 shrink-0 select-none">
      {/* Left: Back & Problem Info */}
      <div className="flex items-center gap-2 overflow-hidden">
        <Link
          to="/problems"
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors shrink-0"
          title="Back to problems"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Problems</span>
        </Link>
        <span className="text-slate-700 hidden sm:inline">/</span>
        <h1 className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
          {problem.title}
        </h1>
        <DifficultyBadge
          difficulty={problem.difficulty}
          size="sm"
          className="hidden md:inline-flex shrink-0 text-[10px]"
        />
      </div>

      {/* Middle/Right: Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Language selector */}
        <select
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
          aria-label="Select programming language"
          className="bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Reset Code */}
        <button
          onClick={onReset}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Reset to default code template"
          aria-label="Reset code template"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* AI Copilot Toggle */}
        <button
          onClick={onToggleAi}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer border ${
            aiEnabled
              ? "bg-purple-900/30 text-purple-300 border-purple-500/40"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
          }`}
          title="Toggle AI Code Copilot Suggestions"
          aria-pressed={aiEnabled}
        >
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span className="hidden lg:inline text-[11px]">AI Copilot</span>
        </button>

        {/* Run Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onRun}
          disabled={isEvaluating}
          leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
          className="text-xs py-1 px-3"
        >
          Run
        </Button>

        {/* Submit Button */}
        <Button
          variant="success"
          size="sm"
          onClick={onSubmit}
          isLoading={isEvaluating}
          leftIcon={<Send className="w-3.5 h-3.5" />}
          className="text-xs py-1 px-3 shadow-md shadow-emerald-950"
        >
          Submit
        </Button>
      </div>
    </header>
  );
};
