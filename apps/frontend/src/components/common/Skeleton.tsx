import React from "react";

export const Skeleton: React.FC<{
  className?: string;
  width?: string | number;
  height?: string | number;
}> = ({ className = "", width, height }) => {
  return (
    <div
      style={{ width, height }}
      className={`animate-pulse bg-rule/60 rounded-sm ${className}`}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => {
  return (
    <div className="w-full divide-y divide-rule" data-testid="table-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-4 px-4 gap-4">
          <div className="flex items-center gap-3 w-1/3">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28 hidden md:block" />
          <Skeleton className="h-6 w-16 rounded-sm" />
        </div>
      ))}
    </div>
  );
};
