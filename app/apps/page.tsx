import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Mini Apps",
  description: "SkyElements Mini Apps Suite",
};

interface MiniAppItem {
  id: string;
  name: string;
  emoji: string;
  version: string;
  description: string;
  tags: string[];
  href: string;
}

const MINI_APPS: MiniAppItem[] = [
  {
    id: "notes",
    name: "Notes",
    emoji: "📝",
    version: "v1.0.0",
    description: "AI-powered note-taking app with multi-turn reasoning and rich markdown editor.",
    tags: ["AI Chat", "Markdown", "Reasoning"],
    href: "/notes",
  },
  {
    id: "sales",
    name: "Sales Dashboard",
    emoji: "📊",
    version: "v1.0.0",
    description: "Manage sales, track revenue analytics, and organize orders across multiple channels.",
    tags: ["Analytics", "Multi-view", "PDF Export"],
    href: "/sales",
  },
];

export default async function AppsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/?auth=login&redirectTo=/apps");
  }

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col justify-start">
      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {MINI_APPS.map((app) => (
          <Link
            key={app.id}
            href={app.href}
            className="group block focus:outline-hidden h-full"
          >
            <Card className="h-full flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 hover:bg-card hover:border-foreground/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden p-6 sm:p-7">
              <div>
                {/* Top Bar inside Card: Icon & Version */}
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted/70 dark:bg-neutral-800/80 border border-border/60 flex items-center justify-center text-2xl shadow-2xs group-hover:scale-105 transition-transform duration-200 select-none">
                    {app.emoji}
                  </div>
                  <Badge variant="outline" className="font-mono text-xs text-muted-foreground font-normal">
                    {app.version}
                  </Badge>
                </div>

                {/* App Title */}
                <div className="mt-5 space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                    <span>{app.name}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-muted-foreground" />
                  </h2>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {app.description}
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {app.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/40"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
