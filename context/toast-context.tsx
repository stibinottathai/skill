"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Portal/Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none p-4">
        {toasts.map((toast) => {
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 w-full rounded-xl border p-4 shadow-lg animate-slide-up-fade text-sm transition-all duration-300 bg-white dark:bg-zinc-900",
                toast.type === "success" && "border-emerald-200 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/20",
                toast.type === "error" && "border-red-200 dark:border-red-900/30 text-red-900 dark:text-red-400 bg-red-50/90 dark:bg-red-950/20",
                toast.type === "info" && "border-indigo-200 dark:border-indigo-900/30 text-indigo-900 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/20"
              )}
            >
              {/* Type Icons */}
              {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              {toast.type === "error" && <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />}
              {toast.type === "info" && <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />}

              {/* Message */}
              <div className="flex-1 font-medium">{toast.message}</div>

              {/* Close Button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0 cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Slide up animation CSS */}
      <style jsx global>{`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-up-fade {
          animation: slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
