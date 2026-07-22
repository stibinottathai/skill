"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  GraduationCap,
  Clock,
  Notebook,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sun,
  ListTodo,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Today", href: "/today", icon: Sun },
    { name: "Upcoming Studies", href: "/upcoming-studies", icon: CalendarDays },
    { name: "Skills", href: "/skills", icon: GraduationCap },
    { name: "Learning Sessions", href: "/learning-sessions", icon: Clock },
    { name: "Notes", href: "/notes", icon: Notebook },
    { name: "Tasks", href: "/tasks", icon: ListTodo },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 transition-all duration-300">
      <div>
        {/* Brand Header */}
        <div className={cn("flex h-16 items-center justify-between px-3.5 border-b border-zinc-200 dark:border-zinc-800", collapsed ? "px-2" : "")}>
          <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight" title="Skill Tracker">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-indigo-500/20 shadow-md shrink-0">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            {!collapsed && (
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent text-lg font-extrabold dark:from-indigo-400 dark:to-violet-400">
                Skill Tracker
              </span>
            )}
          </Link>
          
          {/* Desktop Toggle Button - Always Visible */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 transition-colors cursor-pointer shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 p-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-50",
                  collapsed ? "justify-center px-2" : ""
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 dark:text-zinc-400")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Toggle for collapsed state */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-center">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 transition-all cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        ) : (
          <div className="flex flex-col gap-1 text-xs text-zinc-400 dark:text-zinc-500 px-1 w-full">
            <p className="font-semibold">Skill Tracker v1.0</p>
            <p>© 2026 Personal App</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Container */}
      <aside className={cn(
        "hidden md:block h-screen sticky top-0 transition-all duration-300 z-20 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          />
          {/* Menu Drawer */}
          <div className="relative flex w-64 max-w-xs flex-col animate-slide-in">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
