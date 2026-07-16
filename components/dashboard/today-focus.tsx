"use client";

import { useMemo } from "react";
import { Skill } from "@/types/skill";
import { LearningSession } from "@/types/session";
import { BookOpen, Calendar, AlertCircle, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";

interface TodayFocusProps {
  skills: Skill[];
  sessions: LearningSession[];
}

export function TodayFocus({ skills, sessions }: TodayFocusProps) {
  
  // 1. Skills currently marked as "Learning"
  const learningSkills = useMemo(() => {
    return skills.filter((s) => s.status === "Learning").slice(0, 4);
  }, [skills]);

  // 2. Recently updated skills
  const recentlyUpdated = useMemo(() => {
    return skills
      .filter((s) => s.status !== "Archived")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  }, [skills]);

  // 3. Neglected skills (active skills not studied in last 7 days, or never studied)
  const neglectedSkills = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return skills
      .filter((s) => {
        if (s.status === "Archived") return false;
        
        // Find sessions logged for this skill
        const skillSessions = sessions.filter((sess) => sess.skillId === s.id);
        if (skillSessions.length === 0) return true; // Never studied is considered neglected
        
        // Get newest session date
        const newestTime = Math.max(...skillSessions.map((sess) => new Date(sess.date).getTime()));
        return newestTime < sevenDaysAgo.getTime();
      })
      .slice(0, 4);
  }, [skills, sessions]);

  // Formats date nicely
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) {
      return "Recently";
    }
  };

  const renderSkillRow = (skill: Skill, subText: string, iconColorClass?: string) => {
    const IconComponent = (LucideIcons as any)[skill.icon] || LucideIcons.GraduationCap;
    const themeColor = skill.color || "#6366f1";
    
    return (
      <div key={skill.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/50 hover:bg-zinc-100/50 border border-zinc-150 dark:bg-zinc-950/20 dark:border-zinc-800/80 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-8 w-8 rounded-lg items-center justify-center shrink-0"
            style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
          >
            <IconComponent className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {skill.name}
            </h5>
            <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">
              {subText}
            </p>
          </div>
        </div>

        <Link
          href={`/skills/${skill.id}`}
          className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 p-1 rounded-md"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* 1. Skills In Progress */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-indigo-500" />
          <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Currently Learning</h4>
        </div>
        
        {learningSkills.length > 0 ? (
          <div className="space-y-2">
            {learningSkills.map((s) => renderSkillRow(s, `Goal: ${s.targetLevel}`))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic py-4 text-center">No skills marked "Learning" right now.</p>
        )}
      </div>

      {/* 2. Recently Updated */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-amber-500" />
          <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Recently Updated</h4>
        </div>
        
        {recentlyUpdated.length > 0 ? (
          <div className="space-y-2">
            {recentlyUpdated.map((s) => renderSkillRow(s, `Modified ${formatDate(s.updatedAt)}`))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic py-4 text-center">No skills logged yet.</p>
        )}
      </div>

      {/* 3. Neglected Skills */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5 text-red-500" />
          <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Unstudied (&gt; 7 days)</h4>
        </div>
        
        {neglectedSkills.length > 0 ? (
          <div className="space-y-2">
            {neglectedSkills.map((s) => renderSkillRow(s, "Needs attention"))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic py-4 text-center">All caught up! No neglected skills found.</p>
        )}
      </div>
    </div>
  );
}
