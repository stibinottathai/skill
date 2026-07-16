"use client";

import { useMemo } from "react";
import { LearningSession } from "@/types/session";
import { ChartWrapper } from "./chart-wrapper";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonthlyHoursChartProps {
  sessions: LearningSession[];
}

export function MonthlyHoursChart({ sessions }: MonthlyHoursChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    
    // Get number of days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Initialize totals for each day (1 to totalDays)
    const dayTotals: Record<number, number> = {};
    for (let d = 1; d <= totalDays; d++) {
      dayTotals[d] = 0;
    }

    // Sum session durations matching current month & year
    sessions.forEach((session) => {
      const sDate = new Date(session.date);
      if (sDate.getFullYear() === year && sDate.getMonth() === month) {
        const day = sDate.getDate();
        dayTotals[day] = (dayTotals[day] || 0) + (session.duration || 0);
      }
    });

    // Format for chart: show e.g. "Day 1", "Day 5", "Day 10", etc.
    const result = [];
    for (let d = 1; d <= totalDays; d++) {
      result.push({
        day: d,
        name: `${d}`,
        hours: parseFloat((dayTotals[d] / 60).toFixed(1)),
      });
    }
    return result;
  }, [sessions]);

  const hasData = chartData.some((d) => d.hours > 0);

  if (!hasData) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center p-4">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">No sessions logged this month yet.</p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-1">Start a study session to generate monthly analytics.</p>
      </div>
    );
  }

  return (
    <ChartWrapper height={250}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            stroke="#888888"
            fontSize={10}
            fontWeight={600}
            interval={Math.floor(chartData.length / 7)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            stroke="#888888"
            fontSize={10}
            unit="h"
            fontWeight={600}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 shadow-md text-xs font-bold">
                    <p className="text-zinc-500 dark:text-zinc-400">Day {payload[0].payload.day}</p>
                    <p className="text-indigo-600 dark:text-indigo-400 mt-0.5">{payload[0].value} hours</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorHours)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
