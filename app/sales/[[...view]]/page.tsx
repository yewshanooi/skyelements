import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SalesClient } from "../sales-client";
import type { ViewMode } from "@/sales/types";
import { fetchSalesAction } from "@/sales/services/salesActions";

const VALID_VIEWS: ViewMode[] = ["table", "board", "chart", "timeline", "map"];

export const metadata: Metadata = {
  title: "Sales Dashboard",
  description: "Comprehensive multi-view sales analytics, Notion tables, and AI Assistant.",
};

export default async function SalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ view?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { view } = await params;

  // Case 1: Root /sales index -> Redirect to /sales/table preserving any query parameters
  if (!view || view.length === 0) {
    const sp = await searchParams;
    const queryString = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((item) => [k, item]) : v !== undefined ? [[k, v]] : []
      )
    ).toString();

    redirect(`/sales/table${queryString ? `?${queryString}` : ""}`);
  }

  // Case 2: Multi-segment or invalid view -> Default back to /sales/table
  const rawView = view[0];
  if (view.length > 1 || !VALID_VIEWS.includes(rawView as ViewMode)) {
    redirect("/sales/table");
  }

  const activeView = rawView as ViewMode;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/?auth=login&redirectTo=/sales/${encodeURIComponent(activeView)}`);
  }

  const initialSales = await fetchSalesAction();

  return <SalesClient activeView={activeView} initialUser={user} initialSales={initialSales} />;
}
