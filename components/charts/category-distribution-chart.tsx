"use client";

import { useMemo } from "react";
import { Skill } from "@/types/skill";
import { ChartWrapper } from "./chart-wrapper";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CategoryDistributionChartProps {
  skills: Skill[];
}

export function CategoryDistributionChart({ skills }: CategoryDistributionChartProps) {
  const chartData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    
    // Count active skills categories
    skills
      .filter((s) => s.status !== "Archived")
      .forEach((s) => {
        const cat = s.category || "Unassigned";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

    return Object.entries(categoryCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [skills]);

  // Color palette for Pie slices
  const COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#64748b", "#3b82f6"];

  if (chartData.length === 0) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center p-4">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">No categories recorded yet.</p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-1">Create skills to generate category distribution charts.</p>
      </div>
    );
  }

  return (
    <ChartWrapper height={250}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 shadow-md text-xs font-bold">
                    <p className="text-zinc-500 dark:text-zinc-400">{payload[0].name}</p>
                    <p className="text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {payload[0].value} {payload[0].value === 1 ? "skill" : "skills"}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            iconSize={8}
            iconType="circle"
            wrapperStyle={{ fontSize: "10px", fontWeight: 600 }}
          />
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
