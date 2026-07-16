"use client";

export function SkillsSkeleton() {
  // Render placeholder arrays
  const statCards = Array.from({ length: 5 });
  const skillCards = Array.from({ length: 6 });

  return (
    <div className="space-y-6 w-full animate-pulse">
      {/* Metrics Stats Placeholders */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((_, i) => (
          <div
            key={i}
            className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 h-20 flex flex-col justify-center"
          >
            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
            <div className="h-6 w-10 bg-zinc-300 dark:bg-zinc-700 rounded-md" />
          </div>
        ))}
      </div>

      {/* Filters Row Placeholders */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <div className="h-10 w-full sm:w-64 bg-zinc-200 dark:bg-zinc-850 rounded-xl" />
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-850 rounded-xl" />
          <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-850 rounded-xl" />
          <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-850 rounded-xl" />
          <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-850 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Skill Cards Grid Placeholders */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {skillCards.map((_, i) => (
          <div
            key={i}
            className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4 shadow-xs"
          >
            {/* Header info */}
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4.5 w-3/4 bg-zinc-300 dark:bg-zinc-700 rounded-md" />
                <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
              </div>
            </div>

            {/* Badges row */}
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-850 rounded-md" />
              <div className="h-5 w-14 bg-zinc-200 dark:bg-zinc-850 rounded-md" />
            </div>

            {/* Levels progression */}
            <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />

            {/* Progress bar line */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
                <div className="h-3 w-8 bg-zinc-250 dark:bg-zinc-750 rounded-sm" />
              </div>
              <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            </div>

            {/* Card footer details */}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-850">
              <div className="h-3.5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-7 w-7 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-7 w-7 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
