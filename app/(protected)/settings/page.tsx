"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/context/toast-context";
import { getUserSettings, saveUserSettings } from "@/services/settings";
import { UserSettings } from "@/types/settings";
import { User, Target, Save, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const settingsSchema = z.object({
  weeklyGoalHours: z.number().min(1, "Weekly goal must be at least 1 hour").max(168, "Max 168 hours in a week"),
  monthlyGoalHours: z.number().min(1, "Monthly goal must be at least 1 hour").max(744, "Max 744 hours in a month"),
  dailyReminder: z.boolean().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      weeklyGoalHours: 10,
      monthlyGoalHours: 40,
      dailyReminder: false,
    },
  });

  // Load settings on mount
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    getUserSettings(user.uid)
      .then((settings) => {
        setValue("weeklyGoalHours", settings.weeklyGoalHours);
        setValue("monthlyGoalHours", settings.monthlyGoalHours);
        setValue("dailyReminder", settings.dailyReminder || false);
      })
      .catch((e) => {
        console.error(e);
        showToast("Failed to load settings.", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, setValue]);

  const onSubmit = async (values: SettingsFormValues) => {
    if (!user) return;
    setSaving(true);
    try {
      await saveUserSettings(user.uid, {
        weeklyGoalHours: values.weeklyGoalHours,
        monthlyGoalHours: values.monthlyGoalHours,
        dailyReminder: values.dailyReminder || false,
      });
      showToast("Settings updated successfully!", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to update settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 w-full animate-pulse max-w-3xl mx-auto">
        <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
        <div className="h-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl" />
        <div className="h-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Configure profile details and customize learning targets.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Profile Settings Display */}
        <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Profile Details
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Personal identifier associated with this account.
              </p>
            </div>
          </div>

          <div className="my-1 h-px bg-zinc-150 dark:bg-zinc-800" />

          <div className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold text-zinc-500 dark:text-zinc-450">Display Name</span>
              <span className="col-span-2 text-zinc-800 dark:text-zinc-300 font-medium truncate">
                {user?.displayName || "Learner"}
              </span>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold text-zinc-500 dark:text-zinc-450">Email Address</span>
              <span className="col-span-2 text-zinc-800 dark:text-zinc-300 font-medium truncate">
                {user?.email || "learner@example.com"}
              </span>
            </div>
          </div>
        </div>

        {/* Learning Targets Config Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Learning Targets
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Configure study targets to power your dashboard progress bars.
                </p>
              </div>
            </div>

            <div className="my-1 h-px bg-zinc-150 dark:bg-zinc-800" />

            <div className="space-y-4 pt-2">
              {/* Weekly target hours input */}
              <div className="grid grid-cols-3 items-start gap-4">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-450 pt-2.5">
                  Weekly Goal (Hours)
                </label>
                <div className="col-span-2 space-y-1.5">
                  <input
                    type="number"
                    {...register("weeklyGoalHours", { valueAsNumber: true })}
                    className="w-full max-w-[150px] h-9 px-3 rounded-lg border border-zinc-200 text-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 font-bold"
                  />
                  {errors.weeklyGoalHours && (
                    <p className="text-[10px] text-red-500 font-bold">{errors.weeklyGoalHours.message}</p>
                  )}
                </div>
              </div>

              {/* Monthly target hours input */}
              <div className="grid grid-cols-3 items-start gap-4">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-450 pt-2.5">
                  Monthly Goal (Hours)
                </label>
                <div className="col-span-2 space-y-1.5">
                  <input
                    type="number"
                    {...register("monthlyGoalHours", { valueAsNumber: true })}
                    className="w-full max-w-[150px] h-9 px-3 rounded-lg border border-zinc-200 text-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 font-bold"
                  />
                  {errors.monthlyGoalHours && (
                    <p className="text-[10px] text-red-500 font-bold">{errors.monthlyGoalHours.message}</p>
                  )}
                </div>
              </div>

              {/* Daily Reminder toggle */}
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-450">
                  Daily Reminders
                </label>
                <div className="col-span-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("dailyReminder")}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-650 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
