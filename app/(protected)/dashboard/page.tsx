"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeSkills } from "@/services/skills";
import { subscribeLearningSessions } from "@/services/learning-sessions";
import { Skill } from "@/types/skill";
import { LearningSession } from "@/types/session";
import { GraduationCap, Clock, Award, BookOpen, ChevronRight, Play, Sparkles, Activity } from "lucide-react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to skills & sessions in real-time
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribeSkills = subscribeSkills(user.uid, (fetchedSkills) => {
      setSkills(fetchedSkills);
    });

    const unsubscribeSessions = subscribeLearningSessions(user.uid, (fetchedSessions) => {
      setSessions(fetchedSessions);
      setLoading(false);
    });

    return () => {
      unsubscribeSkills();
      unsubscribeSessions();
    };
  }, [user]);

  // Skill map for easy lookup
  const skillMap = useMemo(() => {
    const map = new Map<string, Skill>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  // Compute stats dynamically
  const stats = useMemo(() => {
    const activeSkills = skills.filter((s) => s.status !== "Archived");
    const activeCount = activeSkills.length;
    
    // Sum logged session durations in hours
    const totalMinutes = sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    
    // Count completed skills
    const completedCount = skills.filter((s) => s.status === "Completed").length;

    return {
      activeCount,
      totalHours,
      completedCount,
    };
  }, [skills, sessions]);

  // Get 3 most recently logged learning sessions
  const recentSessions = useMemo(() => {
    return sessions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [sessions]);

  // Format date safely
  const formatSessionDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Recently";
    }
  };

  const statCards = [
    {
      title: "Active Skills",
      value: loading ? "..." : stats.activeCount.toString(),
      description: "Skills currently in progress",
      icon: GraduationCap,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      title: "Total Study Time",
      value: loading ? "..." : `${stats.totalHours} hrs`,
      description: "Hours logged in study sessions",
      icon: Clock,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Completed Skills",
      value: loading ? "..." : stats.completedCount.toString(),
      description: "Skills mastered so far",
      icon: Award,
      color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 sm:p-8 text-white shadow-lg shadow-indigo-500/20">
        <div className="relative z-10 space-y-2">
          <span className="inline-block px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-xs">
            🚀 Personal Tracker
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.displayName?.split(" ")[0] || "Learner"}!
          </h2>
          <p className="text-indigo-100 text-sm sm:text-base max-w-md">
            Ready to continue your mastery journey? Log your study minutes, review saved notes, and complete your learning goals.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/learning-sessions"
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 hover:bg-zinc-50 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer"
            >
              <Play className="h-4 w-4 fill-indigo-600 text-indigo-600" />
              Log Learning Session
            </Link>
            <Link
              href="/skills"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/30 text-white hover:bg-indigo-500/40 rounded-xl text-sm font-semibold transition-all duration-200 border border-white/10 cursor-pointer"
            >
              View Skills
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        {/* Background shapes */}
        <div className="absolute right-[-5%] top-[-20%] h-48 w-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute right-[15%] bottom-[-30%] h-36 w-36 rounded-full bg-white/5 blur-lg pointer-events-none" />
      </div>

      {/* Stats Metric Widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between transition-all duration-300"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {stat.value}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {stat.description}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color} shrink-0`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Recent Sessions & Daily Tips */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Sessions */}
        <div className="md:col-span-2 p-5 sm:p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Recent Learning Activities
            </h3>
            <Link
              href="/learning-sessions"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View all history
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-550">
              Loading recent sessions...
            </div>
          ) : recentSessions.length > 0 ? (
            <div className="divide-y divide-zinc-150 dark:divide-zinc-800">
              {recentSessions.map((session) => {
                const skill = skillMap.get(session.skillId);
                const SkillIcon = skill ? ((LucideIcons as any)[skill.icon] || LucideIcons.GraduationCap) : LucideIcons.GraduationCap;
                const skillColor = skill?.color || "#6366f1";
                
                return (
                  <div key={session.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-md flex items-center justify-center text-[10px]"
                          style={{
                            backgroundColor: `${skillColor}15`,
                            color: skillColor,
                          }}
                        >
                          <SkillIcon className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-55 truncate max-w-[200px]">
                          {session.topicLearned}
                        </h4>
                      </div>
                      <span className="inline-block shrink-0 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {session.duration} mins
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span className="font-semibold" style={{ color: skillColor }}>
                        {skill?.name || "Unknown Skill"}
                      </span>
                      <span>Studied {formatSessionDate(session.date)}</span>
                    </div>
                    {session.summary && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-1">
                        {session.summary}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-450 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              No learning sessions logged yet. Log a study session to update your time tracker!
            </div>
          )}
        </div>

        {/* Study Tip Box */}
        <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              💡 Study Tip
            </span>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-55">
              Reflect & Document
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Logging study logs isn't just about timers. Taking 2 minutes to summarize what you studied and adding cheat sheets in the Notes section reinforces active recall and helps solidify concepts!
            </p>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href="/learning-sessions"
              className="flex w-full items-center justify-center h-10 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Log a Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
