"use client";

import { Notebook, Plus } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Study Notes & Tips
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Jot down thoughts, links, and code snippets related to your study topics.
          </p>
        </div>
        <button
          disabled
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-xs opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </button>
      </div>

      {/* Empty State / Placeholder */}
      <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs h-[300px]">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 mb-4 animate-pulse">
          <Notebook className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          No Notes Yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[280px] leading-relaxed">
          Create rich documentation blocks and link them directly to specific skills in Phase 4.
        </p>
      </div>
    </div>
  );
}
