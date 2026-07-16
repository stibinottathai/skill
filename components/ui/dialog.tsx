"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Disable body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog Frame */}
      <div
        ref={dialogRef}
        className={cn(
          "relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 z-50 animate-scale-in max-h-[85vh] overflow-y-auto flex flex-col justify-between",
          className
        )}
      >
        {/* Close trigger */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer p-1"
          aria-label="Close dialog"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 text-left mb-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1">{children}</div>
      </div>

      {/* Local animation keyframes */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
