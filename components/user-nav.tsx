"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, User as UserIcon, Settings } from "lucide-react";
import Link from "next/link";

export function UserNav() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.substring(0, 2).toUpperCase()
    : user.email
    ? user.email.substring(0, 2).toUpperCase()
    : "US";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center h-9 w-9 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 hover:opacity-90 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 cursor-pointer"
        aria-label="User menu"
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.displayName || "User avatar"}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {initials}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-zinc-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950 z-50">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 truncate">
              {user.displayName || "User"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {user.email}
            </p>
          </div>
          <div className="my-1 h-px bg-zinc-150 dark:bg-zinc-800" />
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Settings className="h-4 w-4 text-zinc-500" />
            Settings
          </Link>
          <div className="my-1 h-px bg-zinc-150 dark:bg-zinc-800" />
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
