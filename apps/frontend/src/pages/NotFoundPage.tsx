import React from "react";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "../components/common/Button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-100 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-slate-200 mb-2">
        Page Not Found
      </h2>
      <p className="text-sm text-slate-400 max-w-sm mb-6">
        The challenge or route you are looking for does not exist or may have been relocated.
      </p>
      <div className="flex gap-3">
        <Link to="/problems">
          <Button variant="primary">Browse Problems</Button>
        </Link>
        <Link to="/">
          <Button variant="secondary">Go Home</Button>
        </Link>
      </div>
    </div>
  );
};
