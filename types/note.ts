export interface SkillNote {
  id: string;
  userId: string;
  skillId: string;
  title: string;
  content: string; // Markdown notes
  createdAt: any;
  updatedAt: any;
}
