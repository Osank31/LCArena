import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "underline" | "pill";
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
  variant = "underline",
}) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1 ${
        variant === "underline"
          ? "border-b border-rule"
          : "bg-paper-2 p-1 rounded-sm border border-rule"
      } ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === "pill") {
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wide transition-colors cursor-pointer ${
                isActive
                  ? "bg-ink text-paper"
                  : "text-ink-2 hover:text-ink hover:bg-paper-3"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-sm text-[10px] ${
                    isActive
                      ? "bg-ink-2 text-paper"
                      : "bg-paper-3 text-ink-3 border border-rule"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wide border-b-2 -mb-px transition-colors cursor-pointer ${
              isActive
                ? "border-ink text-ink font-semibold"
                : "border-transparent text-ink-3 hover:text-ink hover:border-rule-2"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span className="ml-1 px-1.5 py-0.5 rounded-sm text-[10px] bg-paper-2 text-ink-3 border border-rule">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
