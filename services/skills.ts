import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skill } from "@/types/skill";

const SKILLS_COLLECTION = "skills";

// Helper to convert Firestore dates to ISO strings for client state consistency
function formatFirestoreDoc(docSnap: any): Skill {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    name: data.name,
    category: data.category,
    description: data.description || "",
    currentLevel: data.currentLevel,
    targetLevel: data.targetLevel,
    status: data.status,
    priority: data.priority,
    color: data.color || "#6366f1",
    icon: data.icon || "GraduationCap",
    estimatedHours: data.estimatedHours || 0,
    progress: data.progress || 0,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Creates a new skill document in Firestore
 */
export async function createSkill(
  userId: string,
  skillData: Omit<Skill, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const colRef = collection(db, SKILLS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...skillData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing skill document
 */
export async function updateSkill(
  skillId: string,
  updates: Partial<Omit<Skill, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, SKILLS_COLLECTION, skillId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a skill document
 */
export async function deleteSkill(skillId: string): Promise<void> {
  const docRef = doc(db, SKILLS_COLLECTION, skillId);
  await deleteDoc(docRef);
}

/**
 * Archives/Restores a skill
 */
export async function archiveSkill(skillId: string, archive: boolean): Promise<void> {
  await updateSkill(skillId, {
    status: archive ? "Archived" : "Learning",
  });
}

/**
 * Fetches all skills for a specific user as a one-time promise
 */
export async function getSkills(userId: string): Promise<Skill[]> {
  const colRef = collection(db, SKILLS_COLLECTION);
  const q = query(colRef, where("userId", "==", userId), orderBy("updatedAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(formatFirestoreDoc);
}

/**
 * Subscribes to skills collection in real-time
 */
export function subscribeSkills(userId: string, callback: (skills: Skill[]) => void) {
  const colRef = collection(db, SKILLS_COLLECTION);
  const q = query(colRef, where("userId", "==", userId));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const skills = querySnapshot.docs.map(formatFirestoreDoc);
      callback(skills);
    },
    (error) => {
      console.error("Error subscribing to skills: ", error);
    }
  );
}

/**
 * Fetches a single skill document by ID
 */
export async function getSkillById(skillId: string): Promise<Skill | null> {
  const docRef = doc(db, SKILLS_COLLECTION, skillId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  return formatFirestoreDoc(docSnap);
}

/**
 * Subscribes to a single skill document in real-time
 */
export function subscribeSkill(skillId: string, callback: (skill: Skill | null) => void) {
  const docRef = doc(db, SKILLS_COLLECTION, skillId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(formatFirestoreDoc(docSnap));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Error subscribing to skill ${skillId}: `, error);
      callback(null);
    }
  );
}
