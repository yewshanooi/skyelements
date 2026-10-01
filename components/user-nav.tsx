"use client";

import * as React from "react";
import { LogIn, ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/settings-dialog";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import type { UserProfile } from "@/app/notes/profile";
import { cn } from "@/lib/utils";

export interface UserNavProps {
  user?: UserProfile | null;
  signout?: () => Promise<void>;
  onProfileUpdated?: (profile: UserProfile) => void;
  onDeleteAllChats?: () => Promise<void>;
  onDeleteAllNotes?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  onAction?: () => void;
  onOpenSettingsClick?: () => void;
  variant?: "default" | "mobile";
  className?: string;
  redirectTo?: string;
}

export function UserNav({
  user: initialUser,
  signout: customSignout,
  onProfileUpdated,
  onDeleteAllChats,
  onDeleteAllNotes,
  onDeleteAccount,
  onAction,
  onOpenSettingsClick,
  variant = "default",
  className,
  redirectTo,
}: UserNavProps) {
  const { openAuth, user: contextUser, signOut: contextSignOut, isLoadingUser } = useAuthModal();
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(
    initialUser !== undefined ? initialUser : (contextUser ?? null)
  );
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    if (initialUser !== undefined) {
      setCurrentUser(initialUser);
      return;
    }
    setCurrentUser(contextUser);
  }, [initialUser, contextUser]);

  const handleSignout = async () => {
    if (customSignout) {
      try {
        await customSignout();
      } catch (e) {
        console.error("Custom signout error:", e);
      }
    }
    await contextSignOut();
  };

  const handleProfileUpdate = (updated: UserProfile) => {
    setCurrentUser(updated);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("skyelements:profile-updated", { detail: updated }));
    }
    onProfileUpdated?.(updated);
  };

  const handleOpenSettings = () => {
    if (onOpenSettingsClick) {
      onOpenSettingsClick();
      return;
    }
    onAction?.();
    setSettingsOpen(true);
  };

  const handleOpenSignIn = () => {
    onAction?.();
    openAuth("login", redirectTo);
  };

  const displayName = currentUser?.displayName || currentUser?.email || "User";
  const initial = (currentUser?.displayName || currentUser?.email || "U").slice(0, 1).toUpperCase();

  if (variant === "mobile") {
    if (!currentUser && isLoadingUser) {
      return (
        <div
          className={cn("w-full h-10 rounded-lg animate-pulse bg-muted/40", className)}
          aria-hidden="true"
        />
      );
    }

    return (
      <>
        {currentUser ? (
          <button
            type="button"
            onClick={handleOpenSettings}
            className={cn(
              "w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-200/80 dark:border-neutral-800 select-none",
              className
            )}
            title="Settings"
            aria-label="Settings"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar size="sm" className="size-6 shrink-0 rounded-full">
                {currentUser.avatarUrl && (
                  <AvatarImage src={currentUser.avatarUrl} alt={displayName} />
                )}
                <AvatarFallback className="rounded-full text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-800 text-foreground">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground truncate">
                {displayName}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 opacity-70" />
          </button>
        ) : (
          <Button
            variant="default"
            onClick={handleOpenSignIn}
            className={cn("w-full gap-2 cursor-pointer font-medium", className)}
          >
            <LogIn className="h-4 w-4" />
            <span>Sign in</span>
          </Button>
        )}

        {!onOpenSettingsClick && currentUser && (
          <SettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            user={currentUser}
            signout={handleSignout}
            onProfileUpdated={handleProfileUpdate}
            onDeleteAllChats={onDeleteAllChats}
            onDeleteAllNotes={onDeleteAllNotes}
            onDeleteAccount={onDeleteAccount}
          />
        )}
      </>
    );
  }

  if (!currentUser && isLoadingUser) {
    return (
      <div
        className={cn("h-8 w-[76px] rounded-lg animate-pulse bg-muted/40", className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      {currentUser ? (
        <button
          type="button"
          onClick={handleOpenSettings}
          className={cn(
            "inline-flex h-9 items-center gap-2 px-2.5 rounded-lg text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer select-none max-w-[180px] sm:max-w-[220px]",
            className
          )}
          title="Settings"
          aria-label="Settings"
        >
          <Avatar size="sm" className="size-6 shrink-0 rounded-full">
            {currentUser.avatarUrl && (
              <AvatarImage src={currentUser.avatarUrl} alt={displayName} />
            )}
            <AvatarFallback className="rounded-full text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-800 text-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline truncate text-sm font-medium text-foreground">
            {displayName}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70" />
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenSignIn}
          className={cn("cursor-pointer gap-1.5 text-xs font-medium rounded-lg h-8 px-3", className)}
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Sign in</span>
        </Button>
      )}

      {!onOpenSettingsClick && currentUser && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={currentUser}
          signout={handleSignout}
          onProfileUpdated={handleProfileUpdate}
          onDeleteAllChats={onDeleteAllChats}
          onDeleteAllNotes={onDeleteAllNotes}
          onDeleteAccount={onDeleteAccount}
        />
      )}
    </>
  );
}
