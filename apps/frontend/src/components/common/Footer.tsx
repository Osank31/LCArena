import React from "react";
import { Code2 } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/60 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-slate-200">LCArena</span>
          <span className="text-slate-600">•</span>
          <span>Sandboxed Online Judge & Competitive Programming</span>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400">
          <Link to="/problems" className="hover:text-slate-200 transition-colors">
            Problems
          </Link>
          <Link to="/submissions" className="hover:text-slate-200 transition-colors">
            Submissions
          </Link>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Engine Online
          </span>
        </div>
      </div>
    </footer>
  );
};
