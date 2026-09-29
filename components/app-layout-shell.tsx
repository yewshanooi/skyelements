"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { NavigationBar } from "@/components/navigation-bar";
import { MiniAppShell } from "@/components/mini-app-shell";

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isMiniApp =
    pathname === "/apps" ||
    pathname === "/notes" ||
    pathname?.startsWith("/notes/") ||
    pathname === "/sales" ||
    pathname?.startsWith("/sales/") ||
    pathname === "/skye" ||
    pathname?.startsWith("/skye/");

  if (isMiniApp) {
    return <MiniAppShell>{children}</MiniAppShell>;
  }

  return (
    <>
      <NavigationBar />
      {children}
    </>
  );
}
