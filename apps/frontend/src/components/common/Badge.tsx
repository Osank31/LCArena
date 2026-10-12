import React from "react";
import { Difficulty } from "../../types/problem.types";
import { UserRole } from "../../types/auth.types";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  className = "",
}) => {
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  // Near-monochrome "stamp" treatments: distinction comes from weight,
  // rule style and ink inversion rather than hue.
  const variantClasses = {
    default: "bg-paper-2 text-ink border border-rule",
    outline: "bg-transparent text-ink-2 border border-rule",
    success: "bg-transparent text-ink border-2 border-ink",
    warning: "bg-transparent text-ink border border-dashed border-ink-3",
    danger: "bg-ink text-paper border border-ink",
    info: "bg-paper-3 text-ink-2 border border-rule",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm font-mono uppercase tracking-wider ${sizeClasses} ${variantClasses} ${className}`}
      data-variant={variant}
    >
      {children}
    </span>
  );
};

export const DifficultyBadge: React.FC<{
  difficulty: Difficulty;
  size?: "sm" | "md";
  className?: string;
}> = ({ difficulty, size = "md", className = "" }) => {
  const variantMap: Record<Difficulty, "success" | "warning" | "danger"> = {
    Easy: "success",
    Medium: "warning",
    Hard: "danger",
  };

  return (
    <Badge variant={variantMap[difficulty] || "default"} size={size} className={className}>
      {difficulty}
    </Badge>
  );
};

export const RoleBadge: React.FC<{ role?: UserRole }> = ({ role = "Regular" }) => {
  const variant = role === "Admin" ? "danger" : role === "Premium" ? "warning" : "info";

  return (
    <Badge variant={variant} size="sm">
      {role}
    </Badge>
  );
};
