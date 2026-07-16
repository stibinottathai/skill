"use client";

import { Award, Plus, Search } from "lucide-react";

export default function SkillsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header section with page tools */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Skills Inventory
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage the skills you want to master, set levels, and track progress.
          </p>
        </div>
        <button
          disabled
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-xs opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add Skill
        </button>
      </div>

      {/* Filter and Search mockup */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search skills..."
            disabled
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none opacity-50 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Empty State / Placeholder */}
      <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs h-[300px]">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 mb-4 animate-pulse">
          <Award className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          No Skills Added Yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[280px] leading-relaxed">
          Skills management CRUD functionality will be implemented in the next phase.
        </p>
      </div>
    </div>
  );
}
