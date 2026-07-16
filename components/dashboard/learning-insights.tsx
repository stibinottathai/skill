"use client";

import { useMemo } from "react";
import { Skill } from "@/types/skill";
import { LearningSession } from "@/types/session";
import { Award, Clock, Star, BrainCircuit, Activity, CalendarDays, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface LearningInsightsProps {
  skills: Skill[];
  sessions: LearningSession[];
}

export function LearningInsights({ skills, sessions }: LearningInsightsProps) {
  
  const insights = useMemo(() => {
    if (sessions.length === 0 || skills.length === 0) {
      return null;
    }

    const skillMap = new Map<string, Skill>();
    skills.forEach((s) => skillMap.set(s.id, s));

    // 1. Skill Durations (sum durations per skill ID)
    const skillDurations: Record<string, number> = {};
    sessions.forEach((s) => {
      skillDurations[s.skillId] = (skillDurations[s.skillId] || 0) + (s.duration || 0);
    });

    // Most studied
    let mostStudiedId = "";
    let maxDuration = -1;
    Object.entries(skillDurations).forEach(([id, dur]) => {
      if (dur > maxDuration) {
        maxDuration = dur;
        mostStudiedId = id;
      }
    });
    const mostStudiedSkill = skillMap.get(mostStudiedId);

    // Least studied (active skills only)
    const activeSkills = skills.filter((s) => s.status !== "Archived");
    let leastStudiedSkill: Skill | null = null;
    let minDuration = Infinity;
    
    for (const s of activeSkills) {
      const dur = skillDurations[s.id] || 0;
      if (dur < minDuration) {
        minDuration = dur;
        leastStudiedSkill = s;
      }
    }

    // 2. Average study duration
    const totalMinutes = sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const avgDuration = Math.round(totalMinutes / sessions.length);

    // 3. Total topics completed (sessions marked Completed)
    const completedSessions = sessions.filter((s) => s.status === "Completed").length;

    // 4. Favorite learning category (most hours)
    const categoryDurations: Record<string, number> = {};
    sessions.forEach((s) => {
      const skill = skillMap.get(s.skillId);
      if (skill) {
        const cat = skill.category || "Other";
        categoryDurations[cat] = (categoryDurations[cat] || 0) + (s.duration || 0);
      }
    });
    let favoriteCategory = "None";
    let maxCatDuration = -1;
    Object.entries(categoryDurations).forEach(([cat, dur]) => {
      if (dur > maxCatDuration) {
        maxCatDuration = dur;
        favoriteCategory = cat;
      }
    });

    // 5. Most productive day of the week (Sunday-Saturday)
    const weekdayDurations: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    sessions.forEach((s) => {
      const day = new Date(s.date).getDay();
      weekdayDurations[day] = (weekdayDurations[day] || 0) + (s.duration || 0);
    });
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let mostProductiveDayIdx = 0;
    let maxDayDuration = -1;
    Object.entries(weekdayDurations).forEach(([day, dur]) => {
      const idx = parseInt(day);
      if (dur > maxDayDuration) {
        maxDayDuration = dur;
        mostProductiveDayIdx = idx;
      }
    });
    const mostProductiveDay = maxDayDuration > 0 ? weekdays[mostProductiveDayIdx] : "None";

    // 6. Average productivity rating
    const totalRating = sessions.reduce((acc, curr) => acc + (curr.productivityRating || 0), 0);
    const avgProductivity = (totalRating / sessions.length).toFixed(1);

    return {
      mostStudied: mostStudiedSkill ? `${mostStudiedSkill.name} (${(maxDuration / 60).toFixed(1)}h)` : "None",
      leastStudied: leastStudiedSkill ? `${leastStudiedSkill.name} (${(minDuration / 60).toFixed(1)}h)` : "None",
      avgDuration: `${avgDuration} mins`,
      completedSessions,
      favoriteCategory,
      mostProductiveDay,
      avgProductivity,
    };
  }, [skills, sessions]);

  if (!insights) {
    return (
      <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 text-center p-6">
        <BrainCircuit className="h-8 w-8 text-zinc-400 mb-2 animate-pulse" />
        <p className="text-xs font-semibold text-zinc-450 dark:text-zinc-550">Not enough data to generate insights.</p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Please add active skills and log study sessions first.</p>
      </div>
    );
  }

  const items = [
    {
      title: "Most Studied Skill",
      value: insights.mostStudied,
      icon: BookOpen,
      color: "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30",
    },
    {
      title: "Least Studied Skill",
      value: insights.leastStudied,
      icon: Activity,
      color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30",
    },
    {
      title: "Avg Session Duration",
      value: insights.avgDuration,
      icon: Clock,
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
    },
    {
      title: "Topics Completed",
      value: `${insights.completedSessions} sessions`,
      icon: Award,
      color: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/30",
    },
    {
      title: "Top Category",
      value: insights.favoriteCategory,
      icon: BrainCircuit,
      color: "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950/30",
    },
    {
      title: "Peak Study Day",
      value: insights.mostProductiveDay,
      icon: CalendarDays,
      color: "text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950/30",
    },
    {
      title: "Avg Productivity",
      value: `${insights.avgProductivity} / 5.0`,
      icon: Star,
      color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center gap-3"
          >
            <div className={cn("p-2.5 rounded-xl shrink-0", item.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">
                {item.title}
              </span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block truncate mt-0.5" title={item.value}>
                {item.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
