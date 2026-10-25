import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SalesClient } from "@/sales/layout/SalesClient";
import { isViewMode } from "@/sales/types";
import { fetchSalesAction } from "@/sales/services/salesActions";
import { fetchOptionsAction } from "@/sales/services/optionsActions";
import { fetchSettingsAction } from "@/sales/services/settingsActions";
import { getPacificCalendarDate } from "@/sales/lib/dateUtils";


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
  if (view.length > 1 || !isViewMode(rawView)) {
    redirect("/sales/table");
  }

  const activeView = rawView;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/?auth=login&redirectTo=/sales/${encodeURIComponent(activeView)}`);
  }

  const savedInsightPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('sales_ai_insights')
        .select('summary')
        .eq('user_id', user.id)
        .eq('insight_date', getPacificCalendarDate())
        .maybeSingle();

      if (error) {
        console.error('[Sales Page] Error loading daily sales insight:', error);
        return null;
      }
      return typeof data?.summary === 'string' && data.summary.trim()
        ? data.summary
        : null;
    } catch (error) {
      console.error('[Sales Page] Error loading daily sales insight:', error);
      return null;
    }
  })();

  const [initialSales, initialOptions, initialSettings, initialSalesInsight] = await Promise.all([
    fetchSalesAction(),
    fetchOptionsAction(),
    fetchSettingsAction(),
    savedInsightPromise,
  ]);

  return (
    <SalesClient
      activeView={activeView}
      initialUser={user}
      initialSales={initialSales}
      initialOptions={initialOptions}
      initialSettings={initialSettings}
      initialSalesInsight={initialSalesInsight}
    />
  );
}
