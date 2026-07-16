"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import { subscribeSkill } from "@/services/skills";
import {
  subscribeLearningSessions,
  createLearningSession,
  updateLearningSession,
  deleteLearningSession,
} from "@/services/learning-sessions";
import {
  subscribeNotesBySkill,
  createNote,
  updateNote,
  deleteNote,
} from "@/services/notes";
import { Skill } from "@/types/skill";
import { LearningSession } from "@/types/session";
import { SkillNote } from "@/types/note";
import { SessionFormModal } from "@/components/sessions/session-form-modal";
import { NoteFormModal } from "@/components/notes/note-form-modal";
import { Dialog } from "@/components/ui/dialog";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Award,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Star,
  Activity,
} from "lucide-react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillDetailShellProps {
  id: string;
}

export function SkillDetailShell({ id }: SkillDetailShellProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [skill, setSkill] = useState<Skill | null>(null);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [notes, setNotes] = useState<SkillNote[]>([]);
  const [loadingSkill, setLoadingSkill] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  // Active Tab: "sessions" | "notes"
  const [activeTab, setActiveTab] = useState<"sessions" | "notes">("sessions");

  // Form modal states
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LearningSession | null>(null);
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SkillNote | null>(null);

  // Delete target states
  const [deleteTargetSessionId, setDeleteTargetSessionId] = useState<string | null>(null);
  const [deleteTargetNoteId, setDeleteTargetNoteId] = useState<string | null>(null);

  // Collapsed notes list state
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Subscriptions
  useEffect(() => {
    if (!user || !id) return;

    setLoadingSkill(true);
    setLoadingData(true);

    // Subscribe to Skill Doc
    const unsubscribeSkill = subscribeSkill(id, (fetchedSkill) => {
      setSkill(fetchedSkill);
      setLoadingSkill(false);
    });

    // Subscribe to Sessions matching user (we will filter locally by skillId)
    const unsubscribeSessions = subscribeLearningSessions(user.uid, (fetchedSessions) => {
      const filtered = fetchedSessions
        .filter((s) => s.skillId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSessions(filtered);
      setLoadingData(false);
    });

    // Subscribe to Notes filtered by this skill doc
    const unsubscribeNotes = subscribeNotesBySkill(user.uid, id, (fetchedNotes) => {
      const sorted = fetchedNotes.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setNotes(sorted);
    });

    return () => {
      unsubscribeSkill();
      unsubscribeSessions();
      unsubscribeNotes();
    };
  }, [user, id]);

  // Compute Skill Metrics
  const metrics = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const totalSessions = sessions.length;

    // Get last studied date
    let lastStudied = "Never studied";
    if (sessions.length > 0) {
      const newestSession = sessions[0]; // Already sorted newest-first
      try {
        const d = new Date(newestSession.date);
        lastStudied = d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch (e) {}
    }

    return {
      totalHours,
      totalSessions,
      lastStudied,
    };
  }, [sessions]);

  // Expand toggler
  const toggleItemExpand = (itemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // CRUD for Sessions
  const handleSessionSubmit = async (
    values: Omit<LearningSession, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!user) return;
    try {
      if (selectedSession) {
        await updateLearningSession(selectedSession.id, values);
        showToast("Session log updated successfully!", "success");
      } else {
        await createLearningSession(user.uid, values);
        showToast("Logged new study session successfully!", "success");
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to log session.", "error");
    }
  };

  const handleSessionDelete = async () => {
    if (!deleteTargetSessionId) return;
    try {
      await deleteLearningSession(deleteTargetSessionId);
      showToast("Session log removed.", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to delete session.", "error");
    } finally {
      setDeleteTargetSessionId(null);
    }
  };

  // CRUD for Notes
  const handleNoteSubmit = async (
    values: Omit<SkillNote, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!user) return;
    try {
      if (selectedNote) {
        await updateNote(selectedNote.id, values);
        showToast("Study note updated successfully!", "success");
      } else {
        await createNote(user.uid, values);
        showToast("Created new note successfully!", "success");
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to save note.", "error");
    }
  };

  const handleNoteDelete = async () => {
    if (!deleteTargetNoteId) return;
    try {
      await deleteNote(deleteTargetNoteId);
      showToast("Study note removed permanently.", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to delete note.", "error");
    } finally {
      setDeleteTargetNoteId(null);
    }
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
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

  // Loading indicator
  if (loadingSkill) {
    return (
      <div className="space-y-6 w-full animate-pulse max-w-4xl mx-auto">
        <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
        <div className="h-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl" />
        <div className="grid gap-4 grid-cols-3">
          <div className="h-20 bg-white dark:bg-zinc-900 rounded-xl" />
          <div className="h-20 bg-white dark:bg-zinc-900 rounded-xl" />
          <div className="h-20 bg-white dark:bg-zinc-900 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error/Not found state
  if (!skill) {
    return (
      <div className="text-center p-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md mx-auto mt-10">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          Skill Not Found
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          The skill you are trying to view does not exist or has been deleted.
        </p>
        <Link
          href="/skills"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Skills
        </Link>
      </div>
    );
  }

  const SkillIcon = (LucideIcons as any)[skill.icon] || LucideIcons.GraduationCap;
  const themeColor = skill.color || "#6366f1";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/skills"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-450 dark:hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Skills
      </Link>

      {/* Skill Profile Header Panel */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0"
              style={{
                backgroundColor: `${themeColor}15`,
                color: themeColor,
              }}
            >
              <SkillIcon className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-55">
                {skill.name}
              </h2>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                {skill.category}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30">
              {skill.status}
            </span>
            <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 border border-amber-150 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
              Priority: {skill.priority}
            </span>
          </div>
        </div>

        {skill.description && (
          <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
            {skill.description}
          </p>
        )}

        {/* Level indicator */}
        <div className="flex items-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 pt-1">
          <span className="text-[10px] uppercase text-zinc-450 tracking-wider mr-2">Proficiency Goal:</span>
          <span>{skill.currentLevel}</span>
          <span className="mx-2.5 text-zinc-400">➔</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{skill.targetLevel}</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-zinc-500 dark:text-zinc-400">Overall Progress</span>
            <span style={{ color: themeColor }}>{skill.progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${skill.progress}%`,
                backgroundColor: themeColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid gap-3.5 grid-cols-3">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col justify-center">
          <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider">Time Studied</span>
          <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{metrics.totalHours} hrs</span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col justify-center">
          <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider">Total Sessions</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-0.5">{metrics.totalSessions}</span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col justify-center">
          <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider">Last Studied</span>
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1 truncate">{metrics.lastStudied}</span>
        </div>
      </div>

      {/* Tabs Selection Bar */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-px">
        <button
          onClick={() => setActiveTab("sessions")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "sessions"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-550 hover:text-zinc-900 dark:text-zinc-450 dark:hover:text-zinc-200"
          )}
        >
          <Clock className="h-4 w-4" />
          Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "notes"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-550 hover:text-zinc-900 dark:text-zinc-450 dark:hover:text-zinc-200"
          )}
        >
          <FileText className="h-4 w-4" />
          Notes ({notes.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "sessions" ? (
        /* SESSIONS TAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-55">Learning Logs</h3>
            <button
              onClick={() => {
                setSelectedSession(null);
                setIsSessionFormOpen(true);
              }}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Session
            </button>
          </div>

          {sessions.length > 0 ? (
            <div className="relative border-l border-zinc-250 dark:border-zinc-800 pl-6 ml-3 space-y-4.5">
              {sessions.map((session) => {
                const isNotesExpanded = expandedItems[session.id] || false;
                const formattedDate = formatDate(session.date);

                return (
                  <div key={session.id} className="relative">
                    {/* timeline dot */}
                    <div className="absolute left-[-35px] top-1.5 flex h-6.5 w-6.5 items-center justify-center rounded-full border bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: themeColor }} />
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4.5 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                              {formattedDate}
                            </span>
                            <span className={cn(
                              "text-[8px] font-bold px-1 py-0.2 rounded border",
                              session.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                            )}>
                              {session.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">{session.topicLearned}</h4>
                          {session.summary && <p className="text-xs text-zinc-650 dark:text-zinc-400 font-medium">{session.summary}</p>}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-md shrink-0">
                            {session.duration} mins
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedSession(session);
                                setIsSessionFormOpen(true);
                              }}
                              className="p-1 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetSessionId(session.id)}
                              className="p-1 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Stars / Difficulty */}
                      <div className="flex gap-4 items-center text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-850">
                        <span>Difficulty: <span className="font-bold">{session.difficulty}</span></span>
                        <span className="flex items-center">
                          Productivity: 
                          <span className="flex ml-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={cn(
                                  "h-3 w-3",
                                  index < session.productivityRating ? "text-amber-500 fill-amber-500" : "text-zinc-200 dark:text-zinc-800"
                                )}
                              />
                            ))}
                          </span>
                        </span>
                      </div>

                      {/* Expandable notes */}
                      {session.notes && (
                        <div className="pt-2">
                          <button
                            onClick={() => toggleItemExpand(session.id)}
                            className="flex items-center gap-1 text-[10px] font-semibold text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            {isNotesExpanded ? "Hide notes" : "View study notes"}
                            {isNotesExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          {isNotesExpanded && (
                            <div className="mt-2.5 p-3 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 rounded-lg">
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
            <div className="py-10 text-center text-xs text-zinc-450 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              No learning sessions logged for this skill.
            </div>
          )}
        </div>
      ) : (
        /* NOTES TAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-55">Cheat Sheets & Notes</h3>
            <button
              onClick={() => {
                setSelectedNote(null);
                setIsNoteFormOpen(true);
              }}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Note
            </button>
          </div>

          {notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map((note) => {
                const isExpanded = expandedItems[note.id] || false;
                return (
                  <div
                    key={note.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div
                      onClick={() => toggleItemExpand(note.id)}
                      className="flex items-center justify-between p-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{note.title}</h4>
                          <span className="text-[9px] text-zinc-400">Updated {formatDate(note.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedNote(note);
                              setIsNoteFormOpen(true);
                            }}
                            className="p-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetNoteId(note.id)}
                            className="p-1 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-zinc-400">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4.5 bg-zinc-50/50 dark:bg-zinc-950/40 border-t border-zinc-150 dark:border-zinc-850">
                        <MarkdownRenderer content={note.content} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-zinc-450 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              No notes logged for this skill yet.
            </div>
          )}
        </div>
      )}

      {/* Session Modal */}
      <SessionFormModal
        open={isSessionFormOpen}
        onClose={() => {
          setIsSessionFormOpen(false);
          setSelectedSession(null);
        }}
        onSubmit={handleSessionSubmit}
        skills={[skill]}
        session={selectedSession}
        prefilledSkillId={skill.id}
      />

      {/* Note Modal */}
      <NoteFormModal
        open={isNoteFormOpen}
        onClose={() => {
          setIsNoteFormOpen(false);
          setSelectedNote(null);
        }}
        onSubmit={handleNoteSubmit}
        skills={[skill]}
        note={selectedNote}
        prefilledSkillId={skill.id}
      />

      {/* Delete session confirmation dialog */}
      <Dialog
        open={!!deleteTargetSessionId}
        onClose={() => setDeleteTargetSessionId(null)}
        title="Delete Session Log"
        description="Are you sure you want to delete this study session log?"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            This will permanently remove this record from your study history. This action is irreversible.
          </p>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setDeleteTargetSessionId(null)}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSessionDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold shadow-xs cursor-pointer"
            >
              Delete Log
            </button>
          </div>
        </div>
      </Dialog>

      {/* Delete note confirmation dialog */}
      <Dialog
        open={!!deleteTargetNoteId}
        onClose={() => setDeleteTargetNoteId(null)}
        title="Delete Study Note"
        description="Are you sure you want to delete this study note?"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            This note will be permanently removed from your dashboard database. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setDeleteTargetNoteId(null)}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleNoteDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold shadow-xs cursor-pointer"
            >
              Delete Note
            </button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
