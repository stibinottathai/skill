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
} from "recharts";

interface MonthlyTrendChartProps {
  sessions: LearningSession[];
}

export function MonthlyTrendChart({ sessions }: MonthlyTrendChartProps) {
  const chartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const result = [];

    // Calculate last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      
      const monthSessions = sessions.filter((s) => {
        const sDate = new Date(s.date);
        return sDate.getFullYear() === yr && sDate.getMonth() === mIdx;
      });
      
      const totalMinutes = monthSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      
      result.push({
        name: `${monthNames[mIdx]}`,
        hours: parseFloat((totalMinutes / 60).toFixed(1)),
      });
    }

    return result;
  }, [sessions]);

  const hasData = chartData.some((d) => d.hours > 0);

  if (!hasData) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center p-4">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">No study logs tracked yet.</p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-1">Logs from the last 6 months will populate this timeline.</p>
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
          <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="#6366f1" fillOpacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
