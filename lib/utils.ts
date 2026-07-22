import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts any time string ("10:00 AM", "22:57", "6:30 PM") into minutes from midnight (0..1439)
 */
export function timeStringToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().toUpperCase();
  if (!trimmed) return null;

  const isPM = trimmed.includes("PM");
  const isAM = trimmed.includes("AM");
  const cleanStr = trimmed.replace(/AM|PM/g, "").trim();
  const parts = cleanStr.split(":");
  if (parts.length < 2) return null;

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight (0..1439) into 12-hour AM/PM string ("10:30 AM")
 */
export function minutesToAMPMString(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12

  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${formattedMinutes} ${ampm}`;
}

/**
 * Formats a 24-hour time string ("22:57") or raw string into 12-hour AM/PM format ("10:57 PM")
 */
export function formatTimeStringToAMPM(timeStr?: string): string {
  if (!timeStr) return "";
  const mins = timeStringToMinutes(timeStr);
  if (mins === null) return timeStr;
  return minutesToAMPMString(mins);
}

/**
 * Calculates end time string ("11:30 AM") given start time ("10:00 AM") and duration in minutes
 */
export function calculateEndTimeFromStart(startTimeStr?: string, durationMinutes?: number): string {
  if (!startTimeStr || !durationMinutes) return "";
  const startMins = timeStringToMinutes(startTimeStr);
  if (startMins === null) return "";
  return minutesToAMPMString(startMins + durationMinutes);
}
