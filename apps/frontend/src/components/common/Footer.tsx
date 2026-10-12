import React from "react";
import { Code2 } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-rule bg-paper-2/50 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-ink-3 text-xs font-mono">
          <div className="w-6 h-6 rounded-sm border border-ink text-ink flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif font-bold text-ink text-sm">LCArena</span>
          <span className="text-rule-2">•</span>
          <span>Sandboxed Online Judge & Competitive Programming</span>
        </div>

        <div className="flex items-center gap-6 text-xs text-ink-3 font-mono">
          <Link to="/problems" className="hover:text-ink underline-offset-4 hover:underline transition-colors">
            Problems
          </Link>
          <Link to="/submissions" className="hover:text-ink underline-offset-4 hover:underline transition-colors">
            Submissions
          </Link>
          <span className="flex items-center gap-1.5 text-ink-3">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-3 animate-pulse" />
            Engine Online
          </span>
        </div>
      </div>
    </footer>
  );
};
