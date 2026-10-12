import React from "react";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "../components/common/Button";
import { useEntrance } from "../animations";

export const NotFoundPage: React.FC = () => {
  const contentRef = useEntrance({ y: 10, duration: 0.36 });

  return (
    <div
      ref={contentRef}
      className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center bg-paper"
    >
      <div className="w-16 h-16 rounded-sm border border-rule text-ink flex items-center justify-center mb-4">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="font-serif text-5xl font-bold text-ink mb-2">404</h1>
      <h2 className="text-xl font-serif font-bold text-ink mb-2">
        Page Not Found
      </h2>
      <p className="text-sm text-ink-3 max-w-sm mb-6">
        The challenge or route you are looking for does not exist or may have been relocated.
      </p>
      <div className="flex gap-3">
        <Link to="/problems">
          <Button variant="primary">Browse Problems</Button>
        </Link>
        <Link to="/problems">
          <Button variant="secondary">Go Home</Button>
        </Link>
      </div>
    </div>
  );
};
