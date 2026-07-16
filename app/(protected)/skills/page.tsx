"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import {
  subscribeSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  archiveSkill,
} from "@/services/skills";
import {
  applyRoadmapTemplate,
  duplicateRoadmap,
  generateAIRoadmap,
} from "@/services/roadmap";
import { Skill } from "@/types/skill";
import { SkillCard } from "@/components/skills/skill-card";
import { SkillFormModal } from "@/components/skills/skill-form-modal";
import { SkillsSkeleton } from "@/components/skills/skills-skeleton";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Search, BookOpen, Award, Clock, Archive, Sparkles, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SkillsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("Active"); // Default to Active (non-archived)
  const [filterPriority, setFilterPriority] = useState("All");
  const [sortBy, setSortBy] = useState("updated-desc"); // updated-desc, name-asc, progress-desc

  // Modal control states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Subscribe to user's skills in real-time
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = subscribeSkills(user.uid, (fetchedSkills) => {
      setSkills(fetchedSkills);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Compute stats based on ALL user skills
  const stats = useMemo(() => {
    const total = skills.length;
    const learning = skills.filter((s) => s.status === "Learning").length;
    const completed = skills.filter((s) => s.status === "Completed").length;
    const planned = skills.filter((s) => s.status === "Planned" || s.status === "Practicing").length;
    const archived = skills.filter((s) => s.status === "Archived").length;

    return { total, learning, completed, planned, archived };
  }, [skills]);

  // Unique categories list for the filter dropdown
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    skills.forEach((s) => {
      if (s.category && s.status !== "Archived") {
        cats.add(s.category);
      }
    });
    return Array.from(cats);
  }, [skills]);

  // Filter and sort skills
  const processedSkills = useMemo(() => {
    return skills
      .filter((skill) => {
        // Search Name query
        const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());

        // Category filter
        const matchesCategory = filterCategory === "All" || skill.category === filterCategory;

        // Priority filter
        const matchesPriority = filterPriority === "All" || skill.priority === filterPriority;

        // Status filter (Active vs Archived vs specific status)
        let matchesStatus = true;
        if (filterStatus === "Active") {
          matchesStatus = skill.status !== "Archived";
        } else if (filterStatus === "Archived") {
          matchesStatus = skill.status === "Archived";
        } else {
          matchesStatus = skill.status === filterStatus;
        }

        return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "progress-desc") {
          return b.progress - a.progress;
        }
        // Default to updated date newest-first
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateB - dateA;
      });
  }, [skills, searchQuery, filterCategory, filterStatus, filterPriority, sortBy]);

  // CRUD handlers
  const handleAddOrEditSubmit = async (
    values: Omit<Skill, "id" | "userId" | "createdAt" | "updatedAt">,
    roadmapInit?: {
      type: "empty" | "template" | "duplicate" | "ai";
      templateKey?: string;
      duplicateSkillId?: string;
    }
  ) => {
    if (!user) return;

    try {
      if (selectedSkill) {
        // Update Action
        await updateSkill(selectedSkill.id, values);
        showToast(`Successfully updated "${values.name}"!`, "success");
      } else {
        // Create Action
        const newSkillId = await createSkill(user.uid, values);

        // Apply selected roadmap initialization
        if (roadmapInit) {
          if (roadmapInit.type === "template" && roadmapInit.templateKey) {
            await applyRoadmapTemplate(user.uid, newSkillId, roadmapInit.templateKey);
          } else if (roadmapInit.type === "duplicate" && roadmapInit.duplicateSkillId) {
            await duplicateRoadmap(user.uid, roadmapInit.duplicateSkillId, newSkillId);
          } else if (roadmapInit.type === "ai") {
            await generateAIRoadmap(user.uid, newSkillId, values.name);
          }
        }

        showToast(`Successfully created "${values.name}"!`, "success");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save skill.", "error");
    }
  };

  const handleArchiveToggle = async (skillId: string, shouldArchive: boolean) => {
    const skillName = skills.find((s) => s.id === skillId)?.name || "Skill";
    try {
      await archiveSkill(skillId, shouldArchive);
      showToast(
        shouldArchive ? `Archived "${skillName}"` : `Restored "${skillName}"`,
        "success"
      );
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update archive status.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    const skillName = skills.find((s) => s.id === deleteTargetId)?.name || "Skill";
    try {
      await deleteSkill(deleteTargetId);
      showToast(`Permanently deleted "${skillName}"`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to delete skill.", "error");
    } finally {
      setDeleteTargetId(null);
    }
  };

  if (loading) {
    return <SkillsSkeleton />;
  }

  const deleteTargetName = skills.find((s) => s.id === deleteTargetId)?.name || "";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title & Add Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Skills Dashboard
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Organize your learning path, track estimated study hours, and monitor progress metrics.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedSkill(null);
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          Add New Skill
        </button>
      </div>

      {/* Metrics Counter Panels */}
      <div className="grid gap-3.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">
            Total Skills
          </span>
          <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
            {stats.total}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col justify-center">
          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
            Learning
          </span>
          <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-450 mt-1">
            {stats.learning}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">
            Completed
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-450 mt-1">
            {stats.completed}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col justify-center">
          <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
            Planned
          </span>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-450 mt-1">
            {stats.planned}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col justify-center col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Archived
          </span>
          <span className="text-2xl font-extrabold text-zinc-500 dark:text-zinc-400 mt-1">
            {stats.archived}
          </span>
        </div>
      </div>

      {/* Searching, Filtering and Sorting Bar */}
      <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        
        {/* Search & Action controls */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-550 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills by name..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-zinc-50/50 text-sm focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-550"
            />
          </div>

          {/* Filtering dropdown selections */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Select */}
            <div className="flex items-center gap-1.5 h-10 px-2.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs text-zinc-650 dark:text-zinc-400">
              <span className="font-semibold text-[10px] uppercase text-zinc-400 tracking-wider">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden font-bold pr-4 cursor-pointer text-zinc-800 dark:text-zinc-300"
              >
                <option value="Active">Active</option>
                <option value="Planned">Planned</option>
                <option value="Learning">Learning</option>
                <option value="Practicing">Practicing</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {/* Category Select */}
            <div className="flex items-center gap-1.5 h-10 px-2.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs text-zinc-650 dark:text-zinc-400">
              <span className="font-semibold text-[10px] uppercase text-zinc-400 tracking-wider">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden font-bold pr-4 cursor-pointer text-zinc-800 dark:text-zinc-300 max-w-[150px]"
              >
                <option value="All">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Select */}
            <div className="flex items-center gap-1.5 h-10 px-2.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs text-zinc-650 dark:text-zinc-400">
              <span className="font-semibold text-[10px] uppercase text-zinc-400 tracking-wider">Priority:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden font-bold pr-4 cursor-pointer text-zinc-800 dark:text-zinc-300"
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 h-10 px-2.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs text-zinc-650 dark:text-zinc-400">
              <span className="font-semibold text-[10px] uppercase text-zinc-400 tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden font-bold pr-4 cursor-pointer text-zinc-800 dark:text-zinc-300"
              >
                <option value="updated-desc">Last Updated</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="progress-desc">Progress</option>
              </select>
            </div>

          </div>
        </div>

      </div>

      {/* Card Content Grid */}
      {processedSkills.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {processedSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onEdit={(s) => {
                setSelectedSkill(s);
                setIsFormOpen(true);
              }}
              onDelete={setDeleteTargetId}
              onArchiveToggle={handleArchiveToggle}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs min-h-[350px]">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 mb-5 animate-pulse">
            <BookOpen className="h-10 w-10 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            No Skills Found
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-455 max-w-sm leading-relaxed mb-6">
            {skills.length === 0
              ? "Get started by adding your first skill! Define your current level, target goals, and map your hours."
              : "No skills match your active filtering queries. Try resetting search strings or filter configurations."}
          </p>
          {skills.length === 0 && (
            <button
              onClick={() => {
                setSelectedSkill(null);
                setIsFormOpen(true);
              }}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              Add First Skill
            </button>
          )}
        </div>
      )}

      {/* Skill Input Form Dialog */}
      <SkillFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedSkill(null);
        }}
        onSubmit={handleAddOrEditSubmit}
        skill={selectedSkill}
        skills={skills}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        title="Delete Skill"
        description="Are you absolutely sure you want to delete this skill? This action cannot be undone."
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            This will permanently remove <span className="font-bold text-zinc-900 dark:text-zinc-200">"{deleteTargetName}"</span> from your account, along with all associated learning session metrics.
          </p>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setDeleteTargetId(null)}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold shadow-xs cursor-pointer"
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
