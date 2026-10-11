import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer";

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  }[size];

  const variantClasses = {
    primary:
      "bg-blue-600 hover:bg-blue-500 text-white shadow-sm focus-visible:ring-blue-500 active:bg-blue-700",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus-visible:ring-slate-400 active:bg-slate-850",
    outline:
      "border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:ring-slate-400",
    ghost:
      "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 focus-visible:ring-slate-400",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white shadow-sm focus-visible:ring-rose-500 active:bg-rose-700",
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm focus-visible:ring-emerald-500 active:bg-emerald-700",
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
