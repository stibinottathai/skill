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
import { LearningSession } from "@/types/session";

const SESSIONS_COLLECTION = "learning_sessions";

function formatFirestoreDoc(docSnap: any): LearningSession {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    skillId: data.skillId,
    date: data.date,
    duration: data.duration,
    topicLearned: data.topicLearned,
    summary: data.summary || "",
    notes: data.notes || "",
    difficulty: data.difficulty,
    productivityRating: data.productivityRating,
    status: data.status,
    resourcesUsed: data.resourcesUsed || "",
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
  };
}

export async function createLearningSession(
  userId: string,
  sessionData: Omit<LearningSession, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const colRef = collection(db, SESSIONS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...sessionData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateLearningSession(
  sessionId: string,
  updates: Partial<Omit<LearningSession, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLearningSession(sessionId: string): Promise<void> {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await deleteDoc(docRef);
}

export async function getLearningSessions(userId: string): Promise<LearningSession[]> {
  const colRef = collection(db, SESSIONS_COLLECTION);
  const q = query(colRef, where("userId", "==", userId), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(formatFirestoreDoc);
}

export function subscribeLearningSessions(
  userId: string,
  callback: (sessions: LearningSession[]) => void
) {
  const colRef = collection(db, SESSIONS_COLLECTION);
  const q = query(colRef, where("userId", "==", userId));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const sessions = querySnapshot.docs.map(formatFirestoreDoc);
      callback(sessions);
    },
    (error) => {
      console.error("Error subscribing to learning sessions: ", error);
    }
  );
}

export async function getLearningSessionById(sessionId: string): Promise<LearningSession | null> {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  return formatFirestoreDoc(docSnap);
}
