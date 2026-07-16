import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SkillNote } from "@/types/note";

const NOTES_COLLECTION = "skill_notes";

function formatFirestoreDoc(docSnap: any): SkillNote {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    skillId: data.skillId,
    title: data.title,
    content: data.content,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
  };
}

export async function createNote(
  userId: string,
  noteData: Omit<SkillNote, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const colRef = collection(db, NOTES_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...noteData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateNote(
  noteId: string,
  updates: Partial<Omit<SkillNote, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, NOTES_COLLECTION, noteId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  const docRef = doc(db, NOTES_COLLECTION, noteId);
  await deleteDoc(docRef);
}

export function subscribeNotes(userId: string, callback: (notes: SkillNote[]) => void) {
  const colRef = collection(db, NOTES_COLLECTION);
  const q = query(colRef, where("userId", "==", userId));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const notes = querySnapshot.docs.map(formatFirestoreDoc);
      callback(notes);
    },
    (error) => {
      console.error("Error subscribing to notes: ", error);
    }
  );
}

export function subscribeNotesBySkill(
  userId: string,
  skillId: string,
  callback: (notes: SkillNote[]) => void
) {
  const colRef = collection(db, NOTES_COLLECTION);
  const q = query(colRef, where("userId", "==", userId), where("skillId", "==", skillId));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const notes = querySnapshot.docs.map(formatFirestoreDoc);
      callback(notes);
    },
    (error) => {
      console.error(`Error subscribing to notes for skill ${skillId}: `, error);
    }
  );
}
