import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  ServerOff,
  Terminal,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { Button } from "./Button";
import { Modal } from "./Modal";

export const REPO_URL = "https://github.com/Osank31/LCArena.git";
export const RUN_COMMAND = `git clone ${REPO_URL} && docker compose up`;

interface ServerStatusModalProps {
  initialOpen?: boolean;
  onDismiss?: () => void;
}

export const ServerStatusModal: React.FC<ServerStatusModalProps> = ({
  initialOpen,
  onDismiss,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen ?? false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  // Check health on website mount
  useEffect(() => {
    let isMounted = true;

    // If initialOpen was explicitly passed (e.g. in tests), respect it
    if (initialOpen !== undefined) {
      setIsOpen(initialOpen);
      return;
    }

    const checkServerHealth = async () => {
      try {
        await apiClient.get("/health", { timeout: 3500 });
        if (isMounted) setIsOpen(false);
      } catch {
        if (isMounted) setIsOpen(true);
      }
    };

    checkServerHealth();

    // Also listen for connection errors triggered by any failed requests
    const handleConnectionError = () => {
      if (isMounted) setIsOpen(true);
    };

    window.addEventListener("lcarena:server-connection-error", handleConnectionError);

    return () => {
      isMounted = false;
      window.removeEventListener("lcarena:server-connection-error", handleConnectionError);
    };
  }, [initialOpen]);

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
    setRetryError(null);
    try {
      await apiClient.get("/health", { timeout: 4000 });
      setIsOpen(false);
      if (onDismiss) onDismiss();
    } catch {
      setRetryError(
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
      title="Server Connection Required"
      maxWidth="lg"
    >
      <div className="space-y-4 text-slate-200">
        <div className="flex items-start gap-3 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300">
          <ServerOff className="w-5 h-5 mt-0.5 shrink-0 text-rose-400" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-rose-200 block text-sm mb-1">
              Backend Server is Offline
            </span>
            Unable to connect to the LCArena backend server. You need to run the server
            by cloning and starting this GitHub repository:
          </div>
        </div>

        {/* Command block with clipboard copy */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              Run command in your terminal:
            </span>
            <button
              onClick={() => copyToClipboard(RUN_COMMAND, "cmd")}
              aria-label="Copy run command to clipboard"
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
            >
              {copiedCmd ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>

          <div className="relative group bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto select-all">
            <code>{RUN_COMMAND}</code>
          </div>
        </div>

        {/* Repository URL with direct copy */}
        <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs">
          <div className="flex items-center gap-2 truncate mr-2">
            <span className="text-slate-400 font-medium shrink-0">Repository:</span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 truncate flex items-center gap-1"
            >
              <span className="truncate">{REPO_URL}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>

          <button
            onClick={() => copyToClipboard(REPO_URL, "url")}
            aria-label="Copy repository URL to clipboard"
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 border border-slate-700"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">URL Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>

        {retryError && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-950/40 border border-amber-800/50 rounded-lg text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{retryError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
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
    </Modal>
  );
};
