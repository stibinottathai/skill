"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/context/toast-context";
import { updateDailyPlanItem } from "@/services/planner";
import { DailyPlanItem } from "@/types/planner";
import { Skill } from "@/types/skill";
import { Dialog } from "@/components/ui/dialog";
import { TimePicker } from "@/components/ui/time-picker";
import { calculateEndTimeFromStart, formatTimeStringToAMPM } from "@/lib/utils";
import { Repeat } from "lucide-react";

const editSeriesSchema = z.object({
  title: z.string().min(1, "Title is required"),
  skillId: z.string().min(1, "Skill is required"),
  estimatedDuration: z.number().min(1, "Duration required"),
  priority: z.enum(["Low", "Medium", "High", "Critical"] as const),
  notes: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

type EditSeriesFormValues = z.infer<typeof editSeriesSchema>;

interface EditRecurringSeriesModalProps {
  open: boolean;
  onClose: () => void;
  /** All items in the recurring series */
  items: DailyPlanItem[];
  skills: Skill[];
}

export function EditRecurringSeriesModal({
  open,
  onClose,
  items,
  skills,
}: EditRecurringSeriesModalProps) {
  const { showToast } = useToast();
  const first = items[0] ?? null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditSeriesFormValues>({
    resolver: zodResolver(editSeriesSchema),
    defaultValues: {
      title: "",
      skillId: "",
      estimatedDuration: 30,
      priority: "Medium",
      notes: "",
      startTime: "",
      endTime: "",
    },
  });

  // Populate form from first item in series when items change
  useEffect(() => {
    if (first) {
      reset({
        title: first.title,
        skillId: first.skillId,
        estimatedDuration: first.estimatedDuration,
        priority: first.priority,
        notes: first.notes || "",
        startTime: first.startTime || "",
        endTime: first.endTime || "",
      });
    }
  }, [first, reset]);

  // Auto-calculate end time when start time or duration changes
  const startTime = watch("startTime");
  const estimatedDuration = watch("estimatedDuration");

  useEffect(() => {
    if (startTime && estimatedDuration) {
      const computed = calculateEndTimeFromStart(startTime, estimatedDuration);
      if (computed) setValue("endTime", computed);
    }
  }, [startTime, estimatedDuration, setValue]);

  const onSubmit = async (values: EditSeriesFormValues) => {
    if (!items.length) return;
    try {
      // Apply changes to ALL items in the series
      await Promise.all(
        items.map((item) =>
          updateDailyPlanItem(item.id, {
            title: values.title,
            skillId: values.skillId,
            estimatedDuration: values.estimatedDuration,
            priority: values.priority,
            notes: values.notes || "",
            startTime: formatTimeStringToAMPM(values.startTime),
            endTime: formatTimeStringToAMPM(values.endTime),
          })
        )
      );
      showToast(`Updated all ${items.length} sessions in series!`, "success");
      onClose();
    } catch {
      showToast("Failed to update series.", "error");
    }
  };

  if (!first) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit Recurring Series"
      description={`Changes will apply to all ${items.length} sessions in this series.`}
      className="max-w-md"
    >
      {/* Series scope notice */}
      <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/50 rounded-xl mb-4">
        <Repeat className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
        <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300">
          Editing all {items.length} sessions — dates are preserved per day
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Study Topic *</label>
            <input
              type="text"
              {...register("title")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
              placeholder="e.g. Node.js Async/Await"
            />
            {errors.title && <p className="text-[10px] font-bold text-red-500">{errors.title.message}</p>}
          </div>

          {/* Skill */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Linked Skill *</label>
            <select
              {...register("skillId")}
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

          {/* Duration + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Duration *</label>
              <select
                {...register("estimatedDuration", { valueAsNumber: true })}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-bold dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden cursor-pointer"
              >
                <option value={15}>15 Mins</option>
                <option value={30}>30 Mins</option>
                <option value={45}>45 Mins</option>
                <option value={60}>1 Hour</option>
                <option value={90}>1.5 Hours</option>
                <option value={120}>2 Hours</option>
                <option value={180}>3 Hours</option>
                <option value={240}>4 Hours</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Priority</label>
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

          {/* Start Time + End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Start Time</label>
              <TimePicker
                value={watch("startTime")}
                onChange={(val) => setValue("startTime", val, { shouldValidate: true })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">End Time (Auto)</label>
              <div className="h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-950 flex items-center justify-between">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {watch("endTime") || "Auto-calculated"}
                </span>
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider bg-zinc-200/50 px-1.5 py-0.5 rounded">
                  Auto
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Notes (Optional)</label>
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full p-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden resize-none"
              placeholder="Links, references, goals..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
          >
            <Repeat className="h-3.5 w-3.5" />
            {isSubmitting ? "Updating..." : `Update All ${items.length} Sessions`}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
