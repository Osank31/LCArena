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
    <header className="h-12 border-b border-rule bg-paper-2/70 px-3 flex items-center justify-between gap-2 shrink-0 select-none">
      {/* Left: Back & Problem Info */}
      <div className="flex items-center gap-2 overflow-hidden">
        <Link
          to="/problems"
          className="flex items-center gap-1 text-xs text-ink-3 hover:text-ink p-1 rounded-sm hover:bg-paper-3 transition-colors shrink-0 font-mono"
          title="Back to problems"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Problems</span>
        </Link>
        <span className="text-rule-2 hidden sm:inline">/</span>
        <h1 className="text-xs sm:text-sm font-serif font-bold text-ink truncate">
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
          className="bg-paper border border-rule-2 rounded-sm px-2.5 py-1 text-xs text-ink-2 font-mono focus:outline-none focus:border-ink cursor-pointer"
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
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-3 rounded-sm transition active:scale-90 cursor-pointer"
          title="Reset to default code template"
          aria-label="Reset code template"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* AI Copilot Toggle */}
        <button
          onClick={onToggleAi}
          className={`flex items-center gap-1 px-2 py-1 rounded-sm text-xs transition active:scale-95 cursor-pointer border font-mono uppercase tracking-wide ${
            aiEnabled
              ? "bg-ink text-paper border-ink"
              : "bg-paper text-ink-3 border-rule-2 hover:text-ink"
          }`}
          title="Toggle AI Code Copilot Suggestions"
          aria-pressed={aiEnabled}
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden lg:inline text-[11px]">AI Copilot</span>
        </button>

        {/* Run Button */}
        <Button
          variant="outline"
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
          variant="primary"
          size="sm"
          onClick={onSubmit}
          isLoading={isEvaluating}
          leftIcon={<Send className="w-3.5 h-3.5" />}
          className="text-xs py-1 px-3"
        >
          Submit
        </Button>
      </div>
    </header>
  );
};
