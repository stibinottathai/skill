"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import { subscribeSkills } from "@/services/skills";
import { subscribeLearningSessions } from "@/services/learning-sessions";
import {
  subscribeTasks,
  createTask,
  updateTask,
  deleteTask,
  bulkCompleteTasks,
  bulkDeleteTasks,
  reorderTasks,
} from "@/services/tasks";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skill } from "@/types/skill";
import { LearningSession } from "@/types/session";
import { LearningTask, TaskCategory, TaskPriority, TaskStatus } from "@/types/task";
import { DailyPlanItem } from "@/types/planner";
import { Dialog } from "@/components/ui/dialog";
import {
  Plus,
  Search,
  ListTodo,
  Columns,
  Calendar as CalendarIcon,
  Clock,
  Star,
  Edit2,
  Trash2,
  Copy,
  Archive,
  CheckCircle,
  Eye,
  GripVertical,
  CheckSquare,
  Square,
  AlertCircle,
  Folder,
  Tag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import * as LucideIcons from "lucide-react";

const CATEGORIES: TaskCategory[] = ["Learning", "Work", "Personal", "Reading", "Project", "Research", "Other"];
const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
const STATUSES: TaskStatus[] = ["Todo", "In Progress", "Completed", "Cancelled"];

const taskFormSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  category: z.enum(["Learning", "Work", "Personal", "Reading", "Project", "Research", "Other"] as const),
  priority: z.enum(["Low", "Medium", "High", "Critical"] as const),
  dueDate: z.string().optional(),
  estimatedTime: z.number().min(0, "Time cannot be negative"),
  status: z.enum(["Todo", "In Progress", "Completed", "Cancelled"] as const),
  linkedSkillId: z.string().optional(),
  linkedRoadmapItemId: z.string().optional(),
  tagsString: z.string().optional(), // processed to array of strings
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export default function TasksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Subscribed lists
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [allDailyPlans, setAllDailyPlans] = useState<DailyPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout Tab: "list" | "kanban" | "calendar"
  const [activeTab, setActiveTab] = useState<"list" | "kanban" | "calendar">("list");

  // Search & Filters (for List View)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Active"); // Active = non-completed, non-cancelled

  // Bulk actions checklist state (task IDs)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Task Add/Edit Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<LearningTask | null>(null);

  // Delete target state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Calendar Date state
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string | null>(null);

  // Drag and Drop ordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Learning",
      priority: "Medium",
      dueDate: "",
      estimatedTime: 30,
      status: "Todo",
      linkedSkillId: "",
      linkedRoadmapItemId: "",
      tagsString: "",
    },
  });

  // Load real-time subscriptions
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribeTasks = subscribeTasks(user.uid, (fetchedTasks) => {
      setTasks(fetchedTasks);
      setLoading(false);
    });

    const unsubscribeSkills = subscribeSkills(user.uid, (fetchedSkills) => {
      setSkills(fetchedSkills);
    });

    const unsubscribeSessions = subscribeLearningSessions(user.uid, (fetchedSessions) => {
      setSessions(fetchedSessions);
    });

    // Subscribe to all daily planner items for user to feed the calendar
    const planQ = query(collection(db, "daily_plans"), where("userId", "==", user.uid));
    const unsubscribePlan = onSnapshot(planQ, (snap) => {
      const plans = snap.docs.map((docSnap: any) => {
        const data = docSnap.data();
        return { id: docSnap.id, ...data } as DailyPlanItem;
      });
      setAllDailyPlans(plans);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeSkills();
      unsubscribeSessions();
      unsubscribePlan();
    };
  }, [user]);

  // Sync Form when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      reset({
        title: selectedTask.title,
        description: selectedTask.description || "",
        category: selectedTask.category,
        priority: selectedTask.priority,
        dueDate: selectedTask.dueDate || "",
        estimatedTime: selectedTask.estimatedTime || 0,
        status: selectedTask.status,
        linkedSkillId: selectedTask.linkedSkillId || "",
        linkedRoadmapItemId: selectedTask.linkedRoadmapItemId || "",
        tagsString: selectedTask.tags ? selectedTask.tags.join(", ") : "",
      });
    } else {
      reset({
        title: "",
        description: "",
        category: "Learning",
        priority: "Medium",
        dueDate: "",
        estimatedTime: 30,
        status: "Todo",
        linkedSkillId: "",
        linkedRoadmapItemId: "",
        tagsString: "",
      });
    }
  }, [selectedTask, reset]);

  const skillLookupMap = useMemo(() => {
    const map = new Map<string, Skill>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  // Filtered tasks (for list view)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.archived) return false;

      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategoryFilter === "All" || task.category === selectedCategoryFilter;

      const matchesPriority =
        selectedPriorityFilter === "All" || task.priority === selectedPriorityFilter;

      let matchesStatus = true;
      if (selectedStatusFilter === "Active") {
        matchesStatus = task.status !== "Completed" && task.status !== "Cancelled";
      } else if (selectedStatusFilter !== "All") {
        matchesStatus = task.status === selectedStatusFilter;
      }

      return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });
  }, [tasks, searchQuery, selectedCategoryFilter, selectedPriorityFilter, selectedStatusFilter]);

  // CRUD actions
  const handleFormSubmit = async (values: TaskFormValues) => {
    if (!user) return;
    
    // Parse tags comma string to array
    const tags = values.tagsString
      ? values.tagsString.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    const { tagsString, ...taskData } = values;

    try {
      const sanitizedTask = {
        title: taskData.title,
        description: taskData.description || "",
        category: taskData.category,
        priority: taskData.priority,
        dueDate: taskData.dueDate || "",
        estimatedTime: taskData.estimatedTime,
        status: taskData.status,
        linkedSkillId: taskData.linkedSkillId || "",
        linkedRoadmapItemId: taskData.linkedRoadmapItemId || "",
        tags,
      };

      if (selectedTask) {
        await updateTask(selectedTask.id, sanitizedTask);
        showToast("Task updated successfully!", "success");
      } else {
        await createTask(user.uid, {
          ...sanitizedTask,
          order: tasks.length,
          archived: false,
        });
        showToast("Created new task!", "success");
      }
      setIsFormOpen(false);
      setSelectedTask(null);
    } catch (e) {
      showToast("Failed to save task.", "error");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      showToast("Deleted task.", "success");
    } catch (e) {
      showToast("Failed to delete task.", "error");
    }
  };

  const handleDuplicateTask = async (task: LearningTask) => {
    if (!user) return;
    try {
      const { id, createdAt, updatedAt, order, ...duplicateData } = task;
      await createTask(user.uid, {
        ...duplicateData,
        title: `${task.title} (Copy)`,
        order: tasks.length,
      });
      showToast("Task duplicated!", "success");
    } catch (e) {
      showToast("Failed to duplicate task.", "error");
    }
  };

  const handleArchiveToggle = async (task: LearningTask) => {
    try {
      await updateTask(task.id, { archived: !task.archived });
      showToast(task.archived ? "Restored task." : "Archived task.", "success");
    } catch (e) {
      showToast("Failed to archive task.", "error");
    }
  };

  // Bulk actions
  const handleSelectAllTasks = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleToggleSelectTask = (id: string) => {
    const copy = new Set(selectedTaskIds);
    if (copy.has(id)) {
      copy.delete(id);
    } else {
      copy.add(id);
    }
    setSelectedTaskIds(copy);
  };

  const handleBulkComplete = async () => {
    if (selectedTaskIds.size === 0) return;
    try {
      await bulkCompleteTasks(Array.from(selectedTaskIds));
      showToast(`Completed ${selectedTaskIds.size} tasks!`, "success");
      setSelectedTaskIds(new Set());
    } catch (e) {
      showToast("Bulk update failed.", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    try {
      await bulkDeleteTasks(Array.from(selectedTaskIds));
      showToast(`Deleted ${selectedTaskIds.size} tasks permanently.`, "success");
      setSelectedTaskIds(new Set());
    } catch (e) {
      showToast("Bulk delete failed.", "error");
    }
  };

  // HTML5 Drag and Drop reordering (for List View)
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

    const listCopy = [...tasks];
    const [draggedItem] = listCopy.splice(draggedIndex, 1);
    listCopy.splice(index, 0, draggedItem);

    // Snappy UI state
    setTasks(listCopy);
    setDraggedIndex(null);

    try {
      await reorderTasks(listCopy);
    } catch (err) {
      showToast("Failed to save reorder.", "error");
    }
  };

  // Kanban view native drag/drop status updates
  const handleKanbanDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleKanbanDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    try {
      await updateTask(taskId, { status: targetStatus });
      showToast(`Moved task to ${targetStatus}!`, "success");
    } catch (err) {
      showToast("Failed to update status.", "error");
    }
  };

  // Calendar View month details
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const leadingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon as start day
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const cells = [];
    for (let i = 0; i < leadingOffset; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      cells.push({ day, dateStr: `${yyyy}-${mm}-${dd}` });
    }
    return cells;
  }, [year, month]);

  // Aggregate items by date for the calendar
  const calendarAggr = useMemo(() => {
    const map: Record<string, { tasks: LearningTask[]; plans: DailyPlanItem[]; sessions: LearningSession[] }> = {};
    
    // 1. Map tasks by due date
    tasks.forEach((t) => {
      if (t.dueDate) {
        if (!map[t.dueDate]) map[t.dueDate] = { tasks: [], plans: [], sessions: [] };
        map[t.dueDate].tasks.push(t);
      }
    });

    // 2. Map daily plans by date
    allDailyPlans.forEach((p) => {
      if (p.date) {
        if (!map[p.date]) map[p.date] = { tasks: [], plans: [], sessions: [] };
        map[p.date].plans.push(p);
      }
    });

    // 3. Map learning sessions by date
    sessions.forEach((s) => {
      if (s.date) {
        if (!map[s.date]) map[s.date] = { tasks: [], plans: [], sessions: [] };
        map[s.date].sessions.push(s);
      }
    });

    return map;
  }, [tasks, allDailyPlans, sessions]);

  const selectedDateActivities = useMemo(() => {
    if (!selectedCalendarDateStr) return null;
    return calendarAggr[selectedCalendarDateStr] || { tasks: [], plans: [], sessions: [] };
  }, [selectedCalendarDateStr, calendarAggr]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Task Center
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Organize learning actions and general todo tasks in lists, boards, and calendars.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedTask(null);
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Task
        </button>
      </div>

      {/* Tabs Selectors */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-px">
        <button
          onClick={() => setActiveTab("list")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "list"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-450"
          )}
        >
          <ListTodo className="h-4 w-4" />
          List View
        </button>
        <button
          onClick={() => setActiveTab("kanban")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "kanban"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-450"
          )}
        >
          <Columns className="h-4 w-4" />
          Kanban Board
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "calendar"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-450"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          Activity Calendar
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "list" && (
        <div className="space-y-4">
          
          {/* Filters Panel */}
          <div className="flex flex-wrap gap-3 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs items-center">
            
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-zinc-200 bg-zinc-50/50 text-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 h-9 px-2 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs">
              <span className="text-[9px] uppercase font-bold text-zinc-400">Category:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden pr-2 font-bold cursor-pointer dark:text-zinc-300"
              >
                <option value="All">All</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5 h-9 px-2 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs">
              <span className="text-[9px] uppercase font-bold text-zinc-400">Priority:</span>
              <select
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden pr-2 font-bold cursor-pointer dark:text-zinc-300"
              >
                <option value="All">All</option>
                {PRIORITIES.map((pri) => (
                  <option key={pri} value={pri}>
                    {pri}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 h-9 px-2 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-xs">
              <span className="text-[9px] uppercase font-bold text-zinc-400">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent border-0 focus:outline-hidden pr-2 font-bold cursor-pointer dark:text-zinc-300"
              >
                <option value="Active">Active</option>
                <option value="All">All</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Bulk Actions Panel (if selection exists) */}
          {selectedTaskIds.size > 0 && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-150 rounded-xl dark:bg-indigo-950/20 dark:border-indigo-900/35 flex items-center justify-between animate-slide-down">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                {selectedTaskIds.size} tasks selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkComplete}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs cursor-pointer"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Complete
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-650 hover:bg-red-600 text-white font-bold text-xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Tasks List */}
          {filteredTasks.length > 0 ? (
            <div className="space-y-2">
              {filteredTasks.map((task, index) => {
                const isCompleted = task.status === "Completed";
                const isCancelled = task.status === "Cancelled";
                const isChecked = selectedTaskIds.has(task.id);
                const skill = skillLookupMap.get(task.linkedSkillId);

                return (
                  <div
                    key={task.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={cn(
                      "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all shadow-3xs",
                      isCompleted ? "opacity-75" : "",
                      draggedIndex === index ? "opacity-40" : ""
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Drag handle */}
                      <div className="cursor-grab text-zinc-400 shrink-0 select-none">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Bulk Select checkbox */}
                      <button
                        onClick={() => handleToggleSelectTask(task.id)}
                        className="text-zinc-400 hover:text-zinc-700 shrink-0 cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="h-4.5 w-4.5 text-indigo-650 fill-indigo-50 dark:fill-indigo-950/20" />
                        ) : (
                          <Square className="h-4.5 w-4.5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "text-xs font-bold text-zinc-850 dark:text-zinc-150 block truncate leading-snug",
                            isCompleted && "line-through text-zinc-400"
                          )}
                        >
                          {task.title}
                        </span>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[8px] font-bold text-zinc-450 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded-md">
                            {task.category}
                          </span>
                          <span className={cn(
                            "text-[8px] font-bold px-1.5 py-0.2 rounded-md",
                            task.priority === "Critical" && "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455",
                            task.priority === "High" && "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-455",
                            task.priority === "Medium" && "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400",
                            task.priority === "Low" && "bg-zinc-50 text-zinc-600 dark:bg-zinc-800"
                          )}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="text-[8px] font-semibold text-zinc-450 dark:text-zinc-500 flex items-center gap-0.5">
                              <CalendarIcon className="h-2.5 w-2.5" />
                              Due {task.dueDate}
                            </span>
                          )}
                          {skill && (
                            <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400">
                              {skill.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDuplicateTask(task)}
                        title="Duplicate Task"
                        className="p-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchiveToggle(task)}
                        title="Archive Task"
                        className="p-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setIsFormOpen(true);
                        }}
                        className="p-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-450 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              No tasks found. Click "Add Task" to create one!
            </div>
          )}

        </div>
      )}

      {activeTab === "kanban" && (
        /* KANBAN BOARD VIEW */
        <div className="grid gap-4 md:grid-cols-4 items-start">
          {STATUSES.map((status) => {
            const columnTasks = tasks.filter((t) => t.status === status && !t.archived);

            return (
              <div
                key={status}
                onDragOver={(e) => handleDragOver(e, 0)} // reuse dragover handler
                onDrop={(e) => handleKanbanDrop(e, status)}
                className="bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 rounded-2xl p-4.5 space-y-4 min-h-[400px] flex flex-col justify-start"
              >
                {/* Column header */}
                <div className="flex justify-between items-center border-b border-zinc-150 dark:border-zinc-800 pb-2">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">{status}</h4>
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Cards stack */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnTasks.map((task) => {
                    const skill = skillLookupMap.get(task.linkedSkillId);
                    
                    return (
                      <div
                        key={task.id}
                        draggable="true"
                        onDragStart={(e) => handleKanbanDragStart(e, task.id)}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2.5 shadow-3xs cursor-grab active:cursor-grabbing hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                      >
                        <h5 className="text-xs font-bold text-zinc-850 dark:text-zinc-100 leading-snug line-clamp-2">
                          {task.title}
                        </h5>
                        
                        {task.description && (
                          <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-medium line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className={cn(
                            "text-[7px] font-bold px-1.5 py-0.2 rounded-md",
                            task.priority === "Critical" && "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455",
                            task.priority === "High" && "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-455",
                            task.priority === "Medium" && "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400",
                            task.priority === "Low" && "bg-zinc-50 text-zinc-650"
                          )}>
                            {task.priority}
                          </span>
                          
                          {task.dueDate && (
                            <span className="text-[7px] font-semibold text-zinc-450 dark:text-zinc-550 flex items-center gap-0.5">
                              <CalendarIcon className="h-2 w-2" />
                              {task.dueDate}
                            </span>
                          )}

                          {skill && (
                            <span className="text-[7px] font-bold text-indigo-650 dark:text-indigo-400 block truncate max-w-[80px]">
                              {skill.name}
                            </span>
                          )}
                        </div>

                        {/* Card edit link actions */}
                        <div className="flex justify-end gap-1.5 border-t border-zinc-100 dark:border-zinc-800/60 pt-2">
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setIsFormOpen(true);
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-zinc-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "calendar" && (
        /* ACTIVITY CALENDAR VIEW */
        <div className="space-y-6 animate-slide-up">
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
            {/* Header month nav */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="h-5 w-5 text-indigo-500" />
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                  {monthNames[month]} {year}
                </h3>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setCurrentCalendarDate(new Date(year, month - 1, 1));
                    setSelectedCalendarDateStr(null);
                  }}
                  className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 cursor-pointer"
                >
                  <ChevronLeft className="h-4.5 w-4.5 text-zinc-500" />
                </button>
                <button
                  onClick={() => {
                    setCurrentCalendarDate(new Date(year, month + 1, 1));
                    setSelectedCalendarDateStr(null);
                  }}
                  className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 cursor-pointer"
                >
                  <ChevronRight className="h-4.5 w-4.5 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Days Week labels */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* Grid Days Cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                const dayAggr = cell.dateStr ? calendarAggr[cell.dateStr] : null;
                const hasActivities = dayAggr
                  ? dayAggr.tasks.length > 0 || dayAggr.plans.length > 0 || dayAggr.sessions.length > 0
                  : false;
                const isSelected = cell.dateStr === selectedCalendarDateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (cell.dateStr && hasActivities) {
                        setSelectedCalendarDateStr(cell.dateStr);
                      }
                    }}
                    className={cn(
                      "min-h-[64px] p-2 rounded-xl border relative flex flex-col justify-between border-transparent",
                      cell.day ? "bg-zinc-50/50 dark:bg-zinc-950/20" : "bg-transparent opacity-0 pointer-events-none",
                      hasActivities ? "cursor-pointer hover:border-zinc-250 dark:hover:border-zinc-800 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850/80 hover:shadow-xs" : "",
                      isSelected ? "ring-2 ring-indigo-500 border-transparent dark:ring-indigo-400" : ""
                    )}
                  >
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{cell.day}</span>
                    
                    {/* Activity Indicator Dots */}
                    {hasActivities && dayAggr && (
                      <div className="flex gap-1 mt-2.5">
                        {dayAggr.tasks.length > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" title={`${dayAggr.tasks.length} tasks due`} />
                        )}
                        {dayAggr.plans.length > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" title={`${dayAggr.plans.length} plan steps`} />
                        )}
                        {dayAggr.sessions.length > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" title={`${dayAggr.sessions.length} sessions logged`} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Calendar Day Activities details */}
          {selectedCalendarDateStr && selectedDateActivities && (
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Activities on {new Date(selectedCalendarDateStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </h4>
              </div>

              {/* Tasks list */}
              {selectedDateActivities.tasks.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-extrabold uppercase text-zinc-450 tracking-wider">Tasks Due</h5>
                  {selectedDateActivities.tasks.map((task) => (
                    <div key={task.id} className="p-3 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-800 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-850 dark:text-zinc-200">{task.title}</span>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                        {task.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Plan list */}
              {selectedDateActivities.plans.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-extrabold uppercase text-zinc-450 tracking-wider">Daily Study Plan</h5>
                  {selectedDateActivities.plans.map((plan) => (
                    <div key={plan.id} className="p-3 bg-emerald-50/10 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-900/30 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-850 dark:text-zinc-200">{plan.title}</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450">{plan.estimatedDuration} mins</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sessions list */}
              {selectedDateActivities.sessions.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-extrabold uppercase text-zinc-450 tracking-wider">Learning Sessions logged</h5>
                  {selectedDateActivities.sessions.map((sess) => (
                    <div key={sess.id} className="p-3 bg-amber-50/10 dark:bg-amber-950/10 border border-amber-100/30 dark:border-amber-900/30 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-850 dark:text-zinc-200">{sess.topicLearned}</span>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-450">{sess.duration} mins</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ADD/EDIT TASK MODAL FORM DIALOG */}
      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(null);
        }}
        title={selectedTask ? "Edit Task" : "Add Task"}
        description="Fill in task parameters. Can link to learning roadmaps."
        className="max-w-md"
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-355">Task Title *</label>
            <input
              type="text"
              {...register("title")}
              className={cn(
                "w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-955 focus:outline-hidden",
                errors.title && "border-red-500"
              )}
              placeholder="e.g. Build API endpoints in Rust"
            />
            {errors.title && <p className="text-[10px] font-bold text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-355">Description</label>
            <textarea
              {...register("description")}
              className="w-full min-h-[60px] p-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-955 focus:outline-hidden"
              placeholder="Add details, checklists, links..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-355">Category *</label>
              <select
                {...register("category")}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-955 focus:outline-hidden"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-355">Priority *</label>
              <select
                {...register("priority")}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-955 focus:outline-hidden"
              >
                {PRIORITIES.map((pri) => (
                  <option key={pri} value={pri}>
                    {pri}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-355">Due Date (Optional)</label>
              <input
                type="date"
                {...register("dueDate")}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-955 focus:outline-hidden"
              />
            </div>

            {/* Estimated time */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-355">Est. Time (Mins) *</label>
              <input
                type="number"
                {...register("estimatedTime", { valueAsNumber: true })}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-955 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-355">Status *</label>
            <select
              {...register("status")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-955 focus:outline-hidden"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Skill link */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-355">Linked Skill (Optional)</label>
            <select
              {...register("linkedSkillId")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-955 focus:outline-hidden"
            >
              <option value="">-- None --</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-355">Tags (Comma Separated)</label>
            <input
              type="text"
              {...register("tagsString")}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-955 focus:outline-hidden"
              placeholder="e.g. backend, schema, api"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setSelectedTask(null);
              }}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              Save Task
            </button>
          </div>

        </form>
      </Dialog>

    </div>
  );
}
