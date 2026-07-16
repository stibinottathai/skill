"use client";

import { useMemo } from "react";
import { LearningSession } from "@/types/session";
import { ChartWrapper } from "./chart-wrapper";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface WeeklyHoursChartProps {
  sessions: LearningSession[];
}

export function WeeklyHoursChart({ sessions }: WeeklyHoursChartProps) {
  const chartData = useMemo(() => {
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    // Clear time and get current week Monday
    const getStartOfWeek = () => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const d = new Date(now.setDate(diff));
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const monday = getStartOfWeek();
    
    // Initialize day values
    const dayTotals: Record<string, number> = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    // Filter sessions to current week and sum durations
    sessions.forEach((session) => {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      
      const diffTime = sessionDate.getTime() - monday.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < 7) {
        const dayName = daysOfWeek[diffDays];
        dayTotals[dayName] = (dayTotals[dayName] || 0) + (session.duration || 0);
      }
    });

    // Convert minutes to hours with 1 decimal digit
    return daysOfWeek.map((day) => ({
      name: day,
      hours: parseFloat((dayTotals[day] / 60).toFixed(1)),
    }));
  }, [sessions]);

  const hasData = chartData.some((d) => d.hours > 0);

  if (!hasData) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center p-4">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">No sessions logged this week yet.</p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-1">Start a study session to generate chart analytics.</p>
      </div>
    );
  }

  return (
    <ChartWrapper height={250}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            stroke="#888888"
            fontSize={11}
            fontWeight={600}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            stroke="#888888"
            fontSize={11}
            fontWeight={600}
            unit="h"
          />
          <Tooltip
            cursor={{ fill: "rgba(99, 102, 241, 0.05)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 shadow-md text-xs font-bold">
                    <p className="text-zinc-500 dark:text-zinc-400">{payload[0].payload.name}</p>
                    <p className="text-indigo-600 dark:text-indigo-400 mt-0.5">{payload[0].value} hours</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="#4f46e5">
            {chartData.map((entry, index) => {
              // Highlight today if matches
              const todayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
              const isToday = entry.name === todayName;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isToday ? "#8b5cf6" : "#4f46e5"}
                  fillOpacity={isToday ? 0.95 : 0.8}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
