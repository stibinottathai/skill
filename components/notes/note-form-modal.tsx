"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog } from "@/components/ui/dialog";
import { SkillNote } from "@/types/note";
import { Skill } from "@/types/skill";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { cn } from "@/lib/utils";

const noteFormSchema = z.object({
  skillId: z.string().min(1, "Skill selection is required"),
  title: z.string().min(1, "Note title is required"),
  content: z.string().min(1, "Content cannot be empty"),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface NoteFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Omit<SkillNote, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  skills: Skill[];
  note?: SkillNote | null; // Prefilled if editing
  prefilledSkillId?: string; // Prefilled if opened from specific Skill Detail page
}

export function NoteFormModal({
  open,
  onClose,
  onSubmit,
  skills,
  note,
  prefilledSkillId,
}: NoteFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [notesTab, setNotesTab] = useState<"write" | "preview">("write");

  const defaultValues: NoteFormValues = {
    skillId: prefilledSkillId || "",
    title: "",
    content: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues,
  });

  const contentText = watch("content");

  // Prefill or reset
  useEffect(() => {
    if (open) {
      setNotesTab("write");
      if (note) {
        reset({
          skillId: note.skillId,
          title: note.title,
          content: note.content,
        });
      } else {
        reset({
          ...defaultValues,
          skillId: prefilledSkillId || (skills.length > 0 ? skills[0].id : ""),
        });
      }
    }
  }, [open, note, prefilledSkillId, skills, reset]);

  const handleFormSubmit = async (values: NoteFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
      reset();
    } catch (error) {
      console.error("Failed to submit note: ", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={note ? "Edit Study Note" : "Create Study Note"}
      description={note ? "Modify your study document parameters." : "Document study cheat-sheets or code recipes for your skill."}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
        {/* Skill Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Select Skill *</label>
          <select
            {...register("skillId")}
            disabled={!!prefilledSkillId}
            className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden disabled:opacity-60"
          >
            <option value="" disabled>Select a skill</option>
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name} ({skill.category})
              </option>
            ))}
          </select>
          {errors.skillId && <p className="text-[10px] font-bold text-red-500">{errors.skillId.message}</p>}
        </div>

        {/* Title Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Note Title *</label>
          <input
            type="text"
            {...register("title")}
            className={cn(
              "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
              errors.title && "border-red-500 dark:border-red-500"
            )}
            placeholder="e.g. Cheat Sheet, Core Syntax, Setup Rules"
          />
          {errors.title && <p className="text-[10px] font-bold text-red-500">{errors.title.message}</p>}
        </div>

        {/* Content (Markdown Editor with tab switcher) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Notes Content (Markdown Supported) *</label>
            <div className="flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setNotesTab("write")}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                  notesTab === "write"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-zinc-800 dark:text-indigo-400"
                    : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setNotesTab("preview")}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                  notesTab === "preview"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-zinc-800 dark:text-indigo-400"
                    : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                Preview
              </button>
            </div>
          </div>

          {notesTab === "write" ? (
            <textarea
              {...register("content")}
              className={cn(
                "w-full min-h-[160px] p-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
                errors.content && "border-red-500 dark:border-red-500"
              )}
              placeholder="e.g. Write code snippets, reminders, checklists, resources..."
            />
          ) : (
            <div className="w-full min-h-[160px] p-3 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 overflow-y-auto max-h-[260px]">
              {contentText ? (
                <MarkdownRenderer content={contentText} />
              ) : (
                <p className="text-xs text-zinc-400 italic">No notes to preview yet.</p>
              )}
            </div>
          )}
          {errors.content && <p className="text-[10px] font-bold text-red-500">{errors.content.message}</p>}
        </div>

        {/* Action triggers */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (skills.length === 0 && !prefilledSkillId)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Saving..." : note ? "Save Changes" : "Save Note"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
