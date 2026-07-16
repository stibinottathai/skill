"use client";

import { useMemo } from "react";
import { Skill } from "@/types/skill";
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

interface SkillProgressChartProps {
  skills: Skill[];
}

export function SkillProgressChart({ skills }: SkillProgressChartProps) {
  const chartData = useMemo(() => {
    return skills
      .filter((s) => s.status !== "Archived")
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 7) // Show top 7 skills
      .map((s) => ({
        name: s.name,
        progress: s.progress,
        color: s.color || "#6366f1",
      }));
  }, [skills]);

  if (chartData.length === 0) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center p-4">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">No active skills found.</p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-1">Create skills with progress metrics to populate chart.</p>
      </div>
    );
  }

  return (
    <ChartWrapper height={250}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            stroke="#888888"
            fontSize={10}
            unit="%"
            fontWeight={600}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            stroke="#888888"
            fontSize={10}
            fontWeight={700}
            width={90}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 shadow-md text-xs font-bold">
                    <p className="text-zinc-500 dark:text-zinc-400">{payload[0].payload.name}</p>
                    <p className="mt-0.5" style={{ color: payload[0].payload.color }}>
                      {payload[0].value}% Complete
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={14}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
