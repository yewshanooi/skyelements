"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LogIn,
  ChevronsUpDown,
  LayoutGrid,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { signout } from "@/app/(auth)/actions";
import { SettingsDialog } from "@/components/settings-dialog";
import { getUserProfile, type UserProfile } from "@/app/notes/profile";

interface MiniAppHeaderProps {
  user?: UserProfile | null;
  signout?: () => Promise<void>;
  onProfileUpdated?: (profile: UserProfile) => void;
  onDeleteAllChats?: () => Promise<void>;
  onDeleteAllNotes?: () => Promise<void>;
}

const APPS = [
  { id: "notes", name: "Notes", emoji: "📝", href: "/notes" },
  { id: "sales", name: "Sales Dashboard", emoji: "📊", href: "/sales/table" },
  { id: "skye", name: "Skye", emoji: "🤖", href: "/skye" },
];

export function MiniAppHeader({
  user: initialUser,
  signout: customSignout,
  onProfileUpdated,
  onDeleteAllChats,
  onDeleteAllNotes,
}: MiniAppHeaderProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(initialUser ?? null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    if (initialUser !== undefined) {
      setCurrentUser(initialUser);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(getUserProfile(user));
      } else {
        setCurrentUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(getUserProfile(session.user));
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialUser]);



  const handleSignout = async () => {
    if (customSignout) {
      await customSignout();
    } else {
      await signout();
    }
  };

  const handleProfileUpdate = (updated: UserProfile) => {
    setCurrentUser(updated);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("skyelements:profile-updated", { detail: updated }));
    }
    onProfileUpdated?.(updated);
  };

  // Determine current active app based on URL path
  const activeApp = React.useMemo(() => {
    if (!pathname) return null;
    if (pathname === "/notes" || pathname.startsWith("/notes/")) {
      return APPS.find((a) => a.id === "notes") ?? null;
    }
    if (pathname === "/sales" || pathname.startsWith("/sales/")) {
      return APPS.find((a) => a.id === "sales") ?? null;
    }
    if (pathname === "/skye" || pathname.startsWith("/skye/")) {
      return APPS.find((a) => a.id === "skye") ?? null;
    }
    return null;
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-transparent text-foreground transition-colors shrink-0">
        <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
          {/* Left: SkyElements Logo & Service Switcher */}
          <div className="flex items-center min-w-0">
            {/* SkyElements Logo replacing text */}
            <Link
              href="/"
              className="flex items-center shrink-0 hover:opacity-80 transition-opacity"
              title="SkyElements Home"
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

            <span className="mx-3 sm:mx-3.5 text-lg font-light text-muted-foreground/60 select-none">
              |
            </span>

            {/* App Title / Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-md text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer select-none truncate"
                  title="Switch Mini App"
                >
                  {activeApp ? (
                    <>
                      <span className="text-base select-none leading-none shrink-0">
                        {activeApp.emoji}
                      </span>
                      <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">
                        {activeApp.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                      Mini Apps
                    </span>
                  )}
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 mt-1">
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
                      <span className="text-base select-none leading-none">{app.emoji}</span>
                      <span className="flex-1">{app.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/apps" className="flex items-center gap-2.5 w-full">
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    <span>All Mini Apps</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right: User Profile Settings */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Settings Trigger from Notes app */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-800 select-none max-w-[180px] sm:max-w-[220px]"
                title="Settings"
                aria-label="Settings"
              >
                <Avatar className="h-7 w-7 rounded-lg shrink-0">
                  {currentUser.avatarUrl && (
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName || "Avatar"} />
                  )}
                  <AvatarFallback className="rounded-lg text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 text-foreground">
                    {(currentUser.displayName || currentUser.email || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline truncate text-xs sm:text-sm font-medium text-foreground">
                  {currentUser.displayName || currentUser.email || "User"}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70" />
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {currentUser && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={currentUser}
          signout={handleSignout}
          onDeleteAllChats={onDeleteAllChats}
          onDeleteAllNotes={onDeleteAllNotes}
          onProfileUpdated={handleProfileUpdate}
        />
      )}
    </>
  );
}
