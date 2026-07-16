"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import {
  subscribeNotes,
  createNote,
  updateNote,
  deleteNote,
} from "@/services/notes";
import { subscribeSkills } from "@/services/skills";
import { SkillNote } from "@/types/note";
import { Skill } from "@/types/skill";
import { NoteFormModal } from "@/components/notes/note-form-modal";
import { Dialog } from "@/components/ui/dialog";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  Plus,
  Search,
  Notebook,
  Edit2,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

export default function NotesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [notes, setNotes] = useState<SkillNote[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState("All");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SkillNote | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Expanded notes state (mapping of noteId -> boolean)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Subscriptions
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Subscribe to skills
    const unsubscribeSkills = subscribeSkills(user.uid, (fetchedSkills) => {
      setSkills(fetchedSkills);
    });

    // Subscribe to notes
    const unsubscribeNotes = subscribeNotes(user.uid, (fetchedNotes) => {
      // Sort notes by updated date newest first
      const sorted = fetchedNotes.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setNotes(sorted);
      setLoading(false);
    });

    return () => {
      unsubscribeSkills();
      unsubscribeNotes();
    };
  }, [user]);

  // Skill lookups map
  const skillMap = useMemo(() => {
    const map = new Map<string, Skill>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSkill =
        selectedSkillFilter === "All" || note.skillId === selectedSkillFilter;

      return matchesSearch && matchesSkill;
    });
  }, [notes, searchQuery, selectedSkillFilter]);

  // Group filtered notes by skill ID
  const groupedNotes = useMemo(() => {
    const groups: Record<string, SkillNote[]> = {};
    filteredNotes.forEach((note) => {
      if (!groups[note.skillId]) {
        groups[note.skillId] = [];
      }
      groups[note.skillId].push(note);
    });
    return groups;
  }, [filteredNotes]);

  // CRUD Actions
  const handleAddOrEditSubmit = async (
    values: Omit<SkillNote, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!user) return;
    try {
      if (selectedNote) {
        await updateNote(selectedNote.id, values);
        showToast(`Successfully updated note "${values.title}"!`, "success");
      } else {
        await createNote(user.uid, values);
        showToast(`Successfully saved note "${values.title}"!`, "success");
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to save note.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteNote(deleteTargetId);
      showToast("Permanently deleted note.", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to delete note.", "error");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const toggleNoteExpand = (id: string) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatUpdatedDate = (dateStr: string) => {
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

  if (loading) {
    return (
      <div className="space-y-6 w-full animate-pulse max-w-4xl mx-auto">
        <div className="h-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
              <div className="h-4.5 w-1/3 bg-zinc-200 dark:bg-zinc-850 rounded-sm" />
              <div className="h-14 bg-zinc-100 dark:bg-zinc-950 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Study Notes Inventory
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Write cheat sheets, checklists, and code snippets linked to your skills.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedNote(null);
            setIsFormOpen(true);
          }}
          disabled={skills.length === 0}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98] cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Plus className="h-4.5 w-4.5" />
          Create Note
        </button>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-550 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title or content..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-zinc-50/50 text-sm focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-550"
          />
        </div>

        <div className="flex items-center gap-1.5 h-10 px-2.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs text-zinc-650 dark:text-zinc-400">
          <span className="font-semibold text-[10px] uppercase text-zinc-400 tracking-wider">Filter Skill:</span>
          <select
            value={selectedSkillFilter}
            onChange={(e) => setSelectedSkillFilter(e.target.value)}
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
      </div>

      {/* Notes Accordion Group List */}
      {Object.keys(groupedNotes).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedNotes).map(([skillId, notesList]) => {
            const skill = skillMap.get(skillId);
            const skillColor = skill?.color || "#6366f1";
            const SkillIcon = skill ? ((LucideIcons as any)[skill.icon] || LucideIcons.GraduationCap) : LucideIcons.GraduationCap;

            return (
              <div key={skillId} className="space-y-3">
                {/* Skill Group Label header */}
                <div className="flex items-center gap-2 px-1">
                  <div
                    className="flex h-7 w-7 rounded-lg items-center justify-center text-[10px]"
                    style={{
                      backgroundColor: `${skillColor}15`,
                      color: skillColor,
                    }}
                  >
                    <SkillIcon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-850 dark:text-zinc-200">
                    {skill?.name || "Uncategorized Notes"}
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {notesList.length} {notesList.length === 1 ? "note" : "notes"}
                  </span>
                </div>

                {/* List of notes for this skill */}
                <div className="space-y-3.5">
                  {notesList.map((note) => {
                    const isExpanded = expandedNotes[note.id] || false;

                    return (
                      <div
                        key={note.id}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                      >
                        {/* Header bar */}
                        <div
                          onClick={() => toggleNoteExpand(note.id)}
                          className="flex items-center justify-between p-4.5 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                            <FileText className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate leading-snug">
                                {note.title}
                              </h4>
                              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                                <Calendar className="h-2.5 w-2.5" />
                                Updated {formatUpdatedDate(note.updatedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Card Actions Panel (prevent row collapse click) */}
                            <div
                              className="flex gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setSelectedNote(note);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-550 dark:text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTargetId(note.id)}
                                className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-105 dark:border-red-950/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Arrow expand toggle */}
                            <div className="text-zinc-400">
                              {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Content */}
                        {isExpanded && (
                          <div className="p-5 bg-zinc-50/50 dark:bg-zinc-950/40 border-t border-zinc-150 dark:border-zinc-850 animate-slide-down">
                            <MarkdownRenderer content={note.content} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs min-h-[350px]">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 mb-5 animate-pulse">
            <Notebook className="h-10 w-10 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            No Notes Found
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-455 max-w-sm leading-relaxed mb-6">
            {notes.length === 0
              ? "Create cheat-sheets, code recipes, reference structures, and outline complex study concepts."
              : "No notes match your filtering criteria. Try resetting query search filters."}
          </p>
          {notes.length === 0 && (
            <button
              onClick={() => {
                setSelectedNote(null);
                setIsFormOpen(true);
              }}
              disabled={skills.length === 0}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4.5 w-4.5" />
              Create First Note
            </button>
          )}
        </div>
      )}

      {/* Note modal dialog */}
      <NoteFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedNote(null);
        }}
        onSubmit={handleAddOrEditSubmit}
        skills={skills}
        note={selectedNote}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        title="Delete Study Note"
        description="Are you sure you want to permanently delete this note?"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            This will permanently remove this note document from your dashboard records. This action is irreversible.
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
