"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog } from "@/components/ui/dialog";
import { LearningSession, SessionDifficulty, SessionStatus } from "@/types/session";
import { Skill } from "@/types/skill";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

const sessionFormSchema = z.object({
  skillId: z.string().min(1, "Skill is required"),
  date: z.string().min(1, "Date is required"),
  duration: z.number().min(1, "Duration must be greater than 0"),
  topicLearned: z.string().min(1, "Topic learned is required"),
  summary: z.string(),
  notes: z.string(),
  difficulty: z.enum(["Easy", "Medium", "Hard"] as const),
  productivityRating: z.number().min(1).max(5),
  status: z.enum(["Completed", "In Progress"] as const),
  resourcesUsed: z.string(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface SessionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Omit<LearningSession, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  skills: Skill[];
  session?: LearningSession | null; // Prefilled if editing
  prefilledSkillId?: string; // Prefilled if opening from a specific Skill Detail Page
}

export function SessionFormModal({
  open,
  onClose,
  onSubmit,
  skills,
  session,
  prefilledSkillId,
}: SessionFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [notesTab, setNotesTab] = useState<"write" | "preview">("write");

  // Get current date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const defaultValues: SessionFormValues = {
    skillId: prefilledSkillId || "",
    date: getTodayString(),
    duration: 30,
    topicLearned: "",
    summary: "",
    notes: "",
    difficulty: "Medium",
    productivityRating: 4,
    status: "Completed",
    resourcesUsed: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues,
  });

  const selectedSkillId = watch("skillId");
  const notesText = watch("notes");
  const currentProductivity = watch("productivityRating");

  // Prefill or reset
  useEffect(() => {
    if (open) {
      setNotesTab("write");
      if (session) {
        reset({
          skillId: session.skillId,
          date: session.date,
          duration: session.duration,
          topicLearned: session.topicLearned,
          summary: session.summary || "",
          notes: session.notes || "",
          difficulty: session.difficulty,
          productivityRating: session.productivityRating,
          status: session.status,
          resourcesUsed: session.resourcesUsed || "",
        });
      } else {
        reset({
          ...defaultValues,
          skillId: prefilledSkillId || (skills.length > 0 ? skills[0].id : ""),
        });
      }
    }
  }, [open, session, prefilledSkillId, skills, reset]);

  const handleFormSubmit = async (values: SessionFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
      reset();
    } catch (error) {
      console.error("Failed to submit session form: ", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Star rating helper
  const renderProductivitySelector = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setValue("productivityRating", star)}
            className="p-1 text-zinc-300 dark:text-zinc-700 hover:scale-110 transition-transform cursor-pointer"
          >
            <Star
              className={cn(
                "h-5 w-5",
                star <= currentProductivity
                  ? "text-amber-500 fill-amber-500"
                  : "text-zinc-300 dark:text-zinc-700"
              )}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={session ? "Edit Learning Session" : "Log Learning Session"}
      description={session ? "Update your study log history details." : "Record what you studied, duration, and notes."}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
        {/* Row 1: Skill Selection & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Select Skill *</label>
            <select
              {...register("skillId")}
              disabled={!!prefilledSkillId}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden disabled:opacity-60"
            >
              <option value="" disabled>Select a skill</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} ({skill.category})
                </option>
              ))}
            </select>
            {errors.skillId && <p className="text-[10px] font-bold text-red-500">{errors.skillId.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Date Learned *</label>
            <input
              type="date"
              {...register("date")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            />
            {errors.date && <p className="text-[10px] font-bold text-red-500">{errors.date.message}</p>}
          </div>
        </div>

        {/* Row 2: Topic Learned */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Topic / Title *</label>
          <input
            type="text"
            {...register("topicLearned")}
            className={cn(
              "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
              errors.topicLearned && "border-red-500 dark:border-red-500"
            )}
            placeholder="e.g. Firebase rules setup, dynamic routing"
          />
          {errors.topicLearned && <p className="text-[10px] font-bold text-red-500">{errors.topicLearned.message}</p>}
        </div>

        {/* Row 3: Duration & Difficulty & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Duration (Minutes) *</label>
            <input
              type="number"
              {...register("duration", { valueAsNumber: true })}
              className={cn(
                "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
                errors.duration && "border-red-500 dark:border-red-500"
              )}
              placeholder="e.g. 45"
            />
            {errors.duration && <p className="text-[10px] font-bold text-red-500">{errors.duration.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Difficulty</label>
            <select
              {...register("difficulty")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Session Status</label>
            <select
              {...register("status")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            >
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>
        </div>

        {/* Row 4: Productivity Rating */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350 block">Productivity Rating (1-5)</label>
          {renderProductivitySelector()}
        </div>

        {/* Summary (Brief Description) */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Brief Summary</label>
          <input
            type="text"
            {...register("summary")}
            className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            placeholder="Jot down a quick one-line summary..."
          />
        </div>

        {/* Resources Used */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Resources Used (Optional)</label>
          <input
            type="text"
            {...register("resourcesUsed")}
            className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            placeholder="e.g. Next.js docs, tutorial link, book chapter"
          />
        </div>

        {/* Notes (Markdown Textarea with Preview Tab) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Detailed Notes (Markdown Supported)</label>
            <div className="flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setNotesTab("write")}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                  notesTab === "write"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-zinc-800 dark:text-indigo-400"
                    : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setNotesTab("preview")}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                  notesTab === "preview"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-zinc-800 dark:text-indigo-400"
                    : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                Preview
              </button>
            </div>
          </div>

          {notesTab === "write" ? (
            <textarea
              {...register("notes")}
              className="w-full min-h-[120px] p-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
              placeholder="Write detailed notes here. You can use markdown (e.g. # Header, - list, `code` blocks, [link](url))."
            />
          ) : (
            <div className="w-full min-h-[120px] p-3 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 overflow-y-auto max-h-[220px]">
              {notesText ? (
                <MarkdownRenderer content={notesText} />
              ) : (
                <p className="text-xs text-zinc-400 italic">Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Submit Actions */}
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
            disabled={submitting || (skills.length === 0 && !prefilledSkillId)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Saving..." : session ? "Save Changes" : "Log Session"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
