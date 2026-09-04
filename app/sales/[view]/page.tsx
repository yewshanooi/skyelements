import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SalesClient } from "../sales-client";
import type { ViewMode } from "@/types/sales";
import { fetchSalesAction } from "@/services/sales/salesActions";

const VALID_VIEWS: ViewMode[] = ['table', 'board', 'chart', 'timeline', 'map'];

export const metadata: Metadata = {
  title: "Sales Dashboard",
  description: "Comprehensive multi-view sales analytics, Notion tables, and AI Assistant.",
};

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

  const initialSales = await fetchSalesAction();

  return <SalesClient activeView={view as ViewMode} initialUser={user} initialSales={initialSales} />;
}
