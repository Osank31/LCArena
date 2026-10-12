import React from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEntrance } from "../../animations";

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
  // Short, unobtrusive entrance whenever a notice is added to the page.
  const noticeRef = useEntrance({ y: 6, duration: 0.2 });

  // Paper notices: tone is carried by the rule weight, icon and label
  // rather than by hue, keeping the interface close to monochrome.
  const config = {
    info: {
      bg: "bg-paper-2 border border-rule text-ink-2 border-l-4 border-l-rule-2",
      icon: <Info className="w-5 h-5 text-ink-3 shrink-0" />,
    },
    success: {
      bg: "bg-paper-2 border border-rule text-ink border-l-4 border-l-ink-3",
      icon: <CheckCircle2 className="w-5 h-5 text-ink shrink-0" />,
    },
    warning: {
      bg: "bg-paper-2 border border-dashed border-rule-2 text-ink border-l-4 border-l-ink-3",
      icon: <AlertCircle className="w-5 h-5 text-ink shrink-0" />,
    },
    error: {
      bg: "bg-paper-2 border border-rule-2 text-ink border-l-4 border-l-ink",
      icon: <XCircle className="w-5 h-5 text-ink shrink-0" />,
    },
  }[type];

  return (
    <div
      ref={noticeRef}
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-sm text-sm ${config.bg} ${className}`}
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
          className="text-current opacity-70 hover:opacity-100 p-0.5 rounded-sm cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
