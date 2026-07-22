"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import { subscribeSkills } from "@/services/skills";
import {
  subscribeDailyPlan,
  createDailyPlanItem,
  updateDailyPlanItem,
  deleteDailyPlanItem,
  generateDailyPlanSuggestions,
} from "@/services/planner";
import { subscribeUserSettings } from "@/services/settings";
import { Skill } from "@/types/skill";
import { DailyPlanItem, DailyPlanStatus, DailyPlanPriority } from "@/types/planner";
import { UserSettings } from "@/types/settings";
import { Dialog } from "@/components/ui/dialog";
import { ScheduleLearningModal } from "@/components/planner/schedule-learning-modal";
import {
  Sun,
  CheckCircle2,
  Circle,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Flame,
  Award,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  AlertCircle,
  Calendar,
  Timer,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import { cn, formatTimeStringToAMPM, calculateEndTimeFromStart, timeStringToMinutes } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TimePicker } from "@/components/ui/time-picker";

const planItemSchema = z.object({
  title: z.string().min(1, "Plan title is required"),
  estimatedDuration: z.number().min(1, "Duration must be at least 1 minute"),
  priority: z.enum(["Low", "Medium", "High", "Critical"] as const),
  notes: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  skillId: z.string().min(1, "Skill is required"),
});

type PlanItemFormValues = z.infer<typeof planItemSchema>;

