"use client";

import { useState, useMemo } from "react";
import { LearningSession } from "@/types/session";
import { Skill } from "@/types/skill";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import * as LucideIcons from "lucide-react";

interface DashboardCalendarProps {
  sessions: LearningSession[];
  skills: Skill[];
}

export function DashboardCalendar({ sessions, skills }: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

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
    // Weekday index of first day of month (0 = Sunday, 1 = Monday, etc.)
    // Let's adjust so Monday is first day of the week
    const firstDayIndex = new Date(year, month, 1).getDay();
    const leadingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Days before Monday
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const cells = [];

    // Leading empty cells
    for (let i = 0; i < leadingOffset; i++) {
      cells.push({ day: null, dateStr: null });
    }

    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      cells.push({ day, dateStr });
    }

    return cells;
  }, [year, month]);

  // Map sessions to date strings
  const sessionsByDate = useMemo(() => {
    const map: Record<string, LearningSession[]> = {};
    sessions.forEach((s) => {
      if (!map[s.date]) {
        map[s.date] = [];
      }
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

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

  const getTooltipContent = (dateStr: string | null) => {
    if (!dateStr || !sessionsByDate[dateStr]) return "";
    const daySessions = sessionsByDate[dateStr] || [];
    const lines = ["STUDY SESSIONS LOGGED:"];
    daySessions.forEach((s) => {
      const skillName = skillMap.get(s.skillId)?.name || "Skill";
      lines.push(`• [${skillName}] ${s.topicLearned} (${s.duration}m)`);
    });
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
          <div className="flex gap-1.5">
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
            const hasSessions = cell.dateStr ? !!sessionsByDate[cell.dateStr] : false;
            const isSelected = cell.dateStr === selectedDateStr;
            const daySessions = cell.dateStr ? sessionsByDate[cell.dateStr] || [] : [];
            
            // Total study minutes on this day
            const totalDuration = daySessions.reduce((acc, curr) => acc + curr.duration, 0);

            // Check if cell is today
            const isToday = cell.dateStr
              ? cell.dateStr === new Date().toISOString().split("T")[0]
              : false;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (cell.dateStr && hasSessions) {
                    setSelectedDateStr(cell.dateStr);
                  }
                }}
                title={getTooltipContent(cell.dateStr)}
                className={cn(
                  "min-h-[56px] p-1.5 rounded-xl border transition-all duration-200 relative flex flex-col justify-between border-transparent",
                  cell.day ? "bg-zinc-50/50 dark:bg-zinc-950/20" : "bg-transparent opacity-0 pointer-events-none",
                  hasSessions ? "cursor-pointer hover:shadow-xs hover:border-zinc-250 dark:hover:border-zinc-800" : "cursor-default",
                  isToday ? "border-indigo-500 bg-indigo-50/20 dark:border-indigo-500/50 dark:bg-indigo-950/10" : "",
                  isSelected ? "ring-2 ring-indigo-500 border-transparent dark:ring-indigo-400" : "",
                  hasSessions && !isSelected && !isToday ? "bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-850/80" : ""
                )}
              >
                <div className="flex justify-between items-start">
                  {/* Day Number */}
                  <span className={cn(
                    "text-xs font-bold text-zinc-500 dark:text-zinc-400",
                    isToday ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : ""
                  )}>
                    {cell.day}
                  </span>
                  
                  {/* Indicator Dot */}
                  {hasSessions && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse shrink-0 mt-1" />
                  )}
                </div>

                {/* Day total minutes */}
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
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Study logs for {new Date(selectedDateStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </h4>
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-550">
              {selectedDaySessions.length} {selectedDaySessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>

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

                    <div className="flex gap-4 items-center text-[10px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-2">
                      <span>Difficulty: <span className="font-bold text-zinc-550 dark:text-zinc-300">{session.difficulty}</span></span>
                      <span className="flex items-center gap-0.5">
                        Productivity:
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3 w-3",
                              i < session.productivityRating ? "text-amber-500 fill-amber-500" : "text-zinc-200 dark:text-zinc-800"
                            )}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
