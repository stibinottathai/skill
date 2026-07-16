"use client";

import { useAuth } from "@/hooks/use-auth";
import { GraduationCap, Clock, Award, BookOpen, ChevronRight, Play } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      title: "Active Skills",
      value: "4",
      description: "2 in progress, 2 planned",
      icon: GraduationCap,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      title: "Study Time",
      value: "14.5 hrs",
      description: "This week's log time",
      icon: Clock,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Completed Sessions",
      value: "12",
      description: "Streak: 5 days active",
      icon: Award,
      color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30",
    },
  ];

  const recentSessions = [
    {
      id: "1",
      skill: "Next.js 15 App Router",
      duration: "90 mins",
      date: "Today, 10:30 AM",
      summary: "Learned about Server Actions, useActionState, and cache invalidation rules.",
    },
    {
      id: "2",
      skill: "TypeScript Generics",
      duration: "45 mins",
      date: "Yesterday, 4:15 PM",
      summary: "Completed exercises on mapped types, conditional types, and utility helpers.",
    },
    {
      id: "3",
      skill: "Tailwind CSS v4",
      duration: "60 mins",
      date: "July 14, 2026",
      summary: "Setup theme extension configurations, experimented with dynamic container attributes.",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Widget */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 sm:p-8 text-white shadow-lg shadow-indigo-500/20">
        <div className="relative z-10 space-y-2">
          <span className="inline-block px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-xs">
            🚀 Personal Tracker
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.displayName?.split(" ")[0] || "Learner"}!
          </h2>
          <p className="text-indigo-100 text-sm sm:text-base max-w-md">
            Consistency is key. What are you planning to study or master today? Track your time and update your skills.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/learning-sessions"
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 hover:bg-zinc-50 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer"
            >
              <Play className="h-4 w-4 fill-indigo-600 text-indigo-600" />
              Start learning session
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

      {/* Metrics Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
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

      {/* Main Grid: Recent Activities & Quick Notes */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Sessions */}
        <div className="md:col-span-2 p-5 sm:p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              Recent Learning Sessions
            </h3>
            <Link
              href="/learning-sessions"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-zinc-150 dark:divide-zinc-800">
            {recentSessions.map((session) => (
              <div key={session.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                    {session.skill}
                  </h4>
                  <span className="inline-block shrink-0 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                    {session.duration}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {session.date}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {session.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Tips / Dashboard Sidebar widget */}
        <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
              💡 Daily Tip
            </span>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              The Pomodoro Technique
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Try studying in 25-minute focused blocks followed by a 5-minute break. After 4 cycles, take a longer 15-30 minute break. This keeps your cognitive load balanced and prevents study fatigue.
            </p>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href="/notes"
              className="flex w-full items-center justify-center h-10 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Add a quick note
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
