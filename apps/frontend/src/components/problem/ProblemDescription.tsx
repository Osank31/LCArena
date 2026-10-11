import React from "react";
import { Clock, Hash, Tag } from "lucide-react";
import { ParsedProblem } from "../../types/problem.types";
import { Badge, DifficultyBadge } from "../common/Badge";

export const ProblemDescription: React.FC<{ problem: ParsedProblem }> = ({
  problem,
}) => {
  return (
    <div className="h-full overflow-y-auto p-5 text-slate-300 text-sm leading-relaxed space-y-6">
      {/* Title & Metadata */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="text-xl font-bold text-slate-100">{problem.title}</h1>
          <DifficultyBadge difficulty={problem.difficulty} />
          <span className="flex items-center gap-1 text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-slate-500" />
            {problem.timeLimit}ms
          </span>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {problem.tags.map((tag) => (
            <Badge key={tag} variant="outline" size="sm" className="text-[11px]">
              <Tag className="w-2.5 h-2.5 text-slate-500" />
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Description Statement */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Problem Description
        </h2>
        <div className="whitespace-pre-line text-slate-300 leading-relaxed font-sans">
          {problem.statement}
        </div>
      </div>

      {/* Examples */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Examples
        </h2>
        {problem.examples.map((ex, index) => (
          <div
            key={index}
            className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3.5 space-y-2 text-xs"
          >
            <div className="font-semibold text-slate-200">Example {index + 1}:</div>
            <div className="font-mono bg-slate-950/80 p-2.5 rounded border border-slate-850 space-y-1">
              <div>
                <span className="text-slate-500 select-none">Input: </span>
                <span className="text-emerald-300">{ex.input}</span>
              </div>
              <div>
                <span className="text-slate-500 select-none">Output: </span>
                <span className="text-cyan-300">{ex.output}</span>
              </div>
            </div>
            {ex.explanation && (
              <div className="text-slate-400 text-xs">
                <span className="font-semibold text-slate-300">Explanation: </span>
                {ex.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Constraints */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Constraints
        </h2>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 bg-slate-900/40 p-3 rounded-lg border border-slate-800/60 font-mono">
          {problem.constraints.map((c, i) => (
            <li key={i} className="leading-normal">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
