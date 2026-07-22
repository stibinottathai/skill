"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import { subscribeAllDailyPlans, updateDailyPlanItem, deleteDailyPlanItem } from "@/services/planner";
import { subscribeSkills } from "@/services/skills";
import { DailyPlanItem, DailyPlanStatus, DailyPlanPriority } from "@/types/planner";
import { Skill } from "@/types/skill";
import { ScheduleLearningModal } from "@/components/planner/schedule-learning-modal";
import { EditScheduledStudyModal } from "@/components/planner/edit-scheduled-study-modal";
import { EditRecurringSeriesModal } from "@/components/planner/edit-recurring-series-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CalendarDays,
  Search,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Clock,
  Sparkles,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Calendar,
  Layers,
  Repeat,
  Edit2,
} from "lucide-react";
import Link from "next/link";
import { cn, formatTimeStringToAMPM } from "@/lib/utils";

export type UpcomingStudyGroup =
  | {
      type: "single";
      id: string;
      plan: DailyPlanItem;
    }
  | {
      type: "recurring_group";
      id: string;
      title: string;
      skillId: string;
      startTime: string;
      estimatedDuration: number;
      priority: DailyPlanPriority;
      notes: string;
      startDate: string;
      endDate: string;
      totalDays: number;
      completedCount: number;
      items: DailyPlanItem[];
    };

