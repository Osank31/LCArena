import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-sm border border-dashed border-rule-2 bg-paper-2/60 ${className}`}
      data-testid="empty-state"
    >
      <div className="w-12 h-12 rounded-full border border-rule text-ink-3 flex items-center justify-center mb-3">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-serif font-bold text-ink">{title}</h3>
      {description && (
        <p className="text-sm text-ink-3 max-w-md mt-1 mb-4">{description}</p>
      )}
      {actionText && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
