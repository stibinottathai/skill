"use client";

import Link from "next/link";
import { Skill } from "@/types/skill";
import { Edit2, Archive, ArchiveRestore, Trash2, Calendar, BookOpen, ChevronRight, Clock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

// Mapping of standard icons for lookup
export const ICON_OPTIONS = [
  { label: "Default", value: "GraduationCap" },
  { label: "Programming", value: "Code" },
  { label: "Database", value: "Database" },
  { label: "Web/Globe", value: "Globe" },
  { label: "UI / Layers", value: "Layers" },
  { label: "Hardware/AI", value: "Cpu" },
  { label: "Server/Cloud", value: "Server" },
  { label: "Mobile Dev", value: "Smartphone" },
  { label: "Design/Paint", value: "Paintbrush" },
  { label: "Security", value: "Shield" },
  { label: "Tools/Wrench", value: "Wrench" },
  { label: "Terminal", value: "Terminal" },
  { label: "Activity/Soft", value: "Activity" },
  { label: "Book/Reading", value: "BookOpen" },
];

// Color palette options
export const COLOR_OPTIONS = [
  { label: "Indigo", value: "#4f46e5" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Slate", value: "#64748b" },
];

interface SkillCardProps {
  skill: Skill;
  onEdit: (skill: Skill) => void;
  onDelete: (skillId: string) => void;
  onArchiveToggle: (skillId: string, isArchived: boolean) => void;
}

export function SkillCard({ skill, onEdit, onDelete, onArchiveToggle }: SkillCardProps) {
  // Resolve icon component dynamically
  const IconComponent = (LucideIcons as any)[skill.icon] || LucideIcons.GraduationCap;

  // Format date safely
  const formatUpdatedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Recently";
    }
  };

  // Status style maps
  const statusStyles = {
    Planned: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    Learning: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30",
    Practicing: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
    Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
    Archived: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-500 border-zinc-300 dark:border-zinc-800",
  };

  // Priority style maps
  const priorityStyles = {
    High: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-100 dark:border-red-900/30",
    Medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
    Low: "bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400 border-slate-100 dark:border-slate-900/30",
  };

  const isArchived = skill.status === "Archived";

  return (
    <div
      className={cn(
        "group flex flex-col justify-between p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700",
        isArchived ? "opacity-75" : ""
      )}
    >
      <div className="space-y-4">
        
        {/* Card Header Info as Link */}
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/skills/${skill.id}`}
            className="group/title flex items-center gap-3 min-w-0"
          >
            {/* Colored Icon Wrapper */}
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover/title:scale-105"
              style={{
                backgroundColor: `${skill.color || "#6366f1"}15`,
                color: skill.color || "#6366f1",
              }}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight line-clamp-1 group-hover/title:text-indigo-600 dark:group-hover/title:text-indigo-400 transition-colors">
                {skill.name}
              </h3>
              <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
                {skill.category}
              </p>
            </div>
          </Link>
        </div>

        {/* Skill Description */}
        {skill.description ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {skill.description}
          </p>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
            No description provided.
          </p>
        )}

        {/* View Roadmap Banner Link */}
        <Link
          href={`/skills/${skill.id}`}
          className="flex items-center justify-between px-3.5 py-2.5 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:border-indigo-900/40 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all group/btn cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            View Complete Roadmap
          </span>
          <ChevronRight className="h-4 w-4 text-indigo-500 transition-transform group-hover/btn:translate-x-1" />
        </Link>

        {/* Level Badges */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border",
              statusStyles[skill.status]
            )}
          >
            {skill.status}
          </span>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border",
              priorityStyles[skill.priority]
            )}
          >
            {skill.priority} Priority
          </span>
        </div>

        {/* Level Progression */}
        <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          <span>{skill.currentLevel}</span>
          <span className="mx-2.5 text-zinc-400 dark:text-zinc-650">➔</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
            {skill.targetLevel}
          </span>
        </div>

        {/* Progress Bar Section */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-zinc-500 dark:text-zinc-400">Progress</span>
            <span style={{ color: skill.color }}>{skill.progress}%</span>
          </div>
          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${skill.progress}%`,
                backgroundColor: skill.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* Card Footer Details */}
      <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-zinc-400" />
            {skill.estimatedHours} hrs
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-zinc-400" />
            {formatUpdatedDate(skill.updatedAt)}
          </span>
        </div>

        {/* Card Actions Panel */}
        <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onEdit(skill)}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all cursor-pointer"
            title="Edit Skill"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          
          <button
            onClick={() => onArchiveToggle(skill.id, !isArchived)}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all cursor-pointer"
            title={isArchived ? "Restore Skill" : "Archive Skill"}
          >
            {isArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            onClick={() => onDelete(skill.id)}
            className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-950/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all cursor-pointer"
            title="Delete Skill"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
