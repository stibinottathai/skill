"use client";

import { useAuth } from "@/hooks/use-auth";
import { Settings, User, Bell, Shield, Target } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  const settingsSections = [
    {
      title: "Profile Settings",
      description: "Manage your personal detail preferences.",
      icon: User,
      fields: [
        { label: "Display Name", value: user?.displayName || "Learner" },
        { label: "Email Address", value: user?.email || "learner@example.com" },
      ],
    },
    {
      title: "Learning Target Settings",
      description: "Configure your weekly study duration objectives.",
      icon: Target,
      fields: [
        { label: "Weekly Goal", value: "10 hours (Recommended)" },
        { label: "Daily Notification Reminder", value: "Disabled" },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Configure profile details and customize learning targets.
        </p>
      </div>

      <div className="space-y-6">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="p-5 sm:p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {section.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {section.description}
                  </p>
                </div>
              </div>

              <div className="my-1 h-px bg-zinc-150 dark:bg-zinc-800" />

              <div className="space-y-3.5 pt-2">
                {section.fields.map((field) => (
                  <div key={field.label} className="grid grid-cols-3 items-center gap-4">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {field.label}
                    </span>
                    <span className="col-span-2 text-xs text-zinc-900 dark:text-zinc-300 truncate">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
