import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LearningTask } from "@/types/task";

const TASKS_COLLECTION = "tasks";

function formatFirestoreDoc(docSnap: any): LearningTask {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId || "",
    title: data.title || "",
    description: data.description || "",
    category: data.category || "Learning",
    priority: data.priority || "Medium",
    dueDate: data.dueDate || "",
    estimatedTime: data.estimatedTime || 0,
    status: data.status || "Todo",
    linkedSkillId: data.linkedSkillId || "",
    linkedRoadmapItemId: data.linkedRoadmapItemId || "",
    tags: data.tags || [],
    order: data.order ?? 0,
    archived: !!data.archived,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Subscribes to tasks list in real-time, ordered by 'order' ascending.
 */
export function subscribeTasks(userId: string, callback: (tasks: LearningTask[]) => void) {
  const colRef = collection(db, TASKS_COLLECTION);
  const q = query(colRef, where("userId", "==", userId));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const items = querySnapshot.docs.map(formatFirestoreDoc);
      // Sort by order ascending
      const sorted = items.sort((a, b) => a.order - b.order);
      callback(sorted);
    },
    (error) => {
      console.error("Error subscribing to tasks collection: ", error);
    }
  );
}

/**
 * Creates a single task document in Firestore
 */
export async function createTask(
  userId: string,
  taskData: Omit<LearningTask, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<void> {
  const colRef = collection(db, TASKS_COLLECTION);
  await addDoc(colRef, {
    ...taskData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates an existing task document
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<LearningTask, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a task document
 */
export async function deleteTask(taskId: string): Promise<void> {
  const docRef = doc(db, TASKS_COLLECTION, taskId);
  await deleteDoc(docRef);
}

/**
 * Bulk completes selected tasks in a single Firestore Batch operation
 */
export async function bulkCompleteTasks(taskIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  taskIds.forEach((id) => {
    const docRef = doc(db, TASKS_COLLECTION, id);
    batch.update(docRef, {
      status: "Completed",
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/**
 * Bulk deletes selected tasks in a single Firestore Batch operation
 */
export async function bulkDeleteTasks(taskIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  taskIds.forEach((id) => {
    const docRef = doc(db, TASKS_COLLECTION, id);
    batch.delete(docRef);
  });
  await batch.commit();
}

/**
 * Batch updates the 'order' field of multiple tasks
 */
export async function reorderTasks(tasks: LearningTask[]): Promise<void> {
  const batch = writeBatch(db);
  tasks.forEach((task, index) => {
    const docRef = doc(db, TASKS_COLLECTION, task.id);
    batch.update(docRef, {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
