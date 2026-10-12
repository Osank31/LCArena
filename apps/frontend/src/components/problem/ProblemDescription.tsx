import React from "react";
import { Clock, Hash, Tag } from "lucide-react";
import { useReveal } from "../../animations";
import { ParsedProblem } from "../../types/problem.types";
import { Badge, DifficultyBadge } from "../common/Badge";

export const ProblemDescription: React.FC<{ problem: ParsedProblem }> = ({
  problem,
}) => {
  // Quiet mount reveal of the statement. Deliberately no ScrollTrigger here:
  // the statement lives in its own scroll container and text must never move
  // while it is being read.
  const scope = useReveal<HTMLElement>({ stagger: 0.05, duration: 0.3 });

  return (
    <article
      ref={scope}
      className="h-full overflow-y-auto px-6 py-7 text-ink text-sm leading-relaxed space-y-7 max-w-3xl mx-auto"
    >
      {/* Title & Metadata */}
      <header data-reveal>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="font-serif text-2xl font-bold text-ink leading-snug">
            {problem.title}
          </h1>
          <DifficultyBadge difficulty={problem.difficulty} />
          <span className="flex items-center gap-1 text-xs text-ink-3 font-mono border border-rule px-2 py-0.5 rounded-sm">
            <Clock className="w-3 h-3 text-ink-3" />
            {problem.timeLimit}ms
          </span>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {problem.tags.map((tag) => (
            <Badge key={tag} variant="outline" size="sm" className="text-[11px]">
              <Tag className="w-2.5 h-2.5 text-ink-3" />
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      <hr data-reveal className="border-rule" />

      {/* Description Statement */}
      <section data-reveal className="space-y-3">
        <h2 className="font-serif text-sm font-bold uppercase tracking-[0.18em] text-ink-2">
          Problem Description
        </h2>
        <div className="whitespace-pre-line text-ink-2 leading-loose text-[15px]">
          {problem.statement}
        </div>
      </section>

      {/* Examples */}
      <section data-reveal className="space-y-4">
        <h2 className="font-serif text-sm font-bold uppercase tracking-[0.18em] text-ink-2">
          Examples
        </h2>
        {problem.examples.map((ex, index) => (
          <div
            key={index}
            className="bg-paper-2/60 border border-rule rounded-sm p-4 space-y-2.5 text-xs"
          >
            <div className="font-serif font-bold text-ink text-sm">
              Example {index + 1}
            </div>
            <div className="font-mono bg-paper p-3 rounded-sm border border-rule space-y-1">
              <div>
                <span className="text-ink-3 select-none">Input: </span>
                <span className="text-ink">{ex.input}</span>
              </div>
              <div>
                <span className="text-ink-3 select-none">Output: </span>
                <span className="text-ink">{ex.output}</span>
              </div>
            </div>
            {ex.explanation && (
              <div className="text-ink-3 text-xs leading-relaxed">
                <span className="font-semibold text-ink-2">Explanation: </span>
                {ex.explanation}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Constraints */}
      <section data-reveal className="space-y-2">
        <h2 className="font-serif text-sm font-bold uppercase tracking-[0.18em] text-ink-2">
          Constraints
        </h2>
        <ul className="list-disc list-inside space-y-1 text-xs text-ink-2 bg-paper-2/50 p-3.5 rounded-sm border border-rule font-mono">
          {problem.constraints.map((c, i) => (
            <li key={i} className="leading-relaxed">
              {c}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
};
