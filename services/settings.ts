import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserSettings } from "@/types/settings";

const SETTINGS_COLLECTION = "users_settings";

const DEFAULT_SETTINGS: UserSettings = {
  weeklyGoalHours: 10,
  monthlyGoalHours: 40,
  dailyReminder: false,
};

/**
 * Fetch settings for a specific user. Reverts to default goals if document doesn't exist.
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const docRef = doc(db, SETTINGS_COLLECTION, userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return DEFAULT_SETTINGS;
  }
  return docSnap.data() as UserSettings;
}

/**
 * Save settings for a user
 */
export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, userId);
  await setDoc(docRef, settings, { merge: true });
}

/**
 * Real-time subscription to user settings. Falls back to defaults if not found.
 */
export function subscribeUserSettings(userId: string, callback: (settings: UserSettings) => void) {
  const docRef = doc(db, SETTINGS_COLLECTION, userId);
  
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserSettings);
      } else {
        callback(DEFAULT_SETTINGS);
      }
    },
    (error) => {
      console.error(`Error subscribing to user settings for ${userId}: `, error);
      callback(DEFAULT_SETTINGS);
    }
  );
}
