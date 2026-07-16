export type RoadmapDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type RoadmapStatus = "Not Started" | "In Progress" | "Completed" | "Skipped";

export interface RoadmapItem {
  id: string;
  userId: string;
  skillId: string;
  title: string;
  description?: string;
  estimatedStudyTime: number; // in minutes
  difficulty: RoadmapDifficulty;
  status: RoadmapStatus;
  order: number;
  parentTopic?: string;
  resourceLinks?: string;
  notes?: string;
  completionDate?: string;
  createdAt: string;
  updatedAt: string;
}
