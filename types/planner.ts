export type DailyPlanStatus = "Pending" | "In Progress" | "Completed" | "Skipped";
export type DailyPlanPriority = "Low" | "Medium" | "High" | "Critical";

export interface DailyPlanItem {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  skillId: string;
  roadmapItemId?: string;
  title: string;
  estimatedDuration: number; // in minutes
  priority: DailyPlanPriority;
  notes: string;
  status: DailyPlanStatus;
  startTime: string;
  endTime: string;
  isRecurringDaily?: boolean;
  createdAt: string;
  updatedAt: string;
}
