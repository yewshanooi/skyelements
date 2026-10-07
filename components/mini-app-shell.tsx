"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutGrid, ChevronsUpDown, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserProfile } from "@/lib/profile";
import { UserNav } from "@/components/user-nav";
import { cn } from "@/lib/utils";

type AppItem = {
  id: string;
  name: string;
  href: string;
  emoji?: string;
  icon?: (className?: string) => React.ReactNode;
};

const APPS: AppItem[] = [
  { id: "notes", name: "Notes", emoji: "📝", href: "/notes" },
  { id: "sales", name: "Sales Dashboard", emoji: "📊", href: "/sales" },
  {
    id: "skye",
    name: "Skye",
    icon: (className) => (
      <Sparkles
        className={cn(
          "w-3.5 h-3.5 !text-purple-600 dark:!text-purple-400 !stroke-purple-600 dark:!stroke-purple-400 group-focus/dropdown-menu-item:!text-purple-600 dark:group-focus/dropdown-menu-item:!text-purple-400 group-hover/dropdown-menu-item:!text-purple-600 dark:group-hover/dropdown-menu-item:!text-purple-400 group-focus/dropdown-menu-item:!stroke-purple-600 dark:group-focus/dropdown-menu-item:!stroke-purple-400 group-hover/dropdown-menu-item:!stroke-purple-600 dark:group-hover/dropdown-menu-item:!stroke-purple-400 shrink-0",
          className
        )}
      />
    ),
    href: "/skye",
  },
];

export interface MiniAppHeaderProps {
  user?: UserProfile | null;
  signout?: () => Promise<void>;
  onProfileUpdated?: (profile: UserProfile) => void;
  onDeleteAllChats?: () => Promise<void>;
  onDeleteAllNotes?: () => Promise<void>;
}

export function MiniAppHeader({
  user: initialUser,
  signout: customSignout,
  onProfileUpdated,
  onDeleteAllChats,
  onDeleteAllNotes,
}: MiniAppHeaderProps) {
  const pathname = usePathname();

  // Determine current active app based on URL path
  const activeApp = React.useMemo(() => {
    if (!pathname) return null;
    if (pathname === "/skye" || pathname.startsWith("/skye/")) {
      return APPS.find((a) => a.id === "skye") ?? null;
    }
    if (pathname === "/notes" || pathname.startsWith("/notes/")) {
      return APPS.find((a) => a.id === "notes") ?? null;
    }
    if (pathname === "/sales" || pathname.startsWith("/sales/")) {
      return APPS.find((a) => a.id === "sales") ?? null;
    }
    return null;
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent text-foreground transition-colors shrink-0">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        {/* Left: SkyElements Logo & Service Switcher */}
        <div className="flex items-center min-w-0">
          <Link
            href="/"
            className="flex items-center shrink-0 hover:opacity-80 transition-opacity"
            title="Home"
          >
            <Image
              src="/logo/skyelements.png"
              alt="SkyElements Logo"
              width={160}
              height={37}
              className="h-7 w-auto select-none"
              priority
            />
          </Link>

          <span className="mx-3 sm:mx-3.5 text-base font-light text-muted-foreground/60 select-none">
            |
          </span>

          {/* App Title / Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 px-2 -ml-1 rounded-md text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer select-none truncate"
                title="Switch App"
              >
                {activeApp ? (
                  <>
                    <span className="flex items-center justify-center w-4 h-4 shrink-0 text-sm select-none leading-none">
                      {activeApp.icon ? activeApp.icon("w-3.5 h-3.5") : activeApp.emoji}
                    </span>
                    <span className="text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">
                      {activeApp.name}
                    </span>
                  </>
                ) : (
                  <span className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
                    Mini Apps
                  </span>
                )}
                <ChevronsUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" collisionPadding={8} className="w-56 max-w-[calc(100vw-16px)] mt-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Switch App
              </DropdownMenuLabel>
              {APPS.map((app) => (
                <DropdownMenuItem key={app.id} asChild className="cursor-pointer">
                  <Link
                    href={app.href}
                    className={`flex items-center gap-2.5 w-full ${
                      activeApp?.id === app.id ? "font-semibold bg-accent text-accent-foreground" : ""
                    }`}
                  >
                    <span
                      className={cn(
                        "flex items-center justify-center w-4 h-4 shrink-0 text-sm select-none leading-none",
                        app.id === "skye" && "text-purple-600 dark:text-purple-400"
                      )}
                    >
                      {app.icon ? app.icon("w-3.5 h-3.5") : app.emoji}
                    </span>
                    <span className="flex-1">{app.name}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/apps" className="flex items-center gap-2.5 w-full">
                  <LayoutGrid className="h-4 w-4 shrink-0 !text-muted-foreground group-focus/dropdown-menu-item:!text-muted-foreground group-hover/dropdown-menu-item:!text-muted-foreground" />
                  <span>All Mini Apps</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: User Profile Settings */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <UserNav
            user={initialUser}
            signout={customSignout}
            onProfileUpdated={onProfileUpdated}
            onDeleteAllChats={onDeleteAllChats}
            onDeleteAllNotes={onDeleteAllNotes}
            redirectTo={pathname || "/apps"}
          />
        </div>
      </div>
    </header>
  );
}

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
  const isSales = pathname === "/sales" || pathname?.startsWith("/sales/");
  const isSkye = pathname === "/skye" || pathname?.startsWith("/skye/");
  const isScrollable = scrollable !== undefined ? scrollable : (!isNotes && !isSales && !isSkye);

  return (
    <div
      className={cn(
        "flex flex-col h-svh w-full overflow-hidden bg-neutral-100/70 dark:bg-[#0c0c0c] text-foreground transition-colors",
        className
      )}
    >
      {/* Top Part: Mini Apps Sticky Bar */}
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
