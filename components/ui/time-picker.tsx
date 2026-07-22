"use client";

import { useEffect, useState } from "react";
import { timeStringToMinutes } from "@/lib/utils";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange: (formattedValue: string) => void;
  className?: string;
  /** If provided, options before this time (in "h:mm AM/PM" or 24h format) are disabled */
  minTime?: string;
}

export function TimePicker({ value = "", onChange, className, minTime }: TimePickerProps) {
  const parseTimeParts = (val?: string) => {
    const mins = timeStringToMinutes(val);
    if (mins === null) {
      return { hour: "9", minute: "00", period: "AM" as const };
    }
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? ("PM" as const) : ("AM" as const);
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return { hour: String(h12), minute: mStr, period };
  };

  const [parts, setParts] = useState(() => parseTimeParts(value));

  useEffect(() => {
    if (value) {
      setParts(parseTimeParts(value));
    }
  }, [value]);

  /** Convert h12 + minute + period → total minutes from midnight */
  const toTotalMins = (h: string, m: string, p: "AM" | "PM") => {
    let h24 = parseInt(h, 10) % 12;
    if (p === "PM") h24 += 12;
    return h24 * 60 + parseInt(m, 10);
  };

  const minMins = minTime != null ? timeStringToMinutes(minTime) : null;

  const updateParts = (newHour: string, newMinute: string, newPeriod: "AM" | "PM") => {
    const totalMins = toTotalMins(newHour, newMinute, newPeriod);
    // If minTime enforced and selection is in the past, ignore
    if (minMins !== null && totalMins < minMins) return;
    const newParts = { hour: newHour, minute: newMinute, period: newPeriod };
    setParts(newParts);
    const formatted = `${newHour}:${newMinute} ${newPeriod}`;
    onChange(formatted);
  };

  const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutesList = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  /** Is a specific hour entirely in the past for the current period? */
  const isHourDisabled = (h: string, p: "AM" | "PM") => {
    if (minMins === null) return false;
    // Check if even the last minute of this hour (h:55) is before minMins
    const lastMinOfHour = toTotalMins(h, "55", p);
    return lastMinOfHour < minMins;
  };

  /** Is a specific minute in the past given current hour+period selection? */
  const isMinuteDisabled = (m: string) => {
    if (minMins === null) return false;
    const totalMins = toTotalMins(parts.hour, m, parts.period);
    return totalMins < minMins;
  };

  /** Is an entire AM or PM period completely in the past? */
  const isPeriodDisabled = (p: "AM" | "PM") => {
    if (minMins === null) return false;
    // PM is never fully disabled (12:55 PM = 780 mins is always valid unless minTime > 12:55 PM)
    // AM is disabled only if minTime >= 12:00 PM (720)
    if (p === "AM") return minMins >= 720;
    return false;
  };

  const currentTotalMins = toTotalMins(parts.hour, parts.minute, parts.period);
  const isPastSelection = minMins !== null && currentTotalMins < minMins;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-xl border w-full justify-between",
        isPastSelection
          ? "border-red-400 dark:border-red-700"
          : "border-zinc-200 dark:border-zinc-800",
        className
      )}
    >
      <div className="flex items-center gap-1 min-w-0">
        <Clock
          className={cn(
            "h-3.5 w-3.5 ml-0.5 shrink-0",
            isPastSelection ? "text-red-400" : "text-zinc-400"
          )}
        />

        {/* Hour select */}
        <select
          value={parts.hour}
          onChange={(e) => updateParts(e.target.value, parts.minute, parts.period)}
          className="h-8 px-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-50 focus:outline-hidden cursor-pointer"
        >
          {hoursList.map((h) => (
            <option key={h} value={h} disabled={isHourDisabled(h, parts.period)}>
              {h.padStart(2, "0")}
            </option>
          ))}
        </select>

        <span className="text-xs font-black text-zinc-400">:</span>

        {/* Minute select */}
        <select
          value={parts.minute}
          onChange={(e) => updateParts(parts.hour, e.target.value, parts.period)}
          className="h-8 px-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-50 focus:outline-hidden cursor-pointer"
        >
          {minutesList.map((m) => (
            <option key={m} value={m} disabled={isMinuteDisabled(m)}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* AM / PM Toggle Buttons */}
      <div className="flex bg-zinc-200/70 dark:bg-zinc-850 p-0.5 rounded-lg shrink-0">
        <button
          type="button"
          disabled={isPeriodDisabled("AM")}
          onClick={() => updateParts(parts.hour, parts.minute, "AM")}
          className={cn(
            "px-2 py-0.5 rounded-md text-[10px] font-black transition-all",
            isPeriodDisabled("AM")
              ? "opacity-30 cursor-not-allowed text-zinc-400"
              : "cursor-pointer",
            parts.period === "AM"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          )}
        >
          AM
        </button>
        <button
          type="button"
          disabled={isPeriodDisabled("PM")}
          onClick={() => updateParts(parts.hour, parts.minute, "PM")}
          className={cn(
            "px-2 py-0.5 rounded-md text-[10px] font-black transition-all",
            isPeriodDisabled("PM")
              ? "opacity-30 cursor-not-allowed text-zinc-400"
              : "cursor-pointer",
            parts.period === "PM"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          )}
        >
          PM
        </button>
      </div>
      {isPastSelection && (
        <span className="absolute mt-10 text-[9px] font-bold text-red-500 hidden" />
      )}
    </div>
  );
}
