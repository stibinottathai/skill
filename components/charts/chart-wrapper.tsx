"use client";

import { useEffect, useState } from "react";

interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number;
}

export function ChartWrapper({ children, height = 300 }: ChartWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 animate-pulse"
        style={{ height: `${height}px` }}
      >
        <span className="text-xs text-zinc-400 font-semibold">Loading chart canvas...</span>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      {children}
    </div>
  );
}
