"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import { subscribeAllDailyPlans, updateDailyPlanItem, deleteDailyPlanItem } from "@/services/planner";
import { subscribeSkills } from "@/services/skills";
import { DailyPlanItem, DailyPlanStatus } from "@/types/planner";
import { Skill } from "@/types/skill";
import { ScheduleLearningModal } from "@/components/planner/schedule-learning-modal";
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
  Flame,
  Calendar,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  const [timeframe, setTimeframe] = useState<"all" | "today" | "week" | "month">("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

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

  // Filtered Upcoming Plans
  const filteredPlans = useMemo(() => {
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

    // Sort chronologically ascending by date, then start time
    return result.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  }, [allPlans, todayStr, searchQuery, selectedSkillId, selectedStatus, timeframe]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSkillId, selectedStatus, timeframe]);

  // Paginated Results
  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / ITEMS_PER_PAGE));
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPlans.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPlans, currentPage]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalUpcoming = allPlans.filter((p) => p.date >= todayStr).length;
    const todayCount = allPlans.filter((p) => p.date === todayStr).length;
    const totalMins = allPlans
      .filter((p) => p.date >= todayStr)
      .reduce((acc, curr) => acc + (curr.estimatedDuration || 0), 0);
    const totalHours = (totalMins / 60).toFixed(1);
    const highPriority = allPlans.filter(
      (p) => p.date >= todayStr && (p.priority === "High" || p.priority === "Critical")
    ).length;

    return { totalUpcoming, todayCount, totalHours, highPriority };
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

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteDailyPlanItem(id);
      showToast(`Removed "${title}" from schedule.`, "success");
    } catch (e) {
      showToast("Failed to delete session.", "error");
    }
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
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">Planned Time</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block leading-none">
            {metrics.totalHours} hrs
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

      {/* Paginated Study Sessions List / Grid */}
      {paginatedPlans.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {paginatedPlans.map((plan) => {
              const skill = skillMap.get(plan.skillId);
              const skillColor = skill?.color || "#6366f1";
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
                            {plan.startTime}
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
                        <span className="text-[10px] font-extrabold block mb-0.5" style={{ color: skillColor }}>
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

                    {/* Duration & Notes */}
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

                    <button
                      onClick={() => handleDelete(plan.id, plan.title)}
                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 transition-colors cursor-pointer"
                      title="Delete scheduled study"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredPlans.length)} of {filteredPlans.length} scheduled studies
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

    </div>
  );
}
