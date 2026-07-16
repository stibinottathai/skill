"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeSkills } from "@/services/skills";
import { subscribeLearningSessions } from "@/services/learning-sessions";
import { subscribeUserSettings } from "@/services/settings";
import { Skill } from "@/types/skill";
import { LearningSession } from "@/types/session";
import { UserSettings } from "@/types/settings";
import { LearningTask } from "@/types/task";
import { RoadmapItem } from "@/types/roadmap";
import { subscribeTasks } from "@/services/tasks";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Icon imports
import {
  GraduationCap,
  Clock,
  Award,
  BookOpen,
  Play,
  Flame,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Eye,
  ListTodo,
} from "lucide-react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

// Chart and Dashboard subcomponents
import { WeeklyHoursChart } from "@/components/charts/weekly-hours-chart";
import { MonthlyHoursChart } from "@/components/charts/monthly-hours-chart";
import { SkillProgressChart } from "@/components/charts/skill-progress-chart";
import { CategoryDistributionChart } from "@/components/charts/category-distribution-chart";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { TodayFocus } from "@/components/dashboard/today-focus";
import { LearningInsights } from "@/components/dashboard/learning-insights";
import { Dialog } from "@/components/ui/dialog";

export default function DashboardPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    weeklyGoalHours: 10,
    monthlyGoalHours: 40,
  });
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "insights">("overview");

  // Selected session for detailed viewer modal
  const [selectedActivity, setSelectedActivity] = useState<LearningSession | null>(null);

  // Planner and Tasks states
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);

  // Subscriptions
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribeSkills = subscribeSkills(user.uid, (fetchedSkills) => {
      setSkills(fetchedSkills);
    });

    const unsubscribeSessions = subscribeLearningSessions(user.uid, (fetchedSessions) => {
      setSessions(fetchedSessions);
    });

    const unsubscribeSettings = subscribeUserSettings(user.uid, (settings) => {
      setUserSettings(settings);
      setLoading(false);
    });

    const unsubscribeTasks = subscribeTasks(user.uid, (fetchedTasks) => {
      setTasks(fetchedTasks);
    });

    // Real-time listener for all roadmap items across skills
    const roadmapQ = query(collection(db, "roadmap_items"), where("userId", "==", user.uid));
    const unsubscribeRoadmap = onSnapshot(roadmapQ, (snap) => {
      const items = snap.docs.map((docSnap: any) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }) as RoadmapItem);
      setRoadmapItems(items);
    });

    return () => {
      unsubscribeSkills();
      unsubscribeSessions();
      unsubscribeSettings();
      unsubscribeTasks();
      unsubscribeRoadmap();
    };
  }, [user]);

  // Skill lookup map
  const skillMap = useMemo(() => {
    const map = new Map<string, Skill>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalSkills = skills.length;
    const skillsInProgress = skills.filter((s) => s.status === "Learning").length;
    const completedSkills = skills.filter((s) => s.status === "Completed").length;
    const totalSessions = sessions.length;

    const totalMinutes = sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const totalHours = parseFloat((totalMinutes / 60).toFixed(1));

    // STREAK CALCULATOR
    const uniqueDatesSet = new Set(sessions.map((s) => s.date));
    
    // Format date key helper
    const formatDateKey = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date();
    const todayStr = formatDateKey(checkDate);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateKey(yesterday);

    let startCounting = false;
    if (uniqueDatesSet.has(todayStr)) {
      startCounting = true;
    } else if (uniqueDatesSet.has(yesterdayStr)) {
      startCounting = true;
      checkDate = yesterday;
    }

    if (startCounting) {
      while (true) {
        const dateStr = formatDateKey(checkDate);
        if (uniqueDatesSet.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    if (uniqueDatesSet.size > 0) {
      const sortedDates = Array.from(uniqueDatesSet)
        .map((dStr) => new Date(dStr))
        .sort((a, b) => a.getTime() - b.getTime());

      let currentLongest = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = sortedDates[i - 1];
        const curr = sortedDates[i];
        const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentLongest++;
        } else if (diffDays > 1) {
          longestStreak = Math.max(longestStreak, currentLongest);
          currentLongest = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentLongest);
    }

    return {
      totalSkills,
      skillsInProgress,
      completedSkills,
      totalSessions,
      totalHours,
      currentStreak,
      longestStreak,
    };
  }, [skills, sessions]);

  // Goal Progress Telemetry
  const goals = useMemo(() => {
    // Current week Monday
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    // Sum week minutes
    const weekSessions = sessions.filter((s) => {
      const sDate = new Date(s.date);
      return sDate.getTime() >= monday.getTime();
    });
    const weekHours = parseFloat((weekSessions.reduce((acc, curr) => acc + curr.duration, 0) / 60).toFixed(1));

    // Sum month minutes
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthSessions = sessions.filter((s) => {
      const sDate = new Date(s.date);
      return sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear;
    });
    const monthHours = parseFloat((monthSessions.reduce((acc, curr) => acc + curr.duration, 0) / 60).toFixed(1));

    const weeklyGoal = userSettings.weeklyGoalHours || 10;
    const monthlyGoal = userSettings.monthlyGoalHours || 40;

    const weeklyProgress = Math.min(Math.round((weekHours / weeklyGoal) * 100), 100);
    const monthlyProgress = Math.min(Math.round((monthHours / monthlyGoal) * 100), 100);

    return {
      weekHours,
      weeklyGoal,
      weeklyProgress,
      monthHours,
      monthlyGoal,
      monthlyProgress,
    };
  }, [sessions, userSettings]);

  // 4 Most Recent Activities Timeline
  const recentActivities = useMemo(() => {
    return sessions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [sessions]);

  // Compute Next Roadmap Topic and Recently Completed Topics
  const nextRoadmapTopic = useMemo(() => {
    // Find next unfinished or in progress item
    const incomplete = roadmapItems.filter(
      (item) => item.status === "Not Started" || item.status === "In Progress"
    );
    if (incomplete.length === 0) return null;
    
    // Sort: item order asc
    return incomplete.sort((a, b) => a.order - b.order)[0];
  }, [roadmapItems]);

  const recentlyCompletedTopics = useMemo(() => {
    return roadmapItems
      .filter((item) => item.status === "Completed" && item.completionDate)
      .sort((a, b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime())
      .slice(0, 3);
  }, [roadmapItems]);

  if (loading) {
    return (
      <div className="space-y-6 w-full animate-pulse max-w-6xl mx-auto">
        <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-150 dark:bg-zinc-850 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Skills (Total / In Progress)",
      value: `${metrics.totalSkills} / ${metrics.skillsInProgress}`,
      description: `${metrics.completedSkills} fully completed`,
      icon: GraduationCap,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      title: "Learning Hours",
      value: `${metrics.totalHours} hrs`,
      description: `Logged in ${metrics.totalSessions} study sessions`,
      icon: Clock,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: "Current Streak",
      value: `${metrics.currentStreak} days`,
      description: "Consecutive study days",
      icon: Flame,
      color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20",
    },
    {
      title: "Longest Streak",
      value: `${metrics.longestStreak} days`,
      description: "Personal lifetime record",
      icon: Award,
      color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 sm:p-8 text-white shadow-md shadow-indigo-500/25">
        <div className="relative z-10 space-y-2">
          <span className="inline-block px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-xs">
            📊 Learning Console
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.displayName?.split(" ")[0] || "Learner"}!
          </h2>
          <p className="text-indigo-100 text-sm sm:text-base max-w-md leading-relaxed">
            Configure target study goals, review chart habit metrics, and check Neglected Skills to lock down your focus.
          </p>
          <div className="pt-3 flex flex-wrap gap-3">
            <Link
              href="/learning-sessions"
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 hover:bg-zinc-50 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer"
            >
              <Play className="h-4 w-4 fill-indigo-600 text-indigo-600 animate-pulse" />
              Start Study Log
            </Link>
            <Link
              href="/skills"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/30 text-white hover:bg-indigo-500/40 rounded-xl text-sm font-semibold transition-all duration-200 border border-white/10 cursor-pointer"
            >
              Skills Library
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="absolute right-[-5%] top-[-20%] h-48 w-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute right-[15%] bottom-[-30%] h-36 w-36 rounded-full bg-white/5 blur-lg pointer-events-none" />
      </div>

      {/* Aggregate Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between"
            >
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">
                  {card.title}
                </p>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                  {card.value}
                </h3>
                <p className="text-xs text-zinc-450 dark:text-zinc-500 font-medium">
                  {card.description}
                </p>
              </div>
              <div className={cn("p-3 rounded-2xl shrink-0", card.color)}>
                <Icon className="h-5.5 w-5.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dashboard navigation tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-450 dark:hover:text-zinc-200"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "calendar"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-450 dark:hover:text-zinc-200"
          )}
        >
          <Calendar className="h-4 w-4" />
          Calendar Calendar
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "insights"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-450 dark:hover:text-zinc-200"
          )}
        >
          <BrainCircuit className="h-4 w-4" />
          Focus & Insights
        </button>
      </div>

      {/* Main Tab Panels */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Goals and Targets metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            
            {/* Weekly Goal Card */}
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Weekly Goals Target</h4>
                  <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                    {goals.weekHours} / {goals.weeklyGoal} hrs study
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-md">
                  {goals.weeklyProgress}%
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${goals.weeklyProgress}%` }}
                />
              </div>
            </div>

            {/* Monthly Goal Card */}
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Monthly Goals Target</h4>
                  <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                    {goals.monthHours} / {goals.monthlyGoal} hrs study
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-md">
                  {goals.monthlyProgress}%
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${goals.monthlyProgress}%` }}
                />
              </div>
            </div>

          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Weekly Study Hours</h4>
              <WeeklyHoursChart sessions={sessions} />
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Monthly Study Hours</h4>
              <MonthlyHoursChart sessions={sessions} />
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Skill Completion Progress</h4>
              <SkillProgressChart skills={skills} />
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Category Distributions</h4>
              <CategoryDistributionChart skills={skills} />
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3 md:col-span-2">
              <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Monthly study trend (Last 6 Months)</h4>
              <MonthlyTrendChart sessions={sessions} />
            </div>

          </div>

          {/* Recent Activity Timeline Feed */}
          <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-55 flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-indigo-500" />
                Recent Learning Logs
              </h4>
              <Link href="/learning-sessions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                View all logs
              </Link>
            </div>

            {recentActivities.length > 0 ? (
              <div className="divide-y divide-zinc-150 dark:divide-zinc-850">
                {recentActivities.map((act) => {
                  const skill = skillMap.get(act.skillId);
                  const SkillIcon = skill ? ((LucideIcons as any)[skill.icon] || LucideIcons.GraduationCap) : LucideIcons.GraduationCap;
                  const skillColor = skill?.color || "#6366f1";

                  return (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivity(act)}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 px-2 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] shrink-0"
                          style={{ backgroundColor: `${skillColor}15`, color: skillColor }}
                        >
                          <SkillIcon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">
                            {act.topicLearned}
                          </h5>
                          <span className="text-[9px] font-semibold block mt-0.5" style={{ color: skillColor }}>
                            {skill?.name || "Unknown Skill"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                          {act.duration} mins
                        </span>
                        <Eye className="h-4 w-4 text-zinc-400 hover:text-zinc-800" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-450 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No sessions logged yet. Click "Start Study Log" to add one!
              </div>
            )}
          </div>

          {/* Planner & Task Dashboard Widgets */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Widget 1: Today's Tasks & Deadlines */}
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-55 flex items-center gap-1.5 uppercase tracking-wider">
                  <ListTodo className="h-4.5 w-4.5 text-indigo-500" />
                  Today's Tasks & Deadlines
                </h4>
                <Link href="/tasks" className="text-[10px] font-bold text-indigo-650 hover:text-indigo-500 dark:text-indigo-400">
                  Manage Tasks
                </Link>
              </div>

              {/* Tasks List */}
              {tasks.filter((t) => !t.archived && t.status !== "Completed").length > 0 ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {tasks
                    .filter((t) => !t.archived && t.status !== "Completed")
                    .slice(0, 5)
                    .map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 bg-zinc-50/50 dark:bg-zinc-955/20 border border-zinc-200 dark:border-zinc-850 rounded-xl">
                        <div className="min-w-0 flex-1 pr-3">
                          <span className="text-xs font-bold text-zinc-850 dark:text-zinc-150 block truncate">
                            {t.title}
                          </span>
                          <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-500 mt-0.5 block">
                            Category: {t.category} • Priority: {t.priority} {t.dueDate ? `• Due: ${t.dueDate}` : ""}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0",
                          t.status === "Todo" && "bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400",
                          t.status === "In Progress" && "bg-indigo-50 text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-400"
                        )}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-450 italic text-center py-6">All tasks completed or none added!</p>
              )}
            </div>

            {/* Widget 2: Roadmap Tracking */}
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-55 flex items-center gap-1.5 uppercase tracking-wider">
                <Award className="h-4.5 w-4.5 text-indigo-500" />
                Roadmap Curriculum
              </h4>

              <div className="space-y-4">
                {/* Next Unfinished Roadmap Item */}
                <div>
                  <h5 className="text-[9px] font-extrabold uppercase text-zinc-400 dark:text-zinc-550 tracking-wider mb-2">Next Unfinished Topic</h5>
                  {nextRoadmapTopic ? (
                    <div className="p-3 bg-indigo-50/25 border border-indigo-100/30 dark:bg-indigo-950/10 dark:border-indigo-900/30 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200 block truncate">
                          {nextRoadmapTopic.title}
                        </span>
                        <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                          From Skill: {skillMap.get(nextRoadmapTopic.skillId)?.name || "Active"}
                        </span>
                      </div>
                      <Link
                        href={`/skills/${nextRoadmapTopic.skillId}`}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-650 hover:underline dark:text-indigo-400 shrink-0"
                      >
                        Study
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-450 italic py-1">No upcoming roadmap topics.</p>
                  )}
                </div>

                {/* Recently Completed Roadmap Topics */}
                <div>
                  <h5 className="text-[9px] font-extrabold uppercase text-zinc-400 dark:text-zinc-550 tracking-wider mb-2">Recently Completed Topics</h5>
                  {recentlyCompletedTopics.length > 0 ? (
                    <div className="space-y-2">
                      {recentlyCompletedTopics.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                          <span className="font-bold text-zinc-850 dark:text-zinc-200 truncate pr-3">{item.title}</span>
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-450 shrink-0">✓ Completed</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-450 italic py-1">No completed topics logged yet.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="animate-slide-up">
          <DashboardCalendar sessions={sessions} skills={skills} />
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-6 animate-slide-up">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Today's Focus Priorities</h4>
            <TodayFocus skills={skills} sessions={sessions} />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Habits Analytics & Insights</h4>
            <LearningInsights skills={skills} sessions={sessions} />
          </div>
        </div>
      )}

      {/* Activity Detail Viewer Modal */}
      <Dialog
        open={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title="Session Details Log"
        description="Detailed study session timeline information"
        className="max-w-lg"
      >
        {selectedActivity && (
          <div className="space-y-4 pt-1.5">
            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-zinc-650 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-850 pb-3">
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Skill Name</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                  {skillMap.get(selectedActivity.skillId)?.name || "Unknown Skill"}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Date Studied</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                  {new Date(selectedActivity.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Study Duration</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">{selectedActivity.duration} minutes</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Difficulty</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">{selectedActivity.difficulty}</span>
              </div>
            </div>

            <div>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Topic Studied</span>
              <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">{selectedActivity.topicLearned}</p>
            </div>

            {selectedActivity.summary && (
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Session Summary</span>
                <p className="text-xs text-zinc-600 dark:text-zinc-450 leading-relaxed font-medium bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-850">{selectedActivity.summary}</p>
              </div>
            )}

            {selectedActivity.resourcesUsed && (
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Resources Utilized</span>
                <p className="text-xs text-zinc-600 dark:text-zinc-450 leading-relaxed font-medium bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-850">{selectedActivity.resourcesUsed}</p>
              </div>
            )}

            {selectedActivity.notes && (
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Cheat Sheet Notes</span>
                <div className="bg-zinc-50/50 dark:bg-zinc-950/40 p-4 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                  {/* Since notes are markdown we use our custom MarkdownRenderer */}
                  <div className="prose prose-sm dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ __html: require("marked").marked.parse(selectedActivity.notes) }} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-zinc-150 dark:border-zinc-850">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        )}
      </Dialog>

    </div>
  );
}
