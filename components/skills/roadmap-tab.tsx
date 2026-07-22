"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import {
  subscribeRoadmapItems,
  createRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem,
  reorderRoadmapItems,
} from "@/services/roadmap";
import { updateSkill } from "@/services/skills";
import { RoadmapItem, RoadmapDifficulty, RoadmapStatus } from "@/types/roadmap";
import { Skill } from "@/types/skill";
import { LearningSession } from "@/types/session";
import { Dialog } from "@/components/ui/dialog";
import { SessionFormModal } from "@/components/sessions/session-form-modal";
import {
  CheckSquare,
  Square,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Clock,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface RoadmapTabProps {
  skill: Skill;
  sessions: LearningSession[];
}

const roadmapItemSchema = z.object({
  title: z.string().min(1, "Topic title is required"),
  description: z.string().optional(),
  estimatedStudyTime: z.number().min(1, "Must be at least 1 minute"),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"] as const),
  status: z.enum(["Not Started", "In Progress", "Completed", "Skipped"] as const),
  resourceLinks: z.string().optional(),
  notes: z.string().optional(),
});

type RoadmapItemFormValues = z.infer<typeof roadmapItemSchema>;

export function RoadmapTab({ skill, sessions }: RoadmapTabProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Roadmap Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);

  // Delete target state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Quick Study session modal state
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [prefilledTopicForSession, setPrefilledTopicForSession] = useState("");

  // Expansions state (item ID -> boolean)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Drag and drop local state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Form hook
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<RoadmapItemFormValues>({
    resolver: zodResolver(roadmapItemSchema),
    defaultValues: {
      title: "",
      description: "",
      estimatedStudyTime: 30,
      difficulty: "Beginner",
      status: "Not Started",
      resourceLinks: "",
      notes: "",
    },
  });

  // Subscribe to roadmap items
  useEffect(() => {
    if (!user || !skill.id) return;

    setLoading(true);
    const unsubscribe = subscribeRoadmapItems(user.uid, skill.id, (fetchedItems) => {
      setRoadmapItems(fetchedItems);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, skill.id]);

  // Sync overall skill progress in Firestore whenever roadmap items change
  useEffect(() => {
    if (!skill.id || roadmapItems.length === 0) return;
    const total = roadmapItems.length;
    const completed = roadmapItems.filter((i) => i.status === "Completed").length;
    const calculatedProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (skill.progress !== calculatedProgress) {
      updateSkill(skill.id, { progress: calculatedProgress }).catch(console.error);
    }
  }, [roadmapItems, skill.id, skill.progress]);

  // Sync Form when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      reset({
        title: selectedItem.title,
        description: selectedItem.description || "",
        estimatedStudyTime: selectedItem.estimatedStudyTime,
        difficulty: selectedItem.difficulty,
        status: selectedItem.status,
        resourceLinks: selectedItem.resourceLinks || "",
        notes: selectedItem.notes || "",
      });
    } else {
      reset({
        title: "",
        description: "",
        estimatedStudyTime: 30,
        difficulty: "Beginner",
        status: "Not Started",
        resourceLinks: "",
        notes: "",
      });
    }
  }, [selectedItem, reset]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = roadmapItems.length;
    const completed = roadmapItems.filter((i) => i.status === "Completed").length;
    const remaining = roadmapItems.filter((i) => i.status !== "Completed" && i.status !== "Skipped").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Remaining minutes
    const remainingMinutes = roadmapItems
      .filter((i) => i.status !== "Completed" && i.status !== "Skipped")
      .reduce((acc, curr) => acc + curr.estimatedStudyTime, 0);
    const remainingHours = parseFloat((remainingMinutes / 60).toFixed(1));

    // Last completed topic
    const completedItemsSorted = roadmapItems
      .filter((i) => i.status === "Completed" && i.completionDate)
      .sort((a, b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime());
    const lastCompletedTopic = completedItemsSorted.length > 0 ? completedItemsSorted[0].title : "None";

    // Estimate Completion Date based on average study duration
    let estCompletionDate = "Never";
    if (sessions.length > 0 && remainingMinutes > 0) {
      const dates = sessions.map((s) => s.date);
      const uniqueDaysCount = new Set(dates).size;
      const totalSessionMinutes = sessions.reduce((acc, curr) => acc + curr.duration, 0);
      
      // Calculate avg study minutes per active day (default to 45 if no data)
      const avgMinutesPerDay = uniqueDaysCount > 0 ? totalSessionMinutes / uniqueDaysCount : 45;
      
      const daysToComplete = Math.ceil(remainingMinutes / avgMinutesPerDay);
      
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + daysToComplete);
      
      estCompletionDate = estDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else if (remainingMinutes === 0) {
      estCompletionDate = "Roadmap Completed!";
    } else {
      // Default fallback if no study session logs exist (assume 30 mins study / day)
      const daysToComplete = Math.ceil(remainingMinutes / 30);
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + daysToComplete);
      estCompletionDate = estDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    return {
      total,
      completed,
      remaining,
      progress,
      remainingHours,
      lastCompletedTopic,
      estCompletionDate,
    };
  }, [roadmapItems, sessions]);

  // Actions
  const handleCheckboxToggle = async (item: RoadmapItem) => {
    const isCompleted = item.status === "Completed";
    const nextStatus: RoadmapStatus = isCompleted ? "Not Started" : "Completed";
    try {
      await updateRoadmapItem(item.id, { status: nextStatus });
      showToast(
        nextStatus === "Completed"
          ? `Marked "${item.title}" as completed!`
          : `Marked "${item.title}" as not completed.`,
        "success"
      );
    } catch (e) {
      showToast("Failed to update topic status.", "error");
    }
  };

  const handleFormSubmit = async (values: RoadmapItemFormValues) => {
    if (!user) return;
    try {
      if (selectedItem) {
        await updateRoadmapItem(selectedItem.id, values);
        showToast(`Updated topic "${values.title}"`, "success");
      } else {
        await createRoadmapItem(user.uid, skill.id, {
          ...values,
          order: roadmapItems.length,
        });
        showToast(`Added topic "${values.title}" to roadmap`, "success");
      }
      setIsFormOpen(false);
      setSelectedItem(null);
    } catch (e) {
      showToast("Failed to save roadmap topic.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteRoadmapItem(deleteTargetId);
      showToast("Deleted roadmap topic.", "success");
    } catch (e) {
      showToast("Failed to delete topic.", "error");
    } finally {
      setDeleteTargetId(null);
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const listCopy = [...roadmapItems];
    const [draggedItem] = listCopy.splice(draggedIndex, 1);
    listCopy.splice(index, 0, draggedItem);

    // Update local state immediately for snappy UI
    setRoadmapItems(listCopy);
    setDraggedIndex(null);

    try {
      await reorderRoadmapItems(listCopy);
    } catch (err) {
      showToast("Failed to save drag order in database.", "error");
    }
  };

  // Find next unfinished topic
  const nextUnfinishedTopic = useMemo(() => {
    return roadmapItems.find((i) => i.status === "Not Started" || i.status === "In Progress");
  }, [roadmapItems]);

  const toggleItemExpand = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatCompletionDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Banner */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">Roadmap Progress</span>
          <div className="flex items-center gap-3.5 mt-1.5">
            <span className="text-xl font-extrabold text-indigo-650 dark:text-indigo-400 leading-none">{metrics.progress}%</span>
            <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded-full">
              {metrics.completed} / {metrics.total} topics
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">Remaining Hours</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-55 mt-1 block leading-none">{metrics.remainingHours} hrs</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">Last Completed Topic</span>
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1 block truncate leading-tight" title={metrics.lastCompletedTopic}>
            {metrics.lastCompletedTopic}
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">Est. Completion Date</span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-450 mt-1 block truncate leading-tight">
            {metrics.estCompletionDate}
          </span>
        </div>
      </div>

      {/* Actions and Timeline */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap gap-2.5">
          {nextUnfinishedTopic && (
            <button
              onClick={() => {
                setPrefilledTopicForSession(nextUnfinishedTopic.title);
                setIsStudyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950/30 text-xs font-bold cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              Study Next: {nextUnfinishedTopic.title}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setSelectedItem(null);
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-xs cursor-pointer select-none shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Topic
        </button>
      </div>

      {/* Checklist list */}
      {roadmapItems.length > 0 ? (
        <div className="space-y-2.5">
          {roadmapItems.map((item, index) => {
            const isCompleted = item.status === "Completed";
            const isSkipped = item.status === "Skipped";
            const isExpanded = expandedItems[item.id] || false;

            return (
              <div
                key={item.id}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700",
                  isCompleted ? "opacity-75" : "",
                  draggedIndex === index ? "opacity-40 bg-zinc-50 dark:bg-zinc-950" : ""
                )}
              >
                {/* Topic Item Header bar */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    {/* Drag Handle */}
                    <div className="cursor-grab text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-250 select-none shrink-0">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* Completion Checkbox */}
                    <button
                      onClick={() => handleCheckboxToggle(item)}
                      className="text-zinc-500 hover:text-indigo-650 dark:hover:text-indigo-400 shrink-0 cursor-pointer"
                    >
                      {isCompleted ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400 fill-indigo-50 dark:fill-indigo-950/20" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>

                    {/* Topic details */}
                    <div className="min-w-0 flex-1">
                      <span
                        onClick={() => toggleItemExpand(item.id)}
                        className={cn(
                          "text-xs font-bold text-zinc-850 dark:text-zinc-100 hover:underline cursor-pointer select-none leading-snug block truncate",
                          isCompleted && "line-through text-zinc-450 dark:text-zinc-500"
                        )}
                      >
                        {item.title}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className={cn(
                          "text-[8px] font-bold px-1.5 py-0.2 rounded-md",
                          item.difficulty === "Beginner" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
                          item.difficulty === "Intermediate" && "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400",
                          item.difficulty === "Advanced" && "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                        )}>
                          {item.difficulty}
                        </span>
                        <span className="text-[8px] font-semibold text-zinc-450 dark:text-zinc-500 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {item.estimatedStudyTime}m
                        </span>
                        {isCompleted && item.completionDate && (
                          <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ {formatCompletionDate(item.completionDate)}
                          </span>
                        )}
                        {isSkipped && (
                          <span className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded">
                            Skipped
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPrefilledTopicForSession(item.title);
                        setIsStudyModalOpen(true);
                      }}
                      title="Log learning session for this topic"
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-450 hover:text-zinc-900 transition-colors cursor-pointer"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setIsFormOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-450 hover:text-zinc-900 transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(item.id)}
                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Collapsible expanded notes */}
                {isExpanded && (
                  <div className="px-4.5 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-850/60 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-3">
                    {item.description && (
                      <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed font-medium">
                        {item.description}
                      </p>
                    )}
                    {item.resourceLinks && (
                      <div className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-indigo-500" />
                        <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 mr-1.5">Links:</span>
                        <a
                          href={item.resourceLinks}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-indigo-650 hover:underline dark:text-indigo-400 break-all"
                        >
                          {item.resourceLinks}
                        </a>
                      </div>
                    )}
                    {item.notes && (
                      <div className="space-y-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Cheatsheet / Notes:
                        </span>
                        <div className="bg-white dark:bg-zinc-950/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                          {item.notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-14 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs min-h-[300px]">
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 mb-4 animate-pulse">
            <Sparkles className="h-9 w-9 text-indigo-500" />
          </div>
          <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            Build Your Learning Path
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-450 max-w-xs leading-relaxed mb-5">
            Add learning roadmap steps manually, or re-create this skill with presets like Python or Next.js to populate a curriculum.
          </p>
          <button
            onClick={() => {
              setSelectedItem(null);
              setIsFormOpen(true);
            }}
            className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" />
            Add First Topic
          </button>
        </div>
      )}

      {/* Roadmap Item Modal Form */}
      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
        title={selectedItem ? "Edit Topic Item" : "Add Roadmap Topic"}
        description="Detailed topic coverage and estimated time allocations."
        className="max-w-md"
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Topic Title *</label>
            <input
              type="text"
              {...register("title")}
              className={cn(
                "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
                errors.title && "border-red-500"
              )}
              placeholder="e.g. Variables & Scope"
            />
            {errors.title && <p className="text-[10px] font-bold text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Description (Optional)</label>
            <textarea
              {...register("description")}
              className="w-full min-h-[60px] p-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
              placeholder="Cheatsheet pointers or core concept definitions..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Est. Time (Mins) *</label>
              <input
                type="number"
                {...register("estimatedStudyTime", { valueAsNumber: true })}
                className={cn(
                  "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden",
                  errors.estimatedStudyTime && "border-red-500"
                )}
              />
              {errors.estimatedStudyTime && (
                <p className="text-[10px] font-bold text-red-500">{errors.estimatedStudyTime.message}</p>
              )}
            </div>

            {/* Difficulty */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Difficulty</label>
              <select
                {...register("difficulty")}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Status</label>
            <select
              {...register("status")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Skipped">Skipped</option>
            </select>
          </div>

          {/* Resource Links */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Resource URL (Optional)</label>
            <input
              type="text"
              {...register("resourceLinks")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
              placeholder="e.g. https://docs.python.org"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Cheatsheet Notes (Optional)</label>
            <textarea
              {...register("notes")}
              className="w-full min-h-[60px] p-3 rounded-lg border border-zinc-200 bg-white text-xs dark:border-zinc-800 dark:bg-zinc-950 focus:outline-hidden"
              placeholder="Syntax examples, CLI commands, etc."
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setSelectedItem(null);
              }}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              Save Item
            </button>
          </div>

        </form>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <Dialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        title="Delete Topic Item"
        description="Are you sure you want to delete this topic from your roadmap?"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-650 dark:text-zinc-400">
            This will permanently remove this item from your skill roadmap curriculum.
          </p>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setDeleteTargetId(null)}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Dialog>

      {/* Prefilled study session modal logs */}
      <SessionFormModal
        open={isStudyModalOpen}
        onClose={() => {
          setIsStudyModalOpen(false);
          setPrefilledTopicForSession("");
        }}
        onSubmit={async (values) => {
          if (!user) return;
          try {
            const { createLearningSession } = await import("@/services/learning-sessions");
            await createLearningSession(user.uid, values);
            showToast("Successfully logged study session!", "success");
            
            // Auto transition the corresponding topic to In Progress or Completed
            const matchedItem = roadmapItems.find((i) => i.title === prefilledTopicForSession);
            if (matchedItem && matchedItem.status === "Not Started") {
              await updateRoadmapItem(matchedItem.id, { status: "In Progress" });
            }
          } catch (e) {
            showToast("Failed to log study session.", "error");
          }
        }}
        skills={[skill]}
        session={null}
        prefilledSkillId={skill.id}
        prefilledTopic={prefilledTopicForSession}
      />

    </div>
  );
}
