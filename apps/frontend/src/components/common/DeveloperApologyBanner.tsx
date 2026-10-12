import React, { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Terminal,
} from "lucide-react";
import { Button } from "./Button";

export const GithubIcon: React.FC<{ className?: string }> = ({
  className = "w-3.5 h-3.5",
}) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

export const GITHUB_REPO_URL = "https://github.com/Osank31/LCArena";
export const RUN_COMMAND = `git clone ${GITHUB_REPO_URL}.git && docker compose up`;

export const APOLOGY_TITLE = "A Small Apology from the Developer 🥹";

export const DeveloperApologyBanner: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCopyCommand = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(RUN_COMMAND);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = RUN_COMMAND;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      data-reveal
      className="bg-paper-2/90 border border-ink/20 border-l-4 border-l-ink rounded-sm p-4 sm:p-5 text-ink shadow-sm"
      role="region"
      aria-label="Developer Demo Notice"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="pleading face">
            🥹
          </span>
          <h2 className="font-serif font-bold text-base sm:text-lg text-ink tracking-tight">
            {APOLOGY_TITLE}
          </h2>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs text-ink-3 hover:text-ink inline-flex items-center gap-1 font-mono transition-colors p-1 cursor-pointer"
          aria-label={isCollapsed ? "Expand apology notice" : "Collapse apology notice"}
        >
          <span>{isCollapsed ? "Show message" : "Minimize"}</span>
          {isCollapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-3.5 space-y-3 text-xs sm:text-sm text-ink-2 leading-relaxed">
          <p className="font-medium text-ink">
            Sorry, I haven't deployed the backend yet! T-T
          </p>

          <p>
            Running the code execution servers and supporting infrastructure gets pretty
            expensive, so for now, LCArena is available as a frontend demo.
          </p>

          <p>
            I still want you to explore what I've built! I've added a few sample problems
            so you can check out the interface, explore the problem-solving experience,
            and see how the platform is designed.
          </p>

          <p>
            Want to experience LCArena's full potential? Clone the repository, set up
            the backend locally using Docker Compose, and run it on your own machine.
          </p>

          <p className="font-medium text-ink">
            Thanks for checking out my project! ❤️
          </p>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-rule mt-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<GithubIcon className="w-3.5 h-3.5" />}
                  rightIcon={<ExternalLink className="w-3 h-3 opacity-70" />}
                >
                  GitHub Repository
                </Button>
              </a>

              <button
                onClick={handleCopyCommand}
                aria-label="Copy Docker Compose run command"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm bg-paper border border-rule-2 hover:border-ink-3 text-ink transition-colors cursor-pointer font-mono"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-ink" />
                    <span className="font-semibold">Command Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-ink-3" />
                    <span>Copy Docker Command</span>
                  </>
                )}
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-ink-3 bg-paper px-2.5 py-1 rounded-sm border border-rule select-all">
              <Terminal className="w-3.5 h-3.5 text-ink-3 shrink-0" />
              <code className="truncate max-w-xs">{RUN_COMMAND}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
