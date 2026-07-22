"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import { createDailyPlanItem } from "@/services/planner";
import { subscribeRoadmapItems } from "@/services/roadmap";
import { Skill } from "@/types/skill";
import { RoadmapItem } from "@/types/roadmap";
import { DailyPlanPriority } from "@/types/planner";
import { Dialog } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, BookOpen, Sparkles, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const scheduleSchema = z.object({
  date: z.string().min(1, "Target date is required"),
  skillId: z.string().min(1, "Linked skill is required"),
  roadmapItemId: z.string().optional(),
  title: z.string().min(1, "Study topic or title is required"),
  estimatedDuration: z.number().min(1, "Duration must be at least 1 minute"),
  priority: z.enum(["Low", "Medium", "High", "Critical"] as const),
  notes: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface ScheduleLearningModalProps {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
  skills: Skill[];
  onScheduled?: () => void;
}

export function ScheduleLearningModal({
  open,
  onClose,
  initialDate,
  skills,
  onScheduled,
}: ScheduleLearningModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const defaultDateStr = initialDate || getTodayString();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      date: defaultDateStr,
      skillId: skills.length > 0 ? skills[0].id : "",
      roadmapItemId: "",
      title: "",
      estimatedDuration: 30,
      priority: "Medium",
      notes: "",
      startTime: "",
      endTime: "",
    },
  });

  const selectedSkillId = watch("skillId");
  const selectedDate = watch("date");

  // Sync default date when initialDate changes
  useEffect(() => {
    if (initialDate) {
      setValue("date", initialDate);
    }
  }, [initialDate, setValue]);

  // Sync first skill when skills change
  useEffect(() => {
    if (skills.length > 0 && !watch("skillId")) {
      setValue("skillId", skills[0].id);
    }
  }, [skills, setValue, watch]);

  // Load incomplete roadmap items when selectedSkillId changes
  useEffect(() => {
    if (!user || !selectedSkillId) {
      setRoadmapItems([]);
      return;
    }

    const unsubscribe = subscribeRoadmapItems(user.uid, selectedSkillId, (items) => {
      const incomplete = items.filter(
        (item) => item.status === "Not Started" || item.status === "In Progress"
      );
      setRoadmapItems(incomplete);
    });

    return () => unsubscribe();
  }, [user, selectedSkillId]);

  // When user picks a roadmap item from dropdown, auto-prefill title, duration, notes
  const handleRoadmapSelect = (roadmapItemId: string) => {
    setValue("roadmapItemId", roadmapItemId);
    if (!roadmapItemId) return;

    const target = roadmapItems.find((r) => r.id === roadmapItemId);
    if (target) {
      const selectedSkill = skills.find((s) => s.id === selectedSkillId);
      const skillPrefix = selectedSkill ? `${selectedSkill.name}: ` : "";
      setValue("title", `${skillPrefix}${target.title}`);
      setValue("estimatedDuration", target.estimatedStudyTime || 30);
      setValue("notes", target.description || target.notes || "");
      
      const priorityMap: Record<string, DailyPlanPriority> = {
        Advanced: "High",
        Intermediate: "Medium",
        Beginner: "Low",
      };
      setValue("priority", priorityMap[target.difficulty] || "Medium");
    }
  };

  const handleFormSubmit = async (values: ScheduleFormValues) => {
    if (!user) return;
    setSubmitting(true);

    try {
      await createDailyPlanItem(user.uid, {
        date: values.date,
        skillId: values.skillId,
        roadmapItemId: values.roadmapItemId || "",
        title: values.title,
        estimatedDuration: values.estimatedDuration,
        priority: values.priority,
        notes: values.notes || "",
        status: "Pending",
        startTime: values.startTime || "",
        endTime: values.endTime || "",
      });

      const formattedDate = new Date(values.date + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });

      showToast(`Scheduled "${values.title}" for ${formattedDate}!`, "success");
      onScheduled?.();
      onClose();
      reset();
    } catch (e) {
      console.error(e);
      showToast("Failed to schedule learning session.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Schedule Future Learning"
      description="Plan study topics for upcoming days to stay consistent on your learning goals."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
        
        {/* Date Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-indigo-500" />
            Target Date *
          </label>
          <input
            type="date"
            {...register("date")}
            className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-bold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          {errors.date && <p className="text-[10px] font-bold text-red-500">{errors.date.message}</p>}
        </div>

        {/* Linked Skill Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
            Target Skill *
          </label>
          <select
            {...register("skillId")}
            onChange={(e) => {
              setValue("skillId", e.target.value);
              setValue("roadmapItemId", "");
            }}
            className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-semibold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category})
              </option>
            ))}
          </select>
          {errors.skillId && <p className="text-[10px] font-bold text-red-500">{errors.skillId.message}</p>}
        </div>

        {/* Roadmap Topic Fast Pick */}
        {roadmapItems.length > 0 && (
          <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl dark:bg-indigo-950/20 dark:border-indigo-900/30 space-y-1.5">
            <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Pick Roadmap Step (Optional)
            </label>
            <select
              value={watch("roadmapItemId") || ""}
              onChange={(e) => handleRoadmapSelect(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-indigo-200 bg-white text-xs font-medium focus:outline-hidden dark:border-indigo-900 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="">-- Choose step to prefill --</option>
              {roadmapItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.estimatedStudyTime}m • {item.difficulty})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Title / Topic input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
            Study Topic / Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Next.js App Router Server Actions"
            {...register("title")}
            className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-semibold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          {errors.title && <p className="text-[10px] font-bold text-red-500">{errors.title.message}</p>}
        </div>

        {/* Duration & Priority Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              Duration (Mins) *
            </label>
            <input
              type="number"
              {...register("estimatedDuration", { valueAsNumber: true })}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-bold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
            {errors.estimatedDuration && <p className="text-[10px] font-bold text-red-500">{errors.estimatedDuration.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Priority *</label>
            <select
              {...register("priority")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-semibold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Target Time optional inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Start Time (Optional)</label>
            <input
              type="time"
              {...register("startTime")}
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">End Time (Optional)</label>
            <input
              type="time"
              {...register("endTime")}
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Target Objectives / Notes</label>
          <textarea
            rows={2}
            placeholder="Key concepts to master, documentation links, or goals..."
            {...register("notes")}
            className="w-full p-3 rounded-lg border border-zinc-200 bg-white text-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>Schedule Session</span>
          </button>
        </div>

      </form>
    </Dialog>
  );
}
