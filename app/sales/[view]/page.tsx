import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SalesClient } from "../sales-client";
import type { SaleItem, ViewMode } from "@/types/sales";
import { mapRowToSaleItem } from "@/lib/sales/saleMappers";

const VALID_VIEWS: ViewMode[] = ['table', 'board', 'chart', 'timeline', 'map'];

const VIEW_TITLES: Record<ViewMode, string> = {
  table: 'Table',
  board: 'Board',
  chart: 'Chart',
  timeline: 'Timeline',
  map: 'Map',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ view: string }>;
}): Promise<Metadata> {
  const { view } = await params;
  const title = VIEW_TITLES[view as ViewMode] || 'Sales Dashboard';
  return {
    title: `Sales Dashboard | ${title}`,
    description: "Comprehensive multi-view sales analytics, Notion tables, and AI Copilot.",
  };
}

export default async function SalesViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!VALID_VIEWS.includes(view as ViewMode)) {
    redirect('/sales/table');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sales');
  }

  let initialSales: SaleItem[] = [];

  const { data: salesData, error } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (!error && salesData) {
    initialSales = salesData.map(mapRowToSaleItem);
  }

  return <SalesClient activeView={view as ViewMode} initialUser={user} initialSales={initialSales} />;
}
