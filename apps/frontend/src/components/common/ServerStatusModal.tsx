import React, { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { backendStatus } from "../../services/backendStatus";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { GithubIcon } from "./DeveloperApologyBanner";

export const REPO_URL = "https://github.com/Osank31/LCArena";
export const RUN_COMMAND = `git clone ${REPO_URL}.git && docker compose up`;
export const MODAL_TITLE = "A Small Apology from the Developer 🥹";

interface ServerStatusModalProps {
  initialOpen?: boolean;
  onDismiss?: () => void;
}

export const ServerStatusModal: React.FC<ServerStatusModalProps> = ({
  initialOpen,
  onDismiss,
}) => {
  // Respect initialOpen if explicitly passed (e.g. in tests or when user clicks Demo Mode).
  // Defaults to false so the modal NEVER blocks the application on startup.
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen ?? false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialOpen !== undefined) {
      setIsOpen(initialOpen);
    }
  }, [initialOpen]);

  // Listen for user request to open the demo apology modal
  useEffect(() => {
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener("lcarena:open-demo-modal", handleOpenModal);
    return () => {
      window.removeEventListener("lcarena:open-demo-modal", handleOpenModal);
    };
  }, []);

  const copyToClipboard = async (text: string, type: "cmd" | "url") => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      if (type === "cmd") {
        setCopiedCmd(true);
        setTimeout(() => setCopiedCmd(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryMessage(null);
    try {
      // Re-probes /health and updates the shared backend status so the rest of
      // the app (demo badges, catalog fallback) follows along.
      const isReachable = await backendStatus.check();
      if (!isReachable) throw new Error("Backend unreachable");
      setIsOpen(false);
      if (onDismiss) onDismiss();
    } catch {
      setRetryMessage(
        "Server is still unreachable. Please ensure Docker is running and try again."
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onDismiss) onDismiss();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={MODAL_TITLE}
      maxWidth="lg"
    >
      <div className="space-y-4 text-ink">
        {/* Friendly Message */}
        <div className="p-4 bg-paper-2 border border-ink/20 border-l-4 border-l-ink rounded-sm text-ink space-y-2 text-xs sm:text-sm leading-relaxed">
          <p className="font-semibold text-ink">
            Sorry, I haven't deployed the backend yet! T-T
          </p>
          <p className="text-ink-2">
            Running the code execution servers and supporting infrastructure gets
            pretty expensive, so for now, LCArena is available as a frontend demo.
          </p>
          <p className="text-ink-2">
            I still want you to explore what I've built! I've added a few sample
            problems so you can check out the interface, explore the
            problem-solving experience, and see how the platform is designed.
          </p>
          <p className="text-ink-2">
            Want to experience LCArena's full potential? Clone the repository, set up
            the backend locally using Docker Compose, and run it on your own machine.
          </p>
          <p className="font-medium text-ink">
            Thanks for checking out my project! ❤️
          </p>
        </div>

        {/* Command block with clipboard copy */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-ink-3">
            <span className="flex items-center gap-1.5 font-medium">
              <Terminal className="w-3.5 h-3.5 text-ink-3" />
              Run locally with Docker Compose:
            </span>
            <button
              onClick={() => copyToClipboard(RUN_COMMAND, "cmd")}
              aria-label="Copy run command to clipboard"
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-sm bg-paper-2 hover:bg-rule text-ink-2 hover:text-ink transition-colors cursor-pointer border border-rule-2 ${
                copiedCmd ? "confirmation-pop" : ""
              }`}
            >
              {copiedCmd ? (
                <>
                  <Check className="w-3 h-3" />
                  <span className="font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>

          <div className="relative group bg-paper p-3 rounded-sm border border-rule-2 font-mono text-xs text-ink overflow-x-auto select-all">
            <code>{RUN_COMMAND}</code>
          </div>
        </div>

        {/* Repository URL with direct copy */}
        <div className="flex items-center justify-between p-2.5 bg-paper-2/70 border border-rule rounded-sm text-xs">
          <div className="flex items-center gap-2 truncate mr-2">
            <span className="text-ink-3 font-medium shrink-0">Repository:</span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-2 hover:text-ink underline underline-offset-4 truncate flex items-center gap-1"
            >
              <span className="truncate">{REPO_URL}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>

          <button
            onClick={() => copyToClipboard(REPO_URL, "url")}
            aria-label="Copy repository URL to clipboard"
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm bg-paper-2 hover:bg-rule text-ink-2 hover:text-ink transition-colors cursor-pointer shrink-0 border border-rule-2 ${
              copiedUrl ? "confirmation-pop" : ""
            }`}
          >
            {copiedUrl ? (
              <>
                <Check className="w-3 h-3" />
                <span className="font-medium">URL Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>

        {retryMessage && (
          <div className="p-2.5 bg-paper-2 border border-dashed border-rule-2 rounded-sm text-ink text-xs">
            <span>{retryMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-rule gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button
              variant="outline"
              size="sm"
              leftIcon={<GithubIcon className="w-3.5 h-3.5" />}
              rightIcon={<ExternalLink className="w-3 h-3 opacity-70" />}
            >
              GitHub Repository
            </Button>
          </a>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Dismiss
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRetry}
              isLoading={isRetrying}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const DeveloperApologyModal = ServerStatusModal;
