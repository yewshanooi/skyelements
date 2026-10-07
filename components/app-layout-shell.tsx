"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { NavigationBar } from "@/components/navigation-bar";
import { MiniAppShell } from "@/components/mini-app-shell";
import { AuthModalProvider, useAuthModal } from "@/components/auth/AuthModalContext";
import type { UserProfile } from "@/lib/profile";

function InnerAppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoadingUser } = useAuthModal();

  const isMiniApp =
    pathname === "/apps" ||
    pathname === "/notes" ||
    pathname?.startsWith("/notes/") ||
    pathname === "/sales" ||
    pathname?.startsWith("/sales/") ||
    pathname === "/skye" ||
    pathname?.startsWith("/skye/");

  // If on a mini-app route but the user is definitely not logged in, keep NavigationBar mounted
  // to avoid any split-second flash of MiniAppShell during unauthenticated redirects.
  const shouldRenderMiniAppShell = isMiniApp && (user !== null || isLoadingUser);

  return shouldRenderMiniAppShell ? (
    <MiniAppShell user={user}>{children}</MiniAppShell>
  ) : (
    <div className="min-h-screen flex flex-col">
      <NavigationBar user={user} />
      {children}
    </div>
  );
}

export function AppLayoutShell({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: UserProfile | null;
}) {
  return (
    <AuthModalProvider initialUser={initialUser}>
      <InnerAppLayoutShell>{children}</InnerAppLayoutShell>
    </AuthModalProvider>
  );
}
