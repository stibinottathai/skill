export type TaskCategory =
  | "Learning"
  | "Work"
  | "Personal"
  | "Reading"
  | "Project"
  | "Research"
  | "Other";

export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export type TaskStatus = "Todo" | "In Progress" | "Completed" | "Cancelled";

export interface LearningTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  estimatedTime: number; // in minutes
  status: TaskStatus;
  linkedSkillId: string;
  linkedRoadmapItemId: string;
  tags: string[];
  order: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
