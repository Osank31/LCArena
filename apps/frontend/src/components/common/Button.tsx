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
    "inline-flex items-center justify-center font-serif font-medium rounded-md transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 select-none cursor-pointer";

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  }[size];

  const variantClasses = {
    primary:
      "bg-ink text-paper hover:bg-ink-2 active:bg-ink focus-visible:ring-ink",
    secondary:
      "bg-paper-2 text-ink border border-rule-2 hover:bg-rule focus-visible:ring-rule-2",
    outline:
      "bg-transparent border border-rule-2 text-ink hover:bg-paper-2 focus-visible:ring-rule-2",
    ghost:
      "bg-transparent text-ink-2 hover:bg-paper-2 hover:text-ink focus-visible:ring-rule-2",
    danger:
      "bg-transparent border-2 border-ink text-ink hover:bg-ink hover:text-paper focus-visible:ring-ink",
    success:
      "bg-ink-3 text-paper hover:bg-ink-2 focus-visible:ring-ink-3",
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
