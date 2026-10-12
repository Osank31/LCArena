import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { ParsedProblem } from "../../types/problem.types";
import { Badge, DifficultyBadge } from "../common/Badge";

interface ProblemRowProps {
  problem: ParsedProblem;
  index: number;
  isSolved?: boolean;
}

export const ProblemRow: React.FC<ProblemRowProps> = ({
  problem,
  index,
  isSolved = false,
}) => {
  return (
    <tr
      className="border-b border-rule hover:bg-paper-2/70 transition-colors group"
      data-testid={`problem-row-${problem.id}`}
    >
      {/* Solved Status */}
      <td className="py-3.5 px-4 w-12 text-center">
        {isSolved ? (
          <CheckCircle2
            className="w-4 h-4 text-ink inline"
            aria-label="Solved"
            data-testid="solved-icon"
          />
        ) : (
          <Circle
            className="w-3.5 h-3.5 text-rule-2 inline"
            aria-label="Unsolved"
          />
        )}
      </td>

      {/* Title & Index */}
      <td className="py-3.5 px-4">
        <div className="flex flex-col">
          <Link
            to={`/problems/${problem.id}`}
            className="text-[15px] font-serif font-medium text-ink flex items-center gap-2"
          >
            <span className="text-ink-3 font-mono text-xs w-6">{index}.</span>
            <span className="relative after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-200 group-hover:after:scale-x-100">
              {problem.title}
            </span>
          </Link>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-1.5 ml-6">
            {problem.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" size="sm" className="text-[10px] py-0 px-1.5">
                {tag}
              </Badge>
            ))}
            {problem.tags.length > 3 && (
              <span className="text-[10px] text-ink-3">
                +{problem.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Difficulty */}
      <td className="py-3.5 px-4 w-28 text-center">
        <DifficultyBadge difficulty={problem.difficulty} size="sm" />
      </td>

      {/* Time Limit */}
      <td className="py-3.5 px-4 w-28 text-right hidden sm:table-cell">
        <span className="inline-flex items-center gap-1 text-xs text-ink-3 font-mono">
          <Clock className="w-3 h-3 text-ink-3" />
          {(problem.timeLimit / 1000).toFixed(1)}s
        </span>
      </td>
    </tr>
  );
};
