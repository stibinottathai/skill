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
import { SessionFormModal } from "@/components/sessions/session-form-modal";
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
  Sliders,
  CheckSquare,
  AlertCircle,
  Calendar,
  Timer,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Motivation Quotes List
const MOTIVATIONAL_QUOTES = [
  { text: "The only way to learn a new programming language is by writing programs in it.", author: "Dennis Ritchie" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
  { text: "Progress is not in enhancing what is, but in advancing toward what will be.", author: "Kahlil Gibran" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "One concept at a time. Consistency beats intensity.", author: "Developer Rule" },
];

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

  const [skills, setSkills] = useState<Skill[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlanItem[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    weeklyGoalHours: 10,
    monthlyGoalHours: 40,
  });
  const [loading, setLoading] = useState(true);

  // Form controls
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlanItem, setSelectedPlanItem] = useState<DailyPlanItem | null>(null);

  // Capacity suggester modal state
  const [isSuggesterOpen, setIsSuggesterOpen] = useState(false);
  const [availableTimeInput, setAvailableTimeInput] = useState(90); // default 90 mins capacity
  const [suggestedItems, setSuggestedItems] = useState<Omit<DailyPlanItem, "id" | "userId" | "createdAt" | "updatedAt">[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Pomodoro states
  const [pomodoroMode, setPomodoroMode] = useState<"work" | "break">("work");
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(0);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Study log modal prompt after pomodoro completion
  const [isPomodoroLogOpen, setIsPomodoroLogOpen] = useState(false);
  const [completedPomodoroDuration, setCompletedPomodoroDuration] = useState(25);

  // Get current date string representation (YYYY-MM-DD)
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayStr = getTodayString();

  // Quote of the day
  const randomQuote = useMemo(() => {
    // Deterministic selection based on day number
    const day = new Date().getDate();
    return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
  }, []);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
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

  // Load subscriptions
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribeSkills = subscribeSkills(user.uid, (fetchedSkills) => {
      setSkills(fetchedSkills);
    });

    const unsubscribePlan = subscribeDailyPlan(user.uid, todayStr, (fetchedPlan) => {
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
  }, [user, todayStr]);

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
    try {
      const sanitizedItem = {
        title: values.title,
        estimatedDuration: values.estimatedDuration,
        priority: values.priority,
        notes: values.notes || "",
        startTime: values.startTime || "",
        endTime: values.endTime || "",
        skillId: values.skillId,
      };

      if (selectedPlanItem) {
        await updateDailyPlanItem(selectedPlanItem.id, sanitizedItem);
        showToast("Plan item updated successfully!", "success");
      } else {
        await createDailyPlanItem(user.uid, {
          ...sanitizedItem,
          date: todayStr,
          status: "Pending",
        });
        showToast("Added item to today's learning plan!", "success");
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

  // Capacity Suggestion Actions
  const handleTriggerSuggester = async () => {
    if (!user) return;
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = await generateDailyPlanSuggestions(user.uid, todayStr, availableTimeInput);
      setSuggestedItems(suggestions);
      if (suggestions.length === 0) {
        showToast("No suggested roadmap items fit inside this capacity.", "info");
      }
    } catch (e) {
      showToast("Error generating plan.", "error");
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleSaveSuggestedPlan = async () => {
    if (!user || suggestedItems.length === 0) return;
    try {
      const batchPromises = suggestedItems.map((item) => createDailyPlanItem(user.uid, item));
      await Promise.all(batchPromises);
      showToast(`Added ${suggestedItems.length} topics to today's plan!`, "success");
      setIsSuggesterOpen(false);
      setSuggestedItems([]);
    } catch (e) {
      showToast("Failed to save plan.", "error");
    }
  };

  // Pomodoro Actions
  useEffect(() => {
    if (isPomodoroActive) {
      timerRef.current = setInterval(() => {
        if (pomodoroSeconds > 0) {
          setPomodoroSeconds(pomodoroSeconds - 1);
        } else if (pomodoroSeconds === 0) {
          if (pomodoroMinutes > 0) {
            setPomodoroMinutes(pomodoroMinutes - 1);
            setPomodoroSeconds(59);
          } else {
            // Timer complete!
            handleTimerComplete();
          }
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPomodoroActive, pomodoroMinutes, pomodoroSeconds]);

  const handleTimerComplete = () => {
    setIsPomodoroActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Play sound notification
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      oscillator.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.8);
    } catch (e) {}

    showToast(
      pomodoroMode === "work"
        ? "Great job! Pomodoro session completed! Time for a break."
        : "Break complete! Ready to start the next session?",
      "success"
    );

    if (pomodoroMode === "work") {
      setCompletedPomodoroDuration(25); // assume 25 mins completed
      setIsPomodoroLogOpen(true); // Open study logging prefill prompt!
      
      // Auto switch to break mode
      setPomodoroMode("break");
      setPomodoroMinutes(5);
      setPomodoroSeconds(0);
    } else {
      setPomodoroMode("work");
      setPomodoroMinutes(25);
      setPomodoroSeconds(0);
    }
  };

  const handleToggleTimer = () => {
    setIsPomodoroActive(!isPomodoroActive);
  };

  const handleResetTimer = () => {
    setIsPomodoroActive(false);
    setPomodoroMinutes(pomodoroMode === "work" ? 25 : 5);
    setPomodoroSeconds(0);
  };

  const handleSetTimerMode = (mode: "work" | "break") => {
    setIsPomodoroActive(false);
    setPomodoroMode(mode);
    setPomodoroMinutes(mode === "work" ? 25 : 5);
    setPomodoroSeconds(0);
  };

  const skillLookupMap = useMemo(() => {
    const map = new Map<string, Skill>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">{dailyMetrics.dateHeader}</span>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
            Hello, {user?.displayName?.split(" ")[0] || "Learner"}!
          </h2>
          <p className="text-sm text-zinc-550 dark:text-zinc-450 leading-none mt-1">
            "What should I study today?" Answer it in one click below.
          </p>
        </div>

        <button
          onClick={() => {
            setAvailableTimeInput(userSettings.weeklyGoalHours ? Math.round((userSettings.weeklyGoalHours * 60) / 5) : 90);
            setSuggestedItems([]);
            setIsSuggesterOpen(true);
          }}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Sliders className="h-4.5 w-4.5" />
          Capacity Planner
        </button>
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

      {/* Main Grid: Plan checklist & Pomodoro Timer */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Planner list checklist */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Motivation Quote panel */}
          <div className="p-4 bg-indigo-50/40 border border-indigo-100/50 dark:bg-indigo-950/10 dark:border-indigo-900/20 rounded-2xl">
            <p className="text-xs italic text-indigo-700 dark:text-indigo-300 leading-relaxed font-semibold">
              "{randomQuote.text}"
            </p>
            <p className="text-[10px] text-indigo-450 dark:text-indigo-500 font-bold mt-1 text-right">
              — {randomQuote.author}
            </p>
          </div>

          {/* Heading */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Sun className="h-5 w-5 text-indigo-500" />
              Today's Study Plan
            </h3>
            <button
              onClick={() => {
                setSelectedPlanItem(null);
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

        {/* Pomodoro Timer widget block */}
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-5 text-center flex flex-col justify-center min-h-[300px]">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Timer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">
                Pomodoro Focus
              </h3>
            </div>

            {/* Mode selection buttons */}
            <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-zinc-950 rounded-xl max-w-[180px] mx-auto border border-zinc-150 dark:border-zinc-850">
              <button
                onClick={() => handleSetTimerMode("work")}
                className={cn(
                  "flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-all",
                  pomodoroMode === "work"
                    ? "bg-white text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400 shadow-3xs"
                    : "text-zinc-400"
                )}
              >
                Work
              </button>
              <button
                onClick={() => handleSetTimerMode("break")}
                className={cn(
                  "flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-all",
                  pomodoroMode === "break"
                    ? "bg-white text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400 shadow-3xs"
                    : "text-zinc-400"
                )}
              >
                Break
              </button>
            </div>

            {/* Timer Counter */}
            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight tabular-nums">
                {String(pomodoroMinutes).padStart(2, "0")}:{String(pomodoroSeconds).padStart(2, "0")}
              </div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">
                {pomodoroMode === "work" ? "Focus Session" : "Short Break"}
              </p>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              <button
                onClick={handleToggleTimer}
                className={cn(
                  "flex h-10 w-24 items-center justify-center gap-1.5 rounded-xl font-bold text-xs text-white shadow-xs cursor-pointer active:scale-95 transition-all",
                  isPomodoroActive ? "bg-amber-600 hover:bg-amber-500" : "bg-indigo-600 hover:bg-indigo-500"
                )}
              >
                {isPomodoroActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPomodoroActive ? "Pause" : "Start"}
              </button>
              <button
                onClick={handleResetTimer}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <RotateCcw className="h-4.5 w-4.5 text-zinc-450" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 1. CAPACITY PLANNER DIALOG MODAL */}
      <Dialog
        open={isSuggesterOpen}
        onClose={() => setIsSuggesterOpen(false)}
        title="Daily Capacity Planner"
        description="Auto suggest daily study sessions based on roadmap targets."
        className="max-w-lg"
      >
        <div className="space-y-4 pt-2">
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">
              Available Study Time Today (Minutes)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={availableTimeInput}
                onChange={(e) => setAvailableTimeInput(Number(e.target.value))}
                className="w-full max-w-[120px] h-9 px-3 rounded-lg border border-zinc-200 text-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 font-bold"
              />
              <button
                onClick={handleTriggerSuggester}
                disabled={isGeneratingSuggestions}
                className="flex items-center justify-center gap-1 px-4 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
              >
                Suggest Roadmap Steps
              </button>
            </div>
          </div>

          <div className="my-2 h-px bg-zinc-150 dark:bg-zinc-800" />

          {/* Suggestions List */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {suggestedItems.length > 0 ? (
              suggestedItems.map((item, idx) => {
                const skill = skillLookupMap.get(item.skillId);
                return (
                  <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block truncate">{item.title}</span>
                      <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-500 block">
                        Estimated: {item.estimatedDuration} mins • Priority: {item.priority}
                      </span>
                    </div>
                    
                    {/* Inline remove option */}
                    <button
                      onClick={() => setSuggestedItems(suggestedItems.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-xs cursor-pointer font-bold"
                    >
                      Remove
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-400 italic text-center py-6">
                {isGeneratingSuggestions ? "Querying roadmap steps..." : "No suggestions compiled yet."}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-6">
            <button
              onClick={() => {
                setIsSuggesterOpen(false);
                setSuggestedItems([]);
              }}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSuggestedPlan}
              disabled={suggestedItems.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Save Daily Plan
            </button>
          </div>

        </div>
      </Dialog>

      {/* 2. MANUAL PLAN ITEM FORM DIALOG */}
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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          
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
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Est. Duration (Mins) *</label>
              <input
                type="number"
                {...register("estimatedDuration", { valueAsNumber: true })}
                className={cn(
                  "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
                  errors.estimatedDuration && "border-red-500"
                )}
              />
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
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Start Time (Optional)</label>
              <input
                type="text"
                {...register("startTime")}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
                placeholder="e.g. 10:00 AM"
              />
            </div>
            {/* End time */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">End Time (Optional)</label>
              <input
                type="text"
                {...register("endTime")}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
                placeholder="e.g. 11:30 AM"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-6">
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
      <SessionFormModal
        open={isPomodoroLogOpen}
        onClose={() => setIsPomodoroLogOpen(false)}
        onSubmit={async (values) => {
          if (!user) return;
          try {
            const { createLearningSession } = await import("@/services/learning-sessions");
            await createLearningSession(user.uid, values);
            showToast("Logged Pomodoro study session successfully!", "success");
            setIsPomodoroLogOpen(false);
          } catch (e) {
            showToast("Failed to save session.", "error");
          }
        }}
        skills={skills}
        session={null}
        prefilledSkillId={skills.length > 0 ? skills[0].id : ""}
        prefilledTopic="Completed Focus Pomodoro Cycle"
      />

    </div>
  );
}
