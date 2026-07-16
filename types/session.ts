export type SessionDifficulty = "Easy" | "Medium" | "Hard";
export type SessionStatus = "Completed" | "In Progress";

export interface LearningSession {
  id: string;
  userId: string;
  skillId: string;
  date: string; // Format YYYY-MM-DD
  duration: number; // Duration in minutes
  topicLearned: string;
  summary: string;
  notes: string; // Markdown notes
  difficulty: SessionDifficulty;
  productivityRating: number; // 1 to 5 rating
  status: SessionStatus;
  resourcesUsed?: string; // Optional links or description
  createdAt: any;
  updatedAt: any;
}
