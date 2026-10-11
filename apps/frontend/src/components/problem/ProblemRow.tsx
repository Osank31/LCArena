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
      className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors group"
      data-testid={`problem-row-${problem.id}`}
    >
      {/* Solved Status */}
      <td className="py-3.5 px-4 w-12 text-center">
        {isSolved ? (
          <CheckCircle2
            className="w-4 h-4 text-emerald-400 inline"
            aria-label="Solved"
            data-testid="solved-icon"
          />
        ) : (
          <Circle
            className="w-3.5 h-3.5 text-slate-700 inline"
            aria-label="Unsolved"
          />
        )}
      </td>

      {/* Title & Index */}
      <td className="py-3.5 px-4">
        <div className="flex flex-col">
          <Link
            to={`/problems/${problem.id}`}
            className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors flex items-center gap-2"
          >
            <span className="text-slate-500 font-mono text-xs w-6">{index}.</span>
            <span>{problem.title}</span>
          </Link>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-1.5 ml-6">
            {problem.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" size="sm" className="text-[10px] py-0 px-1.5">
                {tag}
              </Badge>
            ))}
            {problem.tags.length > 3 && (
              <span className="text-[10px] text-slate-500">
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
        <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-slate-500" />
          {(problem.timeLimit / 1000).toFixed(1)}s
        </span>
      </td>
    </tr>
  );
};
