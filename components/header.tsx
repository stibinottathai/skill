"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/user-nav";

interface HeaderProps {
  setMobileOpen: (open: boolean) => void;
}

export function Header({ setMobileOpen }: HeaderProps) {
  const pathname = usePathname();

  // Determine page title based on path
  const getPageTitle = (path: string) => {
    const segment = path.split("/").filter(Boolean)[0] || "dashboard";
    switch (segment) {
      case "dashboard":
        return "Home";
      case "upcoming-studies":
        return "Upcoming Studies";
      case "skills":
        return "My Skills";
      case "learning-sessions":
        return "Learning Sessions";
      case "notes":
        return "My Notes";
      case "settings":
        return "Settings";
      default:
        return "Skill Tracker";
    }
  };

  return (
    <header className="sticky top-0 z-30 shrink-0 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 md:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 md:hidden"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Page Title */}
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        <ModeToggle />
        <UserNav />
      </div>
    </header>
  );
}
