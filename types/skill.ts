export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type SkillTargetLevel = "Intermediate" | "Advanced" | "Expert";
export type SkillStatus = "Planned" | "Learning" | "Practicing" | "Completed" | "Archived";
export type SkillPriority = "Low" | "Medium" | "High";

export interface Skill {
  id: string;
  userId: string;
  name: string;
  category: string;
  description: string;
  currentLevel: SkillLevel;
  targetLevel: SkillTargetLevel;
  status: SkillStatus;
  priority: SkillPriority;
  color: string;
  icon: string;
  estimatedHours: number;
  progress: number;
  createdAt: any; // Can be string, Firestore Timestamp, or Date
  updatedAt: any; // Can be string, Firestore Timestamp, or Date
}