export default function TodayPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [dailyPlan, setDailyPlan] = useState<DailyPlanItem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    weeklyGoalHours: 10,
    monthlyGoalHours: 40,
  });
  const [loading, setLoading] = useState(true);

  // Form modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlanItem, setSelectedPlanItem] = useState<DailyPlanItem | null>(null);

  // Get current date string representation (YYYY-MM-DD)
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayStr = getTodayString();

  // Current time in 12-hour AM/PM format for minTime validation
  const getNowTimeString = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const period = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    const mStr = String(m).padStart(2, "0");
    return `${h12}:${mStr} ${period}`;
  };

  // Current time + 1 hour in 12-hour AM/PM format for default start time
  const getOneHourLaterTimeString = () => {
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    const h = later.getHours();
    const m = later.getMinutes();
    const period = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    // Round minutes down to nearest 5 for a clean default
    const mRounded = Math.floor(m / 5) * 5;
    const mStr = String(mRounded).padStart(2, "0");
    return `${h12}:${mStr} ${period}`;
  };

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlanItemFormValues>({
    resolver: zodResolver(planItemSchema),
    defaultValues: {
      title: "",
      estimatedDuration: 30,
      priority: "Medium",
      notes: "",
      startTime: "",
      endTime: "",
      skillId: "",
    },
  });

  const startTimeWatch = watch("startTime");
  const durationWatch = watch("estimatedDuration");

  // Auto calculate endTime when startTime or duration changes
  useEffect(() => {
    if (startTimeWatch && durationWatch) {
      const computedEnd = calculateEndTimeFromStart(startTimeWatch, durationWatch);
      if (computedEnd) {
        setValue("endTime", computedEnd);
      }
    }
  }, [startTimeWatch, durationWatch, setValue]);

  // Selected date state (defaults to today)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayString());
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const isSelectedDateToday = selectedDateStr === todayStr;

  const navigateDay = (direction: -1 | 1) => {
    const parts = selectedDateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + direction);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setSelectedDateStr(`${yyyy}-${mm}-${dd}`);
  };

  const formattedSelectedDate = useMemo(() => {
    const parts = selectedDateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDateStr]);

  // Load subscriptions
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribeSkills = subscribeSkills(user.uid, (fetchedSkills) => {
      setSkills(fetchedSkills);
    });

    const unsubscribePlan = subscribeDailyPlan(user.uid, selectedDateStr, (fetchedPlan) => {
      setDailyPlan(fetchedPlan);
    });

    const unsubscribeSettings = subscribeUserSettings(user.uid, (settings) => {
      setUserSettings(settings);
      setLoading(false);
    });

    return () => {
      unsubscribeSkills();
      unsubscribePlan();
      unsubscribeSettings();
    };
  }, [user, selectedDateStr]);

  // Sync Form when selectedItem changes
  useEffect(() => {
    if (selectedPlanItem) {
      reset({
        title: selectedPlanItem.title,
        estimatedDuration: selectedPlanItem.estimatedDuration,
        priority: selectedPlanItem.priority,
        notes: selectedPlanItem.notes || "",
        startTime: selectedPlanItem.startTime || "",
        endTime: selectedPlanItem.endTime || "",
        skillId: selectedPlanItem.skillId,
      });
    } else {
      reset({
        title: "",
        estimatedDuration: 30,
        priority: "Medium",
        notes: "",
        startTime: "",
        endTime: "",
        skillId: skills.length > 0 ? skills[0].id : "",
      });
    }
  }, [selectedPlanItem, skills, reset]);

  // Compute daily metrics
  const dailyMetrics = useMemo(() => {
    const totalCount = dailyPlan.length;
    const completedCount = dailyPlan.filter((i) => i.status === "Completed").length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    // Total planned duration in minutes
    const totalPlannedMinutes = dailyPlan.reduce((acc, curr) => acc + curr.estimatedDuration, 0);
    const completedMinutes = dailyPlan
      .filter((i) => i.status === "Completed")
      .reduce((acc, curr) => acc + curr.estimatedDuration, 0);

    const remainingMinutes = Math.max(totalPlannedMinutes - completedMinutes, 0);
    
    // Formatted date header
    const dateHeader = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    return {
      totalCount,
      completedCount,
      progress,
      totalPlannedMinutes,
      remainingMinutes,
      dateHeader,
    };
  }, [dailyPlan]);

  // CRUD actions for planner
  const handleCheckboxToggle = async (item: DailyPlanItem) => {
    const isCompleted = item.status === "Completed";
    const nextStatus: DailyPlanStatus = isCompleted ? "Pending" : "Completed";
    try {
      await updateDailyPlanItem(item.id, {
        status: nextStatus,
        endTime: nextStatus === "Completed" ? new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "",
      });
      showToast(
        nextStatus === "Completed"
          ? `Completed: "${item.title}"!`
          : `Restored: "${item.title}"`,
        "success"
      );
    } catch (e) {
      showToast("Failed to update plan item.", "error");
    }
  };

  const handleFormSubmit = async (values: PlanItemFormValues) => {
    if (!user) return;

    // Block saving a new plan item with a past start time on today's date
    if (!selectedPlanItem && values.startTime && selectedDateStr === todayStr) {
      const nowMins = (() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
      })();
      const startMins = timeStringToMinutes(values.startTime);
      if (startMins !== null && startMins < nowMins) {
        showToast("Start time cannot be in the past. Please pick a future time.", "error");
        return;
      }
    }

    try {
      const sanitizedItem = {
        title: values.title,
        estimatedDuration: values.estimatedDuration,
        priority: values.priority,
        notes: values.notes || "",
        startTime: formatTimeStringToAMPM(values.startTime),
        endTime: formatTimeStringToAMPM(values.endTime),
        skillId: values.skillId,
      };

      if (selectedPlanItem) {
        await updateDailyPlanItem(selectedPlanItem.id, sanitizedItem);
        showToast("Plan item updated successfully!", "success");
      } else {
        await createDailyPlanItem(user.uid, {
          ...sanitizedItem,
          date: selectedDateStr,
          status: "Pending",
        });
        showToast(`Added item to learning plan for ${selectedDateStr}!`, "success");
      }
      setIsEditOpen(false);
      setSelectedPlanItem(null);
    } catch (e) {
      showToast("Failed to save plan item.", "error");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDailyPlanItem(id);
      showToast("Removed from today's plan.", "success");
    } catch (e) {
      showToast("Failed to delete plan item.", "error");
    }
  };

  const skillLookupMap = useMemo(() => {
    const map = new Map<string, Skill>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Welcome Banner & Date Navigator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              {formattedSelectedDate}
            </span>
            {!isSelectedDateToday && (
              <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">
                Scheduled View
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
            Hello, {user?.displayName?.split(" ")[0] || "Learner"}!
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {isSelectedDateToday
              ? "Plan and execute your learning goals for today."
              : `Viewing learning plan scheduled for ${selectedDateStr}.`}
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Navigator Bar */}
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => navigateDay(-1)}
              title="Previous Day"
              className="p-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-850 text-zinc-500 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => e.target.value && setSelectedDateStr(e.target.value)}
              className="h-7 px-2 border-0 bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            />

            <button
              onClick={() => navigateDay(1)}
              title="Next Day"
              className="p-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-850 text-zinc-500 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {!isSelectedDateToday && (
              <button
                onClick={() => setSelectedDateStr(todayStr)}
                className="px-2 py-1 rounded-lg bg-indigo-600 text-white font-extrabold text-[10px] cursor-pointer hover:bg-indigo-500"
              >
                Today
              </button>
            )}
          </div>

          {/* Action Triggers */}
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Calendar className="h-4 w-4" />
            Schedule Future Study
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-3.5 grid-cols-2 md:grid-cols-4">
        
        <div className="p-4.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">Plan Progress</span>
          <div className="flex items-center gap-2.5 mt-1">
            <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{dailyMetrics.progress}%</span>
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              {dailyMetrics.completedCount} / {dailyMetrics.totalCount} items
            </span>
          </div>
        </div>

        <div className="p-4.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">Target study time</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 block leading-none">
            {dailyMetrics.totalPlannedMinutes} mins
          </span>
        </div>

        <div className="p-4.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">Time remaining</span>
          <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block leading-none">
            {dailyMetrics.remainingMinutes} mins
          </span>
        </div>

        <div className="p-4.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">Active Streak</span>
          <span className="text-xl font-extrabold text-orange-600 dark:text-orange-400 mt-1 block leading-none">
            Active Tracker
          </span>
        </div>

      </div>

      {/* Main Study Plan Checklist */}
      <div className="space-y-4">
        
          {/* Heading */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Sun className="h-5 w-5 text-indigo-500" />
              Today's Study Plan
            </h3>
            <button
              onClick={() => {
                setSelectedPlanItem(null);
                reset({
                  title: "",
                  estimatedDuration: 30,
                  priority: "Medium",
                  notes: "",
                  startTime: getOneHourLaterTimeString(),
                  endTime: "",
                  skillId: skills[0]?.id || "",
                });
                setIsEditOpen(true);
              }}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          {/* List items */}
          {dailyPlan.length > 0 ? (
            <div className="space-y-3">
              {dailyPlan.map((item) => {
                const skill = skillLookupMap.get(item.skillId);
                const skillColor = skill?.color || "#6366f1";
                const isCompleted = item.status === "Completed";
                const isSkipped = item.status === "Skipped";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4 transition-all shadow-3xs",
                      isCompleted ? "opacity-75" : ""
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleCheckboxToggle(item)}
                        className="text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 fill-indigo-50 dark:fill-indigo-950/20" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={cn(
                            "text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate",
                            isCompleted && "line-through text-zinc-450 dark:text-zinc-500"
                          )}
                        >
                          {item.title}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span
                            className="text-[9px] font-bold"
                            style={{ color: skillColor }}
                          >
                            {skill?.name || "Skill"}
                          </span>
                          <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-500 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {item.estimatedDuration}m
                          </span>
                          <span className={cn(
                            "text-[8px] font-bold px-1.5 py-0.2 rounded-md",
                            item.priority === "Critical" && "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400",
                            item.priority === "High" && "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
                            item.priority === "Medium" && "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400",
                            item.priority === "Low" && "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          )}>
                            {item.priority}
                          </span>
                          {isCompleted && item.endTime && (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              Done at {item.endTime}
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mt-1 line-clamp-1">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlanItem(item);
                          setIsEditOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-450 hover:text-zinc-900 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs min-h-[250px]">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 mb-4 animate-pulse">
                <Calendar className="h-8 w-8 text-indigo-500" />
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                Plan Your Study Day
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-450 max-w-xs leading-relaxed mb-5">
                Add manual items to your list, or use the Capacity Planner to automatically structure your roadmap curriculum steps.
              </p>
              <button
                onClick={() => {
                  setSelectedPlanItem(null);
                  reset({
                    title: "",
                    estimatedDuration: 30,
                    priority: "Medium",
                    notes: "",
                    startTime: getOneHourLaterTimeString(),
                    endTime: "",
                    skillId: skills[0]?.id || "",
                  });
                  setIsEditOpen(true);
                }}
                className="flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add First Item
              </button>
            </div>
          )}
      </div>

      {/* 1. MANUAL PLAN ITEM FORM DIALOG */}
      <Dialog
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedPlanItem(null);
        }}
        title={selectedPlanItem ? "Edit Plan Item" : "Add Plan Item"}
        description="Manual task or study roadmap item target."
        className="max-w-md"
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col">
        <div className="space-y-4 pt-2 overflow-y-auto max-h-[70vh] pr-1">
          
          {/* Skill Link select */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Linked Skill *</label>
            <select
              {...register("skillId")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden font-semibold"
            >
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.skillId && <p className="text-[10px] font-bold text-red-500">{errors.skillId.message}</p>}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Plan Title *</label>
            <input
              type="text"
              {...register("title")}
              className={cn(
                "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
                errors.title && "border-red-500"
              )}
              placeholder="e.g. Read Python generators documentation"
            />
            {errors.title && <p className="text-[10px] font-bold text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Est. Duration *</label>
              <select
                {...register("estimatedDuration", { valueAsNumber: true })}
                className={cn(
                  "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-bold dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden cursor-pointer",
                  errors.estimatedDuration && "border-red-500"
                )}
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
              {errors.estimatedDuration && (
                <p className="text-[10px] font-bold text-red-500">{errors.estimatedDuration.message}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Priority</label>
              <select
                {...register("priority")}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Notes (Optional)</label>
            <textarea
              {...register("notes")}
              className="w-full min-h-[60px] p-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
              placeholder="Cheatsheets links, setup checklist, pointers..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start time */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Start Time</label>
              <TimePicker
                value={watch("startTime")}
                onChange={(val) => setValue("startTime", val, { shouldValidate: true })}
                minTime={!selectedPlanItem ? getNowTimeString() : undefined}
              />
              {errors.startTime && <p className="text-[10px] font-bold text-red-500">{errors.startTime.message}</p>}
              {!selectedPlanItem && (
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Past times are disabled</p>
              )}
            </div>
            {/* End time */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">End Time (Auto-calculated)</label>
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
        </div>{/* end scrollable area */}

          {/* Action buttons - sticky at bottom */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedPlanItem(null);
              }}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              Save Item
            </button>
          </div>

        </form>
      </Dialog>

      {/* 3. POMODORO LOG STUDY SESSION DIALOG */}
      {/* 3. SCHEDULE LEARNING MODAL */}
      <ScheduleLearningModal
        open={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        initialDate={selectedDateStr}
        skills={skills}
      />

    </div>
  );
}
