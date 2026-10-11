import React from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";

interface AlertProps {
  type?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = "info",
  title,
  message,
  onDismiss,
  className = "",
}) => {
  const config = {
    info: {
      bg: "bg-blue-500/10 border-blue-500/20 text-blue-300",
      icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
    },
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/20 text-amber-300",
      icon: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    error: {
      bg: "bg-rose-500/10 border-rose-500/20 text-rose-300",
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
  }[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm ${config.bg} ${className}`}
    >
      {config.icon}
      <div className="flex-1">
        {title && <h4 className="font-semibold text-xs uppercase tracking-wider mb-0.5">{title}</h4>}
        <div className="text-xs leading-relaxed">{message}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="text-current opacity-70 hover:opacity-100 p-0.5 rounded cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
