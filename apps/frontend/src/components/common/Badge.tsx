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

  const variantClasses = {
    default: "bg-slate-800 text-slate-300 border border-slate-700/60",
    outline: "bg-transparent text-slate-400 border border-slate-700",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium tracking-wide ${sizeClasses} ${variantClasses} ${className}`}
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
