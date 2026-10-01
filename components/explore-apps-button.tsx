"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { useAuthModal } from "@/components/auth/AuthModalContext";

export function ExploreAppsButton() {
  const { requireAuth } = useAuthModal();

  return (
    <Button asChild variant="secondary" className="gap-2">
      <Link
        href="/apps"
        onClick={(e) => {
          if (!requireAuth(e, "/apps")) return;
        }}
      >
        <LayoutGrid className="h-4 w-4" />
        Explore Mini Apps <ChevronRight className="h-4 w-4 ml-1" />
      </Link>
    </Button>
  );
}