export default function UpcomingStudiesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [allPlans, setAllPlans] = useState<DailyPlanItem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "Pending" | "Completed">("all");
  const [timeframe, setTimeframe] = useState<"all" | "today" | "recurring" | "week" | "month">("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<DailyPlanItem | null>(null);
  const [editGroupItems, setEditGroupItems] = useState<DailyPlanItem[]>([]);

  // Confirm-delete state
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "single" | "series";
    id?: string;
    title: string;
    items?: DailyPlanItem[];
  } | null>(null);

  // Expanded recurring groups state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Subscriptions
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribeSkills = subscribeSkills(user.uid, (fetchedSkills) => {
      setSkills(fetchedSkills);
    });

    const unsubscribePlans = subscribeAllDailyPlans(user.uid, (fetchedPlans) => {
      setAllPlans(fetchedPlans);
      setLoading(false);
    });

    return () => {
      unsubscribeSkills();
      unsubscribePlans();
    };
  }, [user]);

  // Skill Lookup Map
  const skillMap = useMemo(() => {
    const map = new Map<string, Skill>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  // Today Date string helper
  const todayStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Format short date (e.g. Jul 22)
  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) {
      return dateStr;
    }
  };

  // Filtered Plans Raw
  const filteredRawPlans = useMemo(() => {
    // 1. Keep plans date >= todayStr
    let result = allPlans.filter((p) => p.date >= todayStr);

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }

    // 3. Skill filter
    if (selectedSkillId !== "all") {
      result = result.filter((p) => p.skillId === selectedSkillId);
    }

    // 4. Status filter
    if (selectedStatus !== "all") {
      result = result.filter((p) => p.status === selectedStatus);
    }

    // 5. Timeframe filter
    if (timeframe === "today") {
      result = result.filter((p) => p.date === todayStr);
    } else if (timeframe === "recurring") {
      result = result.filter((p) => p.isRecurringDaily);
    } else if (timeframe === "week") {
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const yyyy = nextWeekDate.getFullYear();
      const mm = String(nextWeekDate.getMonth() + 1).padStart(2, "0");
      const dd = String(nextWeekDate.getDate()).padStart(2, "0");
      const weekLimitStr = `${yyyy}-${mm}-${dd}`;
      result = result.filter((p) => p.date <= weekLimitStr);
    } else if (timeframe === "month") {
      const nextMonthDate = new Date();
      nextMonthDate.setDate(nextMonthDate.getDate() + 30);
      const yyyy = nextMonthDate.getFullYear();
      const mm = String(nextMonthDate.getMonth() + 1).padStart(2, "0");
      const dd = String(nextMonthDate.getDate()).padStart(2, "0");
      const monthLimitStr = `${yyyy}-${mm}-${dd}`;
      result = result.filter((p) => p.date <= monthLimitStr);
    }

    return result;
  }, [allPlans, todayStr, searchQuery, selectedSkillId, selectedStatus, timeframe]);

  // Group recurring items into unified series tiles
  const groupedStudyTiles = useMemo(() => {
    const groups: UpcomingStudyGroup[] = [];
    const recurringMap = new Map<string, DailyPlanItem[]>();

    filteredRawPlans.forEach((plan) => {
      if (plan.isRecurringDaily) {
        const groupKey = `${plan.skillId}__${plan.title.trim().toLowerCase()}__${plan.startTime}`;
        if (!recurringMap.has(groupKey)) {
          recurringMap.set(groupKey, []);
        }
        recurringMap.get(groupKey)!.push(plan);
      } else {
        groups.push({
          type: "single",
          id: plan.id,
          plan,
        });
      }
    });

    recurringMap.forEach((items, key) => {
      items.sort((a, b) => a.date.localeCompare(b.date));
      const first = items[0];
      const last = items[items.length - 1];
      const completedCount = items.filter((i) => i.status === "Completed").length;

      groups.push({
        type: "recurring_group",
        id: key,
        title: first.title,
        skillId: first.skillId,
        startTime: first.startTime,
        estimatedDuration: first.estimatedDuration,
        priority: first.priority,
        notes: first.notes,
        startDate: first.date,
        endDate: last.date,
        totalDays: items.length,
        completedCount,
        items,
      });
    });

    return groups.sort((a, b) => {
      const dateA = a.type === "single" ? a.plan.date : a.startDate;
      const dateB = b.type === "single" ? b.plan.date : b.startDate;
      return dateA.localeCompare(dateB);
    });
  }, [filteredRawPlans]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSkillId, selectedStatus, timeframe]);

  // Paginated Results
  const totalPages = Math.max(1, Math.ceil(groupedStudyTiles.length / ITEMS_PER_PAGE));
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return groupedStudyTiles.slice(start, start + ITEMS_PER_PAGE);
  }, [groupedStudyTiles, currentPage]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalUpcoming = allPlans.filter((p) => p.date >= todayStr).length;
    const todayCount = allPlans.filter((p) => p.date === todayStr).length;
    
    // Count unique recurring daily series
    const recurringSeriesSet = new Set(
      allPlans
        .filter((p) => p.date >= todayStr && p.isRecurringDaily)
        .map((p) => `${p.skillId}__${p.title.trim().toLowerCase()}__${p.startTime}`)
    );
    const recurringSeriesCount = recurringSeriesSet.size;

    const totalMins = allPlans
      .filter((p) => p.date >= todayStr)
      .reduce((acc, curr) => acc + (curr.estimatedDuration || 0), 0);
    const totalHours = (totalMins / 60).toFixed(1);
    const highPriority = allPlans.filter(
      (p) => p.date >= todayStr && (p.priority === "High" || p.priority === "Critical")
    ).length;

    return { totalUpcoming, todayCount, recurringSeriesCount, totalHours, highPriority };
  }, [allPlans, todayStr]);

  // Actions
  const handleToggleStatus = async (plan: DailyPlanItem) => {
    const nextStatus: DailyPlanStatus = plan.status === "Completed" ? "Pending" : "Completed";
    try {
      await updateDailyPlanItem(plan.id, {
        status: nextStatus,
        endTime: nextStatus === "Completed" ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      });
      showToast(
        nextStatus === "Completed" ? `Completed "${plan.title}"!` : `Restored "${plan.title}" to pending.`,
        "success"
      );
    } catch (e) {
      showToast("Failed to update status.", "error");
    }
  };

  const handleDeleteSingle = (id: string, title: string) => {
    setConfirmDelete({ type: "single", id, title });
  };

  const handleDeleteGroupSeries = (items: DailyPlanItem[], title: string) => {
    setConfirmDelete({ type: "series", title, items });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "single" && confirmDelete.id) {
        await deleteDailyPlanItem(confirmDelete.id);
        showToast(`Removed "${confirmDelete.title}" from schedule.`, "success");
      } else if (confirmDelete.type === "series" && confirmDelete.items) {
        await Promise.all(confirmDelete.items.map((i) => deleteDailyPlanItem(i.id)));
        showToast(`Removed recurring series "${confirmDelete.title}" (${confirmDelete.items.length} days).`, "success");
      }
    } catch {
      showToast("Failed to delete. Please try again.", "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-150 dark:bg-zinc-850 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-650 to-violet-600 p-5 text-white shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/15 text-[10px] font-extrabold backdrop-blur-xs tracking-wider">
              📅 SCHEDULED CURRICULUM
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Upcoming Scheduled Studies
            </h2>
            <p className="text-indigo-100 text-xs max-w-xl leading-normal">
              Organize single & recurring daily study sessions, track upcoming roadmap topics, and stay consistent.
            </p>
          </div>

          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-indigo-600 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4 text-indigo-600" />
            Schedule New Study
          </button>
        </div>
        <div className="absolute right-[-2%] top-[-30%] h-36 w-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="p-4.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">Total Scheduled</span>
          <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 block leading-none">
            {metrics.totalUpcoming} sessions
          </span>
        </div>

        <div className="p-4.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">Scheduled Today</span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block leading-none">
            {metrics.todayCount} sessions
          </span>
        </div>

        <div className="p-4.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">Recurring Daily Series</span>
          <span className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1 block leading-none flex items-center gap-1.5">
            <Repeat className="h-5 w-5 text-violet-500" />
            {metrics.recurringSeriesCount} active
          </span>
        </div>

        <div className="p-4.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">High Priority</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block leading-none">
            {metrics.highPriority} sessions
          </span>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xs">
        
        {/* Timeframe Tabs */}
        <div className="flex border-b border-zinc-150 dark:border-zinc-800 pb-2 gap-1 overflow-x-auto">
          {[
            { id: "all", label: "All Upcoming" },
            { id: "today", label: "Today" },
            { id: "recurring", label: "🔁 Daily Recurring Series" },
            { id: "week", label: "Next 7 Days" },
            { id: "month", label: "Next 30 Days" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeframe(tab.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                timeframe === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Secondary Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by topic title or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-zinc-200 bg-white text-xs font-medium focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-955 dark:text-zinc-50"
            />
          </div>

          {/* Skill Filter */}
          <select
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
            className="h-9 px-3 rounded-xl border border-zinc-200 bg-white text-xs font-semibold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-955 dark:text-zinc-50"
          >
            <option value="all">All Skills</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="h-9 px-3 rounded-xl border border-zinc-200 bg-white text-xs font-semibold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-955 dark:text-zinc-50"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>

        </div>

      </div>

      {/* Paginated Study Session Tiles */}
      {paginatedGroups.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {paginatedGroups.map((group) => {
              if (group.type === "recurring_group") {
                const skill = skillMap.get(group.skillId);
                const todayItem = group.items.find((i) => i.date === todayStr);

                return (
                  <div
                    key={group.id}
                    className="p-4 bg-white dark:bg-zinc-900 border border-violet-200 dark:border-violet-900/40 rounded-2xl shadow-xs space-y-3 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      {/* Header Badges */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 flex items-center gap-1 border border-violet-200 dark:border-violet-800">
                            <Repeat className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                            Everyday {group.startTime ? `@ ${formatTimeStringToAMPM(group.startTime)}` : ""}
                          </span>

                          <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
                            {group.totalDays} Days Series ({formatShortDate(group.startDate)} – {formatShortDate(group.endDate)})
                          </span>
                        </div>

                        <span className={cn(
                          "text-[8px] font-bold px-2 py-0.5 rounded shrink-0",
                          group.priority === "Critical" && "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400",
                          group.priority === "High" && "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
                          group.priority === "Medium" && "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400",
                          group.priority === "Low" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        )}>
                          {group.priority} Priority
                        </span>
                      </div>

                      {/* Title & Skill */}
                      <div>
                        {skill && (
                          <span className="text-[10px] font-extrabold block mb-0.5" style={{ color: skill.color }}>
                            {skill.name} ({skill.category})
                          </span>
                        )}
                        <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-50 leading-snug">
                          {group.title}
                        </h4>
                      </div>

                      {/* Progress Bar for the Recurring Series */}
                      <div className="space-y-1 bg-zinc-50 dark:bg-zinc-955 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-zinc-500 dark:text-zinc-400">Series Completion</span>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {group.completedCount} of {group.totalDays} days completed ({Math.round((group.completedCount / group.totalDays) * 100)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((group.completedCount / group.totalDays) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Today's Quick Action */}
                      {todayItem && (
                        <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between text-xs">
                          <span className="font-bold text-indigo-900 dark:text-indigo-200 text-[11px]">
                            Today's Session: {todayItem.status}
                          </span>
                          <button
                            onClick={() => handleToggleStatus(todayItem)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px] shadow-2xs cursor-pointer"
                          >
                            {todayItem.status === "Completed" ? "✓ Completed" : "Mark Today Done"}
                          </button>
                        </div>
                      )}

                      {group.notes && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium bg-zinc-50 dark:bg-zinc-955 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850/80">
                          {group.notes}
                        </p>
                      )}
                    </div>

                      {/* Footer Actions */}
                      <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                        <div className="flex items-center justify-between text-xs">
                          <button
                            onClick={() => toggleGroupExpand(group.id)}
                            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                          >
                            <span>{expandedGroups[group.id] ? "Hide Daily Dates" : `View All ${group.totalDays} Days`}</span>
                            {expandedGroups[group.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditGroupItems(group.items)}
                              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-500 hover:text-violet-600 transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1"
                              title="Edit all sessions in this series"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Edit Series</span>
                            </button>
                            <button
                              onClick={() => handleDeleteGroupSeries(group.items, group.title)}
                              className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1"
                              title="Delete entire recurring schedule series"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Series</span>
                            </button>
                          </div>
                        </div>

                      {/* Expanded list of days */}
                      {expandedGroups[group.id] && (
                        <div className="pt-2 space-y-1.5 max-h-48 overflow-y-auto border-t border-zinc-100 dark:border-zinc-850 pr-1">
                          {group.items.map((item) => (
                            <div key={item.id} className="p-2 bg-zinc-50 dark:bg-zinc-955 rounded-lg flex items-center justify-between text-xs border border-zinc-200/50 dark:border-zinc-800/50">
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                {item.date === todayStr ? "Today" : item.date}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setEditItem(item)}
                                  className="text-[10px] font-bold text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 cursor-pointer"
                                  title="Edit this session"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(item)}
                                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                                >
                                  {item.status === "Completed" ? "✓ Completed" : "Mark Done"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Single Plan Tile Rendering
              const plan = group.plan;
              const skill = skillMap.get(plan.skillId);
              const isTodayPlan = plan.date === todayStr;
              const isCompleted = plan.status === "Completed";

              const formattedDateStr = new Date(plan.date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3 transition-all flex flex-col justify-between",
                    isCompleted && "opacity-75 bg-zinc-50/50 dark:bg-zinc-950/20"
                  )}
                >
                  <div className="space-y-2">
                    {/* Header Badges */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn(
                          "text-[9px] font-extrabold px-2 py-0.5 rounded-full",
                          isTodayPlan
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        )}>
                          {isTodayPlan ? "Today" : formattedDateStr}
                        </span>

                        {plan.startTime && (
                          <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                            <Clock className="h-3 w-3" />
                            {formatTimeStringToAMPM(plan.startTime)}
                          </span>
                        )}
                      </div>

                      <span className={cn(
                        "text-[8px] font-bold px-2 py-0.5 rounded shrink-0",
                        plan.priority === "Critical" && "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400",
                        plan.priority === "High" && "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
                        plan.priority === "Medium" && "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400",
                        plan.priority === "Low" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}>
                        {plan.priority} Priority
                      </span>
                    </div>

                    {/* Skill Pill & Title */}
                    <div>
                      {skill && (
                        <span className="text-[10px] font-extrabold block mb-0.5" style={{ color: skill.color || "#6366f1" }}>
                          {skill.name} ({skill.category})
                        </span>
                      )}
                      <h4 className={cn(
                        "text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-snug",
                        isCompleted && "line-through text-zinc-450 dark:text-zinc-500"
                      )}>
                        {plan.title}
                      </h4>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        {plan.estimatedDuration} mins
                      </span>
                    </div>

                    {plan.notes && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium bg-zinc-50 dark:bg-zinc-955 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850/80">
                        {plan.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-850 mt-3">
                    <button
                      onClick={() => handleToggleStatus(plan)}
                      className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="h-4.5 w-4.5 text-zinc-400" />
                      )}
                      <span>{isCompleted ? "Completed" : "Mark Done"}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditItem(plan)}
                        className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-500 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Edit scheduled study"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSingle(plan.id, plan.title)}
                        className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 transition-colors cursor-pointer"
                        title="Delete scheduled study"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, groupedStudyTiles.length)} of {groupedStudyTiles.length} study schedule tiles
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl w-fit mx-auto text-indigo-600 dark:text-indigo-400">
            <CalendarDays className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            No Upcoming Studies Found
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
            {searchQuery || selectedSkillId !== "all" || timeframe !== "all"
              ? "No scheduled study sessions match your current search or filter criteria."
              : "You don't have any study sessions scheduled for upcoming days yet."}
          </p>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Schedule Future Study
          </button>
        </div>
      )}

      {/* Schedule Learning Modal */}
      <ScheduleLearningModal
        open={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        skills={skills}
      />

      {/* Edit Scheduled Study Modal */}
      <EditScheduledStudyModal
        open={editItem !== null}
        onClose={() => setEditItem(null)}
        item={editItem}
        skills={skills}
      />

      {/* Edit Recurring Series Modal */}
      <EditRecurringSeriesModal
        open={editGroupItems.length > 0}
        onClose={() => setEditGroupItems([])}
        items={editGroupItems}
        skills={skills}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title={
          confirmDelete?.type === "series"
            ? "Delete Recurring Series?"
            : "Delete Scheduled Study?"
        }
        message={
          confirmDelete?.type === "series"
            ? `This will permanently remove all ${confirmDelete?.items?.length ?? 0} sessions in the "${confirmDelete?.title}" series. This cannot be undone.`
            : `"${confirmDelete?.title}" will be permanently removed from your schedule. This cannot be undone.`
        }
        confirmLabel={confirmDelete?.type === "series" ? "Delete Series" : "Delete"}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />

    </div>
  );
}
