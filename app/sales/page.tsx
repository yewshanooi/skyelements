import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { UnauthenticatedLanding } from "@/components/sales/UnauthenticatedLanding";

export const metadata: Metadata = {
  title: "Sales Dashboard",
  description: "Manage sales, track revenue analytics, and organize orders across multiple channels.",
};

export default async function SalesIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <UnauthenticatedLanding />;
  }

  const sp = await searchParams;
  const entries: [string, string][] = [];

  for (const [key, value] of Object.entries(sp || {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) entries.push([key, item]);
      }
    } else if (value) {
      entries.push([key, value]);
    }
  }

  const queryString = new URLSearchParams(entries).toString();
  redirect(`/sales/table${queryString ? `?${queryString}` : ''}`);
}
