import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight, LayoutGrid } from "lucide-react";

export const metadata: Metadata = {
  title: "SkyElements",
  description: "Home of everything elements",
};

export default async function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-16 lg:pt-24">
      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-3xl text-center font-semibold text-balance">
          Home of everything elements
        </h1>
        <p className="text-muted-foreground text-center text-l max-w-2xl">
          Run open source projects with just a few commands.
        </p>

        <div className="flex justify-center mt-4">
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/apps">
              <LayoutGrid className="h-4 w-4" />
              Explore Mini Apps <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
