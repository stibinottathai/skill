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
import { Calendar as CalendarIcon, Clock, BookOpen, Sparkles, CheckCircle2, Repeat } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatTimeStringToAMPM, calculateEndTimeFromStart, timeStringToMinutes } from "@/lib/utils";
import { TimePicker } from "@/components/ui/time-picker";

const scheduleSchema = z
  .object({
    date: z.string().min(1, "Target date is required"),
    skillId: z.string().min(1, "Linked skill is required"),
    roadmapItemId: z.string().optional(),
    title: z.string().optional(),
    estimatedDuration: z.number().min(1, "Duration must be at least 1 minute"),
    priority: z.enum(["Low", "Medium", "High", "Critical"] as const),
    notes: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    isRecurringDaily: z.boolean().optional(),
    recurringDaysCount: z.number().optional(),
  })
  .refine(
    (data) => {
      if (!data.isRecurringDaily) {
        return !!data.title && data.title.trim().length > 0;
      }
      return true;
    },
    {
      message: "Study topic or title is required for single date sessions",
      path: ["title"],
    }
  )
  .refine(
    (data) => {
      if (!data.date) return true;
      // Date must be tomorrow or later
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(data.date + "T00:00:00");
      return selected > today;
    },
    {
      message: "You can only schedule from tomorrow onwards",
      path: ["date"],
    }
  );

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

  const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Default date is tomorrow (future scheduling only)
  const tomorrowStr = getTomorrowString();
  const defaultDateStr = (initialDate && initialDate > getTodayString()) ? initialDate : tomorrowStr;

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
      isRecurringDaily: false,
      recurringDaysCount: 30,
    },
  });

  const selectedSkillId = watch("skillId");
  const selectedDate = watch("date");
  const isRecurringDaily = watch("isRecurringDaily");

  // Sync default date when initialDate changes — only accept future dates
  useEffect(() => {
    if (initialDate && initialDate > getTodayString()) {
      setValue("date", initialDate);
    } else {
      setValue("date", tomorrowStr);
    }
  }, [initialDate, setValue]);

  // Sync first skill when skills change
  useEffect(() => {
    if (skills.length > 0 && !watch("skillId")) {
      setValue("skillId", skills[0].id);
    }
  }, [skills, setValue, watch]);

  const startTime = watch("startTime");
  const estimatedDuration = watch("estimatedDuration");

  // Auto calculate endTime when startTime or duration changes
  useEffect(() => {
    if (startTime && estimatedDuration) {
      const computedEnd = calculateEndTimeFromStart(startTime, estimatedDuration);
      if (computedEnd) {
        setValue("endTime", computedEnd);
      }
    }
  }, [startTime, estimatedDuration, setValue]);

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

    const selectedSkill = skills.find((s) => s.id === values.skillId);
    const defaultSkillTitle = selectedSkill ? `Daily ${selectedSkill.name} Study` : "Daily Study Session";
    const finalTitle = values.title?.trim() || defaultSkillTitle;

    const formattedStartTime = formatTimeStringToAMPM(values.startTime);
    const formattedEndTime = formatTimeStringToAMPM(values.endTime);

    try {
      if (values.isRecurringDaily) {
        const daysToSchedule = values.recurringDaysCount || 30;
        const startDate = new Date(values.date + "T00:00:00");

        const promises = [];
        for (let i = 0; i < daysToSchedule; i++) {
          const curr = new Date(startDate);
          curr.setDate(startDate.getDate() + i);
          const yyyy = curr.getFullYear();
          const mm = String(curr.getMonth() + 1).padStart(2, "0");
          const dd = String(curr.getDate()).padStart(2, "0");
          const dateStr = `${yyyy}-${mm}-${dd}`;

          promises.push(
            createDailyPlanItem(user.uid, {
              date: dateStr,
              skillId: values.skillId,
              roadmapItemId: values.roadmapItemId || "",
              title: finalTitle,
              estimatedDuration: values.estimatedDuration,
              priority: values.priority,
              notes: values.notes || "",
              status: "Pending",
              startTime: formattedStartTime,
              endTime: formattedEndTime,
              isRecurringDaily: true,
            })
          );
        }

        await Promise.all(promises);
        showToast(
          `Automatically scheduled "${finalTitle}" daily for the next ${daysToSchedule} days!`,
          "success"
        );
      } else {
        await createDailyPlanItem(user.uid, {
          date: values.date,
          skillId: values.skillId,
          roadmapItemId: values.roadmapItemId || "",
          title: finalTitle,
          estimatedDuration: values.estimatedDuration,
          priority: values.priority,
          notes: values.notes || "",
          status: "Pending",
          startTime: formattedStartTime,
          endTime: formattedEndTime,
        });

        const formattedDate = new Date(values.date + "T00:00:00").toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });

        showToast(`Scheduled "${finalTitle}" for ${formattedDate}!`, "success");
      }

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
            Start Date *
          </label>
          <input
            type="date"
            {...register("date")}
            min={tomorrowStr}
            className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-bold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          {errors.date && <p className="text-[10px] font-bold text-red-500">{errors.date.message}</p>}
          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Scheduling available from tomorrow onwards</p>
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
            Study Topic / Title {isRecurringDaily ? "(Optional for Daily Schedule)" : "*"}
          </label>
          <input
            type="text"
            placeholder={
              isRecurringDaily
                ? `Defaults to "Daily ${skills.find((s) => s.id === selectedSkillId)?.name || "Skill"} Study"`
                : "e.g. JavaScript Arrays & Async Functions"
            }
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
            <select
              {...register("estimatedDuration", { valueAsNumber: true })}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-bold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 cursor-pointer"
            >
              <option value={15}>15 Mins</option>
              <option value={30}>30 Mins</option>
              <option value={45}>45 Mins</option>
              <option value={60}>1 Hour</option>
              <option value={90}>1.5 Hours (1 hr 30 mins)</option>
              <option value={120}>2 Hours</option>
              <option value={180}>3 Hours</option>
              <option value={240}>4 Hours</option>
            </select>
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
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Start Time</label>
            <TimePicker
              value={watch("startTime")}
              onChange={(val) => setValue("startTime", val, { shouldValidate: true })}
            />
            {errors.startTime && <p className="text-[10px] font-bold text-red-500">{errors.startTime.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">End Time (Auto-calculated)</label>
            <div className="h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-950 flex items-center justify-between">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {watch("endTime") || "Auto-calculated"}
              </span>
              <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider bg-zinc-200/50 dark:bg-zinc-850 px-1.5 py-0.5 rounded">
                Auto
              </span>
            </div>
          </div>
        </div>

        {/* Recurring Daily Option */}
        <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl dark:bg-indigo-950/20 dark:border-indigo-900/40 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("isRecurringDaily")}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Schedule automatically every day at this time
            </span>
          </label>

          {isRecurringDaily && (
            <div className="pt-1.5 flex items-center justify-between gap-3 text-xs border-t border-indigo-100 dark:border-indigo-900/30">
              <label className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                Repeat duration:
              </label>
              <select
                {...register("recurringDaysCount", { valueAsNumber: true })}
                className="h-8 px-2 rounded-lg border border-indigo-200 bg-white text-xs font-bold focus:outline-hidden dark:border-indigo-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value={7}>Next 7 days (1 week)</option>
                <option value={14}>Next 14 days (2 weeks)</option>
                <option value={30}>Next 30 days (1 month)</option>
                <option value={60}>Next 60 days (2 months)</option>
                <option value={90}>Next 90 days (3 months)</option>
              </select>
            </div>
          )}
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
            <span>{isRecurringDaily ? "Schedule Daily Sessions" : "Schedule Session"}</span>
          </button>
        </div>

      </form>
    </Dialog>
  );
}
