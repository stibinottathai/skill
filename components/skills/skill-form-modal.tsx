"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Skill, SkillLevel, SkillTargetLevel, SkillStatus, SkillPriority } from "@/types/skill";
import { ICON_OPTIONS, COLOR_OPTIONS } from "@/components/skills/skill-card";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Programming Language",
  "Frontend",
  "Backend",
  "Mobile Development",
  "AI / Machine Learning",
  "DevOps",
  "Cloud",
  "Database",
  "UI/UX",
  "Tools",
  "Soft Skills",
  "Other",
];

const skillFormSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  category: z.string().min(1, "Category is required"),
  customCategory: z.string().optional(),
  description: z.string(),
  currentLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"] as const),
  targetLevel: z.enum(["Intermediate", "Advanced", "Expert"] as const),
  status: z.enum(["Planned", "Learning", "Practicing", "Completed", "Archived"] as const),
  priority: z.enum(["Low", "Medium", "High"] as const),
  color: z.string(),
  icon: z.string(),
  estimatedHours: z.number().min(0, "Estimated hours cannot be negative"),
  progress: z.number().min(0, "Progress must be at least 0").max(100, "Progress cannot exceed 100"),
});

type SkillFormValues = z.infer<typeof skillFormSchema>;

interface SkillFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Omit<Skill, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  skill?: Skill | null; // Prefilled if editing
}

export function SkillFormModal({ open, onClose, onSubmit, skill }: SkillFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const defaultValues: Partial<SkillFormValues> = {
    name: "",
    category: "Programming Language",
    customCategory: "",
    description: "",
    currentLevel: "Beginner",
    targetLevel: "Intermediate",
    status: "Planned",
    priority: "Medium",
    color: "#4f46e5",
    icon: "GraduationCap",
    estimatedHours: 0,
    progress: 0,
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SkillFormValues>({
    resolver: zodResolver(skillFormSchema),
    defaultValues,
  });

  const selectedCategory = watch("category");
  const selectedColor = watch("color");
  const selectedIcon = watch("icon");

  // Sync custom category field visibility
  useEffect(() => {
    setShowCustomCategory(selectedCategory === "Other");
  }, [selectedCategory]);

  // Reset or prefill form when open state or skill changes
  useEffect(() => {
    if (open) {
      if (skill) {
        const isCustom = !CATEGORIES.includes(skill.category);
        reset({
          name: skill.name,
          category: isCustom ? "Other" : skill.category,
          customCategory: isCustom ? skill.category : "",
          description: skill.description || "",
          currentLevel: skill.currentLevel,
          targetLevel: skill.targetLevel,
          status: skill.status,
          priority: skill.priority,
          color: skill.color || "#4f46e5",
          icon: skill.icon || "GraduationCap",
          estimatedHours: skill.estimatedHours || 0,
          progress: skill.progress || 0,
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, skill, reset]);

  const handleFormSubmit = async (values: SkillFormValues) => {
    setSubmitting(true);
    try {
      const finalCategory = values.category === "Other" ? values.customCategory || "Other" : values.category;
      
      const { customCategory, ...submissionValues } = values;

      await onSubmit({
        ...submissionValues,
        category: finalCategory,
      });
      onClose();
      reset();
    } catch (error) {
      console.error("Submission failed: ", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={skill ? "Edit Skill" : "Add New Skill"}
      description={skill ? "Update details of your skill profile." : "Define a new skill you want to learn or master."}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
        
        {/* Name Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Skill Name *</label>
          <input
            type="text"
            {...register("name")}
            className={cn(
              "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
              errors.name && "border-red-500 dark:border-red-500"
            )}
            placeholder="e.g. Next.js 15, Rust Programming"
          />
          {errors.name && <p className="text-[10px] font-bold text-red-500">{errors.name.message}</p>}
        </div>

        {/* Category Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Category *</label>
            <select
              {...register("category")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Category Input */}
          {showCustomCategory && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Custom Category Name *</label>
              <input
                type="text"
                {...register("customCategory")}
                required
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
                placeholder="e.g. Rust, Systems, Web3"
              />
            </div>
          )}
        </div>

        {/* Description Textarea */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Description</label>
          <textarea
            {...register("description")}
            className="w-full min-h-[70px] p-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            placeholder="What does this skill cover? Add learning pathways or resources..."
          />
        </div>

        {/* Levels Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Current Level</label>
            <select
              {...register("currentLevel")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Target Level</label>
            <select
              {...register("targetLevel")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            >
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
        </div>

        {/* Status / Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Status</label>
            <select
              {...register("status")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            >
              <option value="Planned">Planned</option>
              <option value="Learning">Learning</option>
              <option value="Practicing">Practicing</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Priority</label>
            <select
              {...register("priority")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {/* Icons Grid Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Choose Icon</label>
          <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 border border-zinc-150 rounded-xl dark:bg-zinc-900 dark:border-zinc-800">
            {ICON_OPTIONS.map((opt) => {
              const LucideIcon = (LucideIcons as any)[opt.value] || LucideIcons.GraduationCap;
              const isSelected = selectedIcon === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("icon", opt.value)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-250 dark:hover:bg-zinc-800 cursor-pointer transition-all",
                    isSelected
                      ? "border-indigo-600 bg-indigo-50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                  )}
                  title={opt.label}
                >
                  <LucideIcon className="h-4.5 w-4.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Colors Selection Grid */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Custom Card Color</label>
          <div className="flex gap-3.5 p-2 bg-zinc-50 border border-zinc-150 rounded-xl dark:bg-zinc-900 dark:border-zinc-800 justify-center">
            {COLOR_OPTIONS.map((opt) => {
              const isSelected = selectedColor === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("color", opt.value)}
                  className={cn(
                    "h-6 w-6 rounded-full cursor-pointer transition-transform duration-200 relative",
                    isSelected ? "scale-115 ring-2 ring-indigo-500 ring-offset-2 dark:ring-indigo-400 dark:ring-offset-zinc-950" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                />
              );
            })}
          </div>
        </div>

        {/* Hours / Progress */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Estimated Hours</label>
            <input
              type="number"
              {...register("estimatedHours", { valueAsNumber: true })}
              className={cn(
                "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
                errors.estimatedHours && "border-red-500 dark:border-red-500"
              )}
              placeholder="e.g. 20"
            />
            {errors.estimatedHours && (
              <p className="text-[10px] font-bold text-red-500">{errors.estimatedHours.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Progress (%)</label>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{watch("progress")}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              {...register("progress", { valueAsNumber: true })}
              className="w-full h-10 cursor-pointer accent-indigo-600"
            />
            {errors.progress && <p className="text-[10px] font-bold text-red-500">{errors.progress.message}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Saving..." : skill ? "Save Changes" : "Create Skill"}
          </button>
        </div>

      </form>
    </Dialog>
  );
}
