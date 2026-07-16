"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse" />;
  }

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button
      onClick={cycleTheme}
      className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-200 bg-white text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
      aria-label="Toggle theme"
    >
      {theme === "light" && <Sun className="h-4.5 w-4.5 transition-transform" />}
      {theme === "dark" && <Moon className="h-4.5 w-4.5 transition-transform" />}
      {(theme === "system" || !theme) && <Monitor className="h-4.5 w-4.5 transition-transform" />}
    </button>
  );
}
