"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeAllDailyPlans } from "@/services/planner";
import { LearningSession } from "@/types/session";
import { Skill } from "@/types/skill";
import { DailyPlanItem } from "@/types/planner";
import { ScheduleLearningModal } from "@/components/planner/schedule-learning-modal";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Star, Plus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import * as LucideIcons from "lucide-react";

interface DashboardCalendarProps {
  sessions: LearningSession[];
  skills: Skill[];
}

export function DashboardCalendar({ sessions, skills }: DashboardCalendarProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [allDailyPlans, setAllDailyPlans] = useState<DailyPlanItem[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Subscribe to all daily plans for user
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeAllDailyPlans(user.uid, (plans) => {
      setAllDailyPlans(plans);
    });
    return () => unsubscribe();
  }, [user]);

  const skillMap = useMemo(() => {
    const map = new Map<string, Skill>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  // Year and Month details
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calendar calculations
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const leadingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon as start day
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const cells = [];
    for (let i = 0; i < leadingOffset; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      cells.push({ day, dateStr: `${yyyy}-${mm}-${dd}` });
    }
    return cells;
  }, [year, month]);

  // Map sessions & plans to date strings
  const sessionsByDate = useMemo(() => {
    const map: Record<string, LearningSession[]> = {};
    sessions.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  const plansByDate = useMemo(() => {
    const map: Record<string, DailyPlanItem[]> = {};
    allDailyPlans.forEach((p) => {
      if (!map[p.date]) map[p.date] = [];
      map[p.date].push(p);
    });
    return map;
  }, [allDailyPlans]);

  // Navigations
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateStr(null);
  };

  // Selected date logs list
  const selectedDaySessions = useMemo(() => {
    if (!selectedDateStr) return [];
    return sessionsByDate[selectedDateStr] || [];
  }, [selectedDateStr, sessionsByDate]);

  const selectedDayPlans = useMemo(() => {
    if (!selectedDateStr) return [];
    return plansByDate[selectedDateStr] || [];
  }, [selectedDateStr, plansByDate]);

  const getTooltipContent = (dateStr: string | null) => {
    if (!dateStr) return "";
    const daySessions = sessionsByDate[dateStr] || [];
    const dayPlans = plansByDate[dateStr] || [];
    if (daySessions.length === 0 && dayPlans.length === 0) return "";

    const lines: string[] = [];
    if (dayPlans.length > 0) {
      lines.push("SCHEDULED LEARNING:");
      dayPlans.forEach((p) => lines.push(`• ${p.title} (${p.estimatedDuration}m)`));
    }
    if (daySessions.length > 0) {
      if (lines.length > 0) lines.push("");
      lines.push("STUDY SESSIONS LOGGED:");
      daySessions.forEach((s) => {
        const skillName = skillMap.get(s.skillId)?.name || "Skill";
        lines.push(`• [${skillName}] ${s.topicLearned} (${s.duration}m)`);
      });
    }
    return lines.join("\n");
  };

  return (
    <div className="space-y-6">
      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        
        {/* Calendar Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
              {monthNames[month]} {year}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Schedule Study
            </button>
            <div className="flex gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 cursor-pointer"
              >
                <ChevronLeft className="h-4.5 w-4.5 text-zinc-500" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 cursor-pointer"
              >
                <ChevronRight className="h-4.5 w-4.5 text-zinc-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Days of Week label */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <span key={i} className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider py-1.5">
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Cells Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, idx) => {
            const daySessions = cell.dateStr ? sessionsByDate[cell.dateStr] || [] : [];
            const dayPlans = cell.dateStr ? plansByDate[cell.dateStr] || [] : [];
            const hasSessions = daySessions.length > 0;
            const hasPlans = dayPlans.length > 0;
            const hasActivities = hasSessions || hasPlans;
            const isSelected = cell.dateStr === selectedDateStr;
            
            const totalDuration = daySessions.reduce((acc, curr) => acc + curr.duration, 0);

            const isToday = cell.dateStr
              ? cell.dateStr === new Date().toISOString().split("T")[0]
              : false;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (cell.dateStr) {
                    setSelectedDateStr(cell.dateStr);
                  }
                }}
                title={getTooltipContent(cell.dateStr)}
                className={cn(
                  "min-h-[56px] p-1.5 rounded-xl border transition-all duration-200 relative flex flex-col justify-between cursor-pointer",
                  cell.day ? "bg-zinc-50/50 dark:bg-zinc-950/20 hover:border-zinc-250 dark:hover:border-zinc-800 hover:shadow-xs" : "bg-transparent opacity-0 pointer-events-none",
                  isToday ? "border-indigo-500 bg-indigo-50/20 dark:border-indigo-500/50 dark:bg-indigo-950/10" : "border-transparent",
                  isSelected ? "ring-2 ring-indigo-500 border-transparent dark:ring-indigo-400" : "",
                  hasActivities && !isSelected && !isToday ? "bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-850/80" : ""
                )}
              >
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-xs font-bold text-zinc-500 dark:text-zinc-400",
                    isToday ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : ""
                  )}>
                    {cell.day}
                  </span>
                  
                  {/* Indicator Dots */}
                  <div className="flex gap-1 mt-0.5">
                    {hasPlans && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" title={`${dayPlans.length} plans scheduled`} />
                    )}
                    {hasSessions && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" title={`${daySessions.length} sessions logged`} />
                    )}
                  </div>
                </div>

                {totalDuration > 0 && (
                  <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 truncate leading-none block mt-1.5">
                    {totalDuration}m
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Session Details Panel */}
      {selectedDateStr && (
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Activities for {new Date(selectedDateStr + "T00:00:00").toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </h4>
              <span className="text-[10px] text-zinc-400 font-semibold">
                {selectedDayPlans.length} scheduled plans • {selectedDaySessions.length} logged sessions
              </span>
            </div>

            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Schedule Study for this Date
            </button>
          </div>

          {/* Scheduled Plans List */}
          {selectedDayPlans.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Scheduled Study Topics</h5>
              <div className="space-y-2">
                {selectedDayPlans.map((plan) => {
                  const skill = skillMap.get(plan.skillId);
                  return (
                    <div key={plan.id} className="p-3 bg-emerald-50/20 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-zinc-850 dark:text-zinc-150 block">{plan.title}</span>
                        <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {skill?.name || "Skill"} • {plan.estimatedDuration} mins • {plan.priority} Priority
                        </span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded",
                        plan.status === "Completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      )}>
                        {plan.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logged Sessions List */}
          {selectedDaySessions.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Logged Study Sessions</h5>
              <div className="space-y-3.5">
                {selectedDaySessions.map((session) => {
                  const skill = skillMap.get(session.skillId);
                  const SkillIcon = skill ? ((LucideIcons as any)[skill.icon] || LucideIcons.GraduationCap) : LucideIcons.GraduationCap;
                  const skillColor = skill?.color || "#6366f1";

                  return (
                    <div key={session.id} className="flex gap-4 p-4 rounded-xl bg-zinc-50/50 border border-zinc-150 dark:bg-zinc-950/20 dark:border-zinc-800/80 items-start">
                      <div
                        className="flex h-9 w-9 shrink-0 rounded-lg items-center justify-center text-[10px]"
                        style={{ backgroundColor: `${skillColor}15`, color: skillColor }}
                      >
                        <SkillIcon className="h-5 w-5" />
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{session.topicLearned}</h5>
                            {skill && (
                              <Link href={`/skills/${skill.id}`} className="text-[10px] font-semibold hover:underline block" style={{ color: skillColor }}>
                                {skill.name}
                              </Link>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                            <Clock className="h-3 w-3" />
                            {session.duration} mins
                          </span>
                        </div>

                        {session.summary && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                            {session.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedDayPlans.length === 0 && selectedDaySessions.length === 0 && (
            <p className="text-xs text-zinc-400 italic text-center py-4">No activities logged or scheduled for this date yet.</p>
          )}

        </div>
      )}

      {/* SCHEDULE LEARNING MODAL */}
      <ScheduleLearningModal
        open={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        initialDate={selectedDateStr || undefined}
        skills={skills}
      />

    </div>
  );
}
