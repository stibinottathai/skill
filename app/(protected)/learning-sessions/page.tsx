"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import {
  subscribeLearningSessions,
  createLearningSession,
  updateLearningSession,
  deleteLearningSession,
} from "@/services/learning-sessions";
import { subscribeSkills } from "@/services/skills";
import { LearningSession } from "@/types/session";
import { Skill } from "@/types/skill";
import { SessionFormModal } from "@/components/sessions/session-form-modal";
import { Dialog } from "@/components/ui/dialog";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  Plus,
  Search,
  Clock,
  Calendar,
  Star,
  Edit2,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Activity,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

export default function LearningSessionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSkill, setFilterSkill] = useState("All");
  const [filterDate, setFilterDate] = useState("All"); // All, Today, Week, Month
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, duration-desc

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LearningSession | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Expanded notes state (mapping of sessionId -> boolean)
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  // Subscriptions
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Subscribe to skills
    const unsubscribeSkills = subscribeSkills(user.uid, (fetchedSkills) => {
      setSkills(fetchedSkills);
    });

    // Subscribe to sessions
    const unsubscribeSessions = subscribeLearningSessions(user.uid, (fetchedSessions) => {
      // Sort by date newest first by default in state
      const sorted = fetchedSessions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setSessions(sorted);
      setLoading(false);
    });

    return () => {
      unsubscribeSkills();
      unsubscribeSessions();
    };
  }, [user]);

  // Skill ID map helper
  const skillMap = useMemo(() => {
    const map = new Map<string, Skill>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  // Compute Stats cards
  const stats = useMemo(() => {
    const totalCount = sessions.length;
    const totalMinutes = sessions.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const now = new Date();
    
    // Helper to clear time for date checks
    const getStartOfWeek = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const nd = new Date(d.setDate(diff));
      nd.setHours(0, 0, 0, 0);
      return nd;
    };

    const startOfWeek = getStartOfWeek(new Date(now));
    
    // Count this week's sessions
    const thisWeekCount = sessions.filter((s) => {
      const sDate = new Date(s.date);
      sDate.setHours(0, 0, 0, 0);
      return sDate.getTime() >= startOfWeek.getTime();
    }).length;

    // Count this month's sessions
    const thisMonthCount = sessions.filter((s) => {
      const sDate = new Date(s.date);
      return (
        sDate.getFullYear() === now.getFullYear() &&
        sDate.getMonth() === now.getMonth()
      );
    }).length;

    return {
      totalCount,
      totalHours,
      thisWeekCount,
      thisMonthCount,
    };
  }, [sessions]);

  // Filter and sort sessions
  const processedSessions = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return sessions
      .filter((s) => {
        // Search filter
        const matchesSearch = s.topicLearned.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              s.summary.toLowerCase().includes(searchQuery.toLowerCase());

        // Skill filter
        const matchesSkill = filterSkill === "All" || s.skillId === filterSkill;

        // Date filter
        let matchesDate = true;
        const sDate = new Date(s.date);
        sDate.setHours(0, 0, 0, 0);

        if (filterDate === "Today") {
          matchesDate = sDate.getTime() === now.getTime();
        } else if (filterDate === "Week") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          sevenDaysAgo.setHours(0, 0, 0, 0);
          matchesDate = sDate.getTime() >= sevenDaysAgo.getTime();
        } else if (filterDate === "Month") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          thirtyDaysAgo.setHours(0, 0, 0, 0);
          matchesDate = sDate.getTime() >= thirtyDaysAgo.getTime();
        }

        return matchesSearch && matchesSkill && matchesDate;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === "duration-desc") {
          return b.duration - a.duration;
        }
        // Default: newest-first
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [sessions, searchQuery, filterSkill, filterDate, sortBy]);

  // CRUD Actions
  const handleAddOrEditSession = async (
    values: Omit<LearningSession, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!user) return;
    try {
      if (selectedSession) {
        await updateLearningSession(selectedSession.id, values);
        showToast(`Successfully updated learning session!`, "success");
      } else {
        await createLearningSession(user.uid, values);
        // Also update skill progress or updatedAt timestamp if needed (optional UX)
        showToast(`Logged session: "${values.topicLearned}"!`, "success");
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to save session log.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteLearningSession(deleteTargetId);
      showToast("Deleted study log document.", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to delete log.", "error");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const toggleNotesExpand = (id: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Render Loading Splash
  if (loading) {
    return (
      <div className="space-y-6 w-full animate-pulse max-w-6xl mx-auto">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl" />
          ))}
        </div>
        <div className="h-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Learning Sessions History
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Keep track of what you learned daily and calculate study time commitments.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedSession(null);
            setIsFormOpen(true);
          }}
          disabled={skills.length === 0}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98] cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4.5 w-4.5" />
          Log Session
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">Total Sessions</span>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">{stats.totalCount}</p>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Learning Hours</span>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-450 mt-1">{stats.totalHours} hrs</p>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Sessions This Week</span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-450 mt-1">{stats.thisWeekCount}</p>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wider">Sessions This Month</span>
          <p className="text-2xl font-extrabold text-violet-600 dark:text-violet-450 mt-1">{stats.thisMonthCount}</p>
        </div>
      </div>

      {/* Filters & Sorting */}
      <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Topic search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-550 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic learned or summary..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-zinc-50/50 text-sm focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-550"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filter by Skill */}
            <div className="flex items-center gap-1.5 h-10 px-2.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs text-zinc-650 dark:text-zinc-400">
              <span className="font-semibold text-[10px] uppercase text-zinc-400 tracking-wider">Skill:</span>
              <select
                value={filterSkill}
                onChange={(e) => setFilterSkill(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden font-bold pr-4 cursor-pointer text-zinc-800 dark:text-zinc-300 max-w-[150px]"
              >
                <option value="All">All Skills</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Date Period */}
            <div className="flex items-center gap-1.5 h-10 px-2.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs text-zinc-650 dark:text-zinc-400">
              <span className="font-semibold text-[10px] uppercase text-zinc-400 tracking-wider">Date:</span>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden font-bold pr-4 cursor-pointer text-zinc-800 dark:text-zinc-300"
              >
                <option value="All">All Dates</option>
                <option value="Today">Today Only</option>
                <option value="Week">Last 7 Days</option>
                <option value="Month">Last 30 Days</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 h-10 px-2.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs text-zinc-650 dark:text-zinc-400">
              <span className="font-semibold text-[10px] uppercase text-zinc-400 tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden font-bold pr-4 cursor-pointer text-zinc-800 dark:text-zinc-300"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="duration-desc">Duration</option>
              </select>
            </div>

          </div>

        </div>
      </div>

      {/* Session Feed List */}
      {processedSessions.length > 0 ? (
        <div className="relative border-l border-zinc-250 dark:border-zinc-800 pl-6 ml-3 space-y-6">
          {processedSessions.map((session) => {
            const skill = skillMap.get(session.skillId);
            const SkillIcon = skill ? ((LucideIcons as any)[skill.icon] || LucideIcons.GraduationCap) : LucideIcons.GraduationCap;
            const skillColor = skill?.color || "#6366f1";
            const isNotesExpanded = expandedSessions[session.id] || false;

            const sessionDate = new Date(session.date).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div key={session.id} className="relative group">
                
                {/* Timeline node circle */}
                <div
                  className="absolute left-[-35px] top-1.5 flex h-6.5 w-6.5 items-center justify-center rounded-full border bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800"
                  style={{ color: skillColor }}
                >
                  <SkillIcon className="h-3 w-3" />
                </div>

                {/* Session Card Frame */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs transition-all duration-200 hover:border-zinc-350 dark:hover:border-zinc-700">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    
                    <div className="space-y-1.5 flex-1">
                      {/* Skill Name Tag */}
                      <div className="flex flex-wrap items-center gap-2">
                        {skill ? (
                          <Link
                            href={`/skills/${skill.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
                            style={{ color: skillColor }}
                          >
                            <span>{skill.name}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">Unknown Skill</span>
                        )}
                        
                        <span className="inline-block px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          {sessionDate}
                        </span>

                        <span className={cn(
                          "inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold border",
                          session.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                            : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                        )}>
                          {session.status}
                        </span>
                      </div>

                      {/* Topic Title */}
                      <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">
                        {session.topicLearned}
                      </h3>

                      {/* Brief Summary */}
                      {session.summary && (
                        <p className="text-xs text-zinc-650 dark:text-zinc-400 font-medium">
                          {session.summary}
                        </p>
                      )}

                      {/* Resources */}
                      {session.resourcesUsed && (
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-500 flex items-center gap-1">
                          <LucideIcons.ExternalLink className="h-3 w-3 text-zinc-400" />
                          Resources: {session.resourcesUsed}
                        </p>
                      )}
                    </div>

                    {/* Card Actions Panel */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4">
                      {/* Duration */}
                      <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3.5 w-3.5" />
                        {session.duration} mins
                      </span>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-450 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(session.id)}
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-950/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Ratings / Difficulty row */}
                  <div className="flex flex-wrap gap-4 items-center mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <span className="flex items-center gap-1 font-semibold text-zinc-500 dark:text-zinc-455">
                      Difficulty: 
                      <span className={cn(
                        "font-bold text-[10px] px-1.5 py-0.5 rounded border ml-1",
                        session.difficulty === "Easy" && "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                        session.difficulty === "Medium" && "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                        session.difficulty === "Hard" && "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                      )}>
                        {session.difficulty}
                      </span>
                    </span>

                    <span className="flex items-center gap-1 font-semibold text-zinc-500 dark:text-zinc-455">
                      Productivity: 
                      <span className="flex gap-0.5 ml-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={cn(
                              "h-3.5 w-3.5",
                              index < session.productivityRating
                                ? "text-amber-500 fill-amber-500"
                                : "text-zinc-200 dark:text-zinc-850"
                            )}
                          />
                        ))}
                      </span>
                    </span>
                  </div>

                  {/* Markdown Notes Toggle Panel */}
                  {session.notes && (
                    <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                      <button
                        onClick={() => toggleNotesExpand(session.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-zinc-400" />
                        {isNotesExpanded ? "Hide notes" : "Show detailed study notes"}
                        {isNotesExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />}
                      </button>

                      {isNotesExpanded && (
                        <div className="mt-3 p-4 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl border border-zinc-150 dark:border-zinc-850/80 animate-slide-down">
                          <MarkdownRenderer content={session.notes} />
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs min-h-[350px]">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 mb-5 animate-pulse">
            <Activity className="h-10 w-10 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            No Learning Sessions Logged
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-455 max-w-sm leading-relaxed mb-6">
            {sessions.length === 0
              ? "Start tracking your time! Log your daily studies, document what you discovered, and assign ratings."
              : "No study sessions match your query filters. Try adjusting search strings or filters."}
          </p>
          {sessions.length === 0 && (
            <button
              onClick={() => {
                setSelectedSession(null);
                setIsFormOpen(true);
              }}
              disabled={skills.length === 0}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4.5 w-4.5" />
              Log First Session
            </button>
          )}
        </div>
      )}

      {/* Session logging modal */}
      <SessionFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedSession(null);
        }}
        onSubmit={handleAddOrEditSession}
        skills={skills}
        session={selectedSession}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        title="Delete Session Log"
        description="Are you sure you want to delete this learning session log?"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            This will permanently delete this record from your dashboard metrics and study history logs. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setDeleteTargetId(null)}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold shadow-xs cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
