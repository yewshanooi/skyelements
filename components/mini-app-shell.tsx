"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MiniAppHeader } from "@/components/mini-app-header";
import type { UserProfile } from "@/app/notes/profile";
import { cn } from "@/lib/utils";

export interface MiniAppShellProps {
  children: React.ReactNode;
  user?: UserProfile | null;
  signout?: () => Promise<void>;
  onProfileUpdated?: (profile: UserProfile) => void;
  onDeleteAllChats?: () => Promise<void>;
  onDeleteAllNotes?: () => Promise<void>;
  scrollable?: boolean;
  className?: string;
  containerClassName?: string;
}

export function MiniAppShell({
  children,
  user,
  signout,
  onProfileUpdated,
  onDeleteAllChats,
  onDeleteAllNotes,
  scrollable,
  className,
  containerClassName,
}: MiniAppShellProps) {
  const pathname = usePathname();
  const isNotes = pathname === "/notes" || pathname?.startsWith("/notes/");
  const isScrollable = scrollable !== undefined ? scrollable : !isNotes;

  return (
    <div
      className={cn(
        "flex flex-col h-svh w-full overflow-hidden bg-neutral-100/70 dark:bg-[#0c0c0c] text-foreground transition-colors",
        className
      )}
    >
      {/* Top Part: Mini Apps Sticky Bar (without line separator) */}
      <MiniAppHeader
        user={user}
        signout={signout}
        onProfileUpdated={onProfileUpdated}
        onDeleteAllChats={onDeleteAllChats}
        onDeleteAllNotes={onDeleteAllNotes}
      />

      {/* Bottom Part: Individual App (Framed Container) */}
      <div className="flex-1 min-h-0 px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4 flex flex-col overflow-hidden">
        <div
          className={cn(
            "w-full h-full rounded-xl sm:rounded-2xl border border-neutral-200/90 dark:border-neutral-800/80 bg-background shadow-xs overflow-hidden flex flex-col transition-colors",
            containerClassName
          )}
        >
          <div
            className={cn(
              "flex-1 min-h-0 flex flex-col w-full h-full",
              isScrollable ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
