import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DailyPlanItem } from "@/types/planner";
import { Skill } from "@/types/skill";
import { RoadmapItem } from "@/types/roadmap";

const PLANNER_COLLECTION = "daily_plans";

function formatFirestoreDoc(docSnap: any): DailyPlanItem {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId || "",
    date: data.date || "",
    skillId: data.skillId || "",
    roadmapItemId: data.roadmapItemId || "",
    title: data.title || "",
    estimatedDuration: data.estimatedDuration || 0,
    priority: data.priority || "Medium",
    notes: data.notes || "",
    status: data.status || "Pending",
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Subscribes to daily planner items for a specific date (YYYY-MM-DD)
 */
export function subscribeDailyPlan(
  userId: string,
  date: string,
  callback: (items: DailyPlanItem[]) => void
) {
  const colRef = collection(db, PLANNER_COLLECTION);
  const q = query(
    colRef,
    where("userId", "==", userId),
    where("date", "==", date)
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      const items = querySnapshot.docs.map(formatFirestoreDoc);
      // Sort by priority or order? Let's sort by createdAt or priority
      const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      const sorted = items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      callback(sorted);
    },
    (error) => {
      console.error(`Error subscribing to daily plan for ${date}: `, error);
    }
  );
}

/**
 * Create a daily plan item
 */
export async function createDailyPlanItem(
  userId: string,
  itemData: Omit<DailyPlanItem, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<void> {
  const colRef = collection(db, PLANNER_COLLECTION);
  await addDoc(colRef, {
    ...itemData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates a daily plan item
 */
export async function updateDailyPlanItem(
  itemId: string,
  updates: Partial<Omit<DailyPlanItem, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, PLANNER_COLLECTION, itemId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a daily plan item
 */
export async function deleteDailyPlanItem(itemId: string): Promise<void> {
  const docRef = doc(db, PLANNER_COLLECTION, itemId);
  await deleteDoc(docRef);
}

/**
 * Deterministic study capacity planner.
 * Suggests incomplete roadmap items from active skills that fit within availableMinutes.
 */
export async function generateDailyPlanSuggestions(
  userId: string,
  date: string,
  availableMinutes: number
): Promise<Omit<DailyPlanItem, "id" | "userId" | "createdAt" | "updatedAt">[]> {
  
  // 1. Fetch active skills
  const skillsCol = collection(db, "skills");
  const skillsQ = query(skillsCol, where("userId", "==", userId));
  const skillsSnap = await getDocs(skillsQ);
  
  const activeSkills = skillsSnap.docs
    .map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((s: any) => s.status !== "Completed" && s.status !== "Archived") as Skill[];
    
  if (activeSkills.length === 0) return [];

  // Create lookup for skill priorities
  const priorityMap: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
  
  // 2. Fetch all roadmap items for this user in one query (efficient!)
  const roadmapCol = collection(db, "roadmap_items");
  const roadmapQ = query(roadmapCol, where("userId", "==", userId));
  const roadmapSnap = await getDocs(roadmapQ);
  
  const allRoadmapItems = roadmapSnap.docs.map((docSnap: any) => ({
    id: docSnap.id,
    ...docSnap.data()
  })) as RoadmapItem[];

  // 3. Filter incomplete roadmap items belonging to active skills
  const activeSkillIds = new Set(activeSkills.map((s) => s.id));
  const incompleteItems = allRoadmapItems.filter(
    (item) => activeSkillIds.has(item.skillId) && (item.status === "Not Started" || item.status === "In Progress")
  );

  // 4. Sort: Skill Priority desc, then item order asc
  const skillPriorityMap = new Map<string, number>();
  activeSkills.forEach((s) => skillPriorityMap.set(s.id, priorityMap[s.priority] || 2));

  const sortedItems = incompleteItems.sort((a, b) => {
    const priorityA = skillPriorityMap.get(a.skillId) || 2;
    const priorityB = skillPriorityMap.get(b.skillId) || 2;
    
    if (priorityB !== priorityA) {
      return priorityB - priorityA; // High priority skills first
    }
    return a.order - b.order; // chronological order of items
  });

  // 5. Select items fitting capacity
  const suggestions: Omit<DailyPlanItem, "id" | "userId" | "createdAt" | "updatedAt">[] = [];
  let accumulatedTime = 0;

  for (const item of sortedItems) {
    const studyTime = item.estimatedStudyTime || 30;
    
    // Always suggest at least one item, even if it exceeds availableMinutes
    if (suggestions.length > 0 && accumulatedTime + studyTime > availableMinutes) {
      // If adding this exceeds capacity, skip
      continue;
    }

    const skill = activeSkills.find((s) => s.id === item.skillId);

    suggestions.push({
      date,
      skillId: item.skillId,
      roadmapItemId: item.id,
      title: `${skill?.name || "Skill"}: ${item.title}`,
      estimatedDuration: studyTime,
      priority: item.difficulty === "Advanced" ? "High" : item.difficulty === "Intermediate" ? "Medium" : "Low",
      notes: item.description || "",
      status: "Pending",
      startTime: "",
      endTime: "",
    });

    accumulatedTime += studyTime;
  }

  return suggestions;
}
