import { createClient } from '@/utils/supabase/server';
import type { SaleItem } from '@/sales/types';
import { CATEGORIES, STORE_TYPES } from '@/sales/types';
import type {
  SalesMetric,
  SalesDimension,
  MetricSortOrder,
  SalesFilterParams,
  QuerySalesMetricsArgs,
  ChartSpec,
  QueryMetricsResult,
} from '@/sales/types/ai';

const VALID_METRICS = new Set<SalesMetric>([
  'revenue',
  'cost',
  'profit',
  'units_sold',
  'order_count',
  'aov',
]);

const VALID_DIMENSIONS = new Set<SalesDimension>([
  'category',
  'marketplace',
  'order_status',
  'payment_status',
  'customer',
  'item',
  'date',
  'month',
]);

/**
 * Whitelist validation and sanitization of metrics and dimensions
 */
function sanitizeMetrics(metrics?: unknown[]): SalesMetric[] {
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return ['revenue'];
  }
  const filtered = metrics
    .map((m) => String(m).toLowerCase().trim() as SalesMetric)
    .filter((m): m is SalesMetric => VALID_METRICS.has(m));

  const result: SalesMetric[] = filtered.length > 0 ? filtered : ['revenue'];
  // Cap at maximum 2 metrics so the table remains clean and readable without too many columns
  return result.slice(0, 2);
}

function sanitizeDimensions(dimensions?: unknown[]): SalesDimension[] {
  if (!Array.isArray(dimensions) || dimensions.length === 0) {
    return [];
  }
  return dimensions
    .map((d) => String(d).toLowerCase().trim() as SalesDimension)
    .filter((d): d is SalesDimension => VALID_DIMENSIONS.has(d));
}

function sanitizeLimit(limit?: unknown): number {
  const num = Number(limit);
  if (isNaN(num) || num < 1) return 50;
  return Math.min(Math.max(Math.round(num), 1), 50);
}

function sanitizeSortOrder(order?: unknown): MetricSortOrder {
  const s = String(order || '').toLowerCase().trim();
  if (s === 'metric_asc' || s === 'dimension_asc' || s === 'dimension_desc') {
    return s as MetricSortOrder;
  }
  return 'metric_desc';
}

function parseMultiFilter(
  singular?: unknown,
  plural?: unknown[]
): string[] {
  const result: string[] = [];
  if (Array.isArray(plural)) {
    for (const item of plural) {
      if (typeof item === 'string' && item.trim()) {
        result.push(item.trim());
      }
    }
  }
  if (typeof singular === 'string' && singular.trim()) {
    const cleaned = singular.trim();
    if (cleaned.includes(',') || cleaned.toLowerCase().includes(' vs ') || cleaned.toLowerCase().includes(' and ')) {
      const parts = cleaned
        .split(/,|\s+vs\s+|\s+and\s+/i)
        .map((s) => s.trim())
        .filter(Boolean);
      result.push(...parts);
    } else {
      result.push(cleaned);
    }
  }
  return Array.from(new Set(result));
}

function canonicalizeCategory(cat: string): string {
  const match = CATEGORIES.find((c) => c.toLowerCase() === cat.toLowerCase().trim());
  return match || cat.trim();
}

function canonicalizeMarketplace(store: string): string {
  const match = STORE_TYPES.find((s) => s.toLowerCase() === store.toLowerCase().trim());
  return match || store.trim();
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

/**
 * Generate descriptive chart heading when not explicitly provided
 */
function generateChartTitle(
  dimensions: SalesDimension[],
  metrics: SalesMetric[],
  filters?: SalesFilterParams,
  targetCategories: string[] = [],
  targetMarketplaces: string[] = []
): string {
  if (targetCategories.length >= 2) {
    return `Sales Comparison: ${targetCategories.join(' vs ')}`;
  }
  if (targetMarketplaces.length >= 2) {
    return `Store Comparison: ${targetMarketplaces.join(' vs ')}`;
  }

  const metricLabels = metrics.map((m) => {
    switch (m) {
      case 'revenue':
        return 'Revenue';
      case 'cost':
        return 'Cost';
      case 'profit':
        return 'Profit';
      case 'units_sold':
        return 'Units Sold';
      case 'order_count':
        return 'Order Count';
      case 'aov':
        return 'AOV';
    }
  });

  const metricStr = metricLabels.join(' & ');

  if (dimensions.length === 0) {
    return `Overall ${metricStr} Summary`;
  }

  const dimLabel = dimensions[0].charAt(0).toUpperCase() + dimensions[0].slice(1);
  let title = `${metricStr} by ${dimLabel}`;

  if (filters?.start_date && filters?.end_date) {
    title += ` (${formatDisplayDate(filters.start_date)} to ${formatDisplayDate(filters.end_date)})`;
  } else if (targetCategories.length === 1) {
    title += ` [${targetCategories[0]}]`;
  } else if (filters?.category) {
    title += ` [${filters.category}]`;
  }

  return title;
}

interface FilterContext {
  startDate?: string;
  endDate?: string;
  targetCategories?: string[];
  targetMarketplaces?: string[];
  targetOrderStatuses?: string[];
  targetPaymentStatuses?: string[];
  targetCustomers?: string[];
  targetItems?: string[];
}

/**
 * Deterministic In-Memory Aggregation Engine (Fallback if DB RPC not applied)
 * Computes exact mathematical aggregates with 2-decimal rounding.
 */
function computeDeterministicAggregation(
  rows: Array<{
    date?: string;
    item?: string;
    quantity?: number;
    subtotal?: number;
    cost?: number;
    sales?: number;
    category?: string;
    marketplace?: string;
    order_status?: string;
    payment_status?: string;
    customer?: string;
  }>,
  metrics: SalesMetric[],
  dimensions: SalesDimension[],
  orderBy: MetricSortOrder,
  limit: number,
  filterContext?: FilterContext
): Array<Record<string, unknown>> {
  let filteredRows = rows;
  if (filterContext) {
    const {
      startDate,
      endDate,
      targetCategories,
      targetMarketplaces,
      targetOrderStatuses,
      targetPaymentStatuses,
      targetCustomers,
      targetItems,
    } = filterContext;

    filteredRows = rows.filter((r) => {
      if (startDate && (!r.date || r.date < startDate)) return false;
      if (endDate && (!r.date || r.date > endDate)) return false;

      if (targetCategories && targetCategories.length > 0) {
        const cat = (r.category || '').toLowerCase();
        if (!targetCategories.some((tc) => tc.toLowerCase() === cat)) return false;
      }

      if (targetMarketplaces && targetMarketplaces.length > 0) {
        const mkt = (r.marketplace || '').toLowerCase();
        if (!targetMarketplaces.some((tm) => tm.toLowerCase() === mkt)) return false;
      }

      if (targetOrderStatuses && targetOrderStatuses.length > 0) {
        const st = (r.order_status || '').toLowerCase();
        if (!targetOrderStatuses.some((ts) => ts.toLowerCase() === st)) return false;
      }

      if (targetPaymentStatuses && targetPaymentStatuses.length > 0) {
        const ps = (r.payment_status || '').toLowerCase();
        if (!targetPaymentStatuses.some((tp) => tp.toLowerCase() === ps)) return false;
      }

      if (targetCustomers && targetCustomers.length > 0) {
        const cust = (r.customer || '').toLowerCase();
        if (!targetCustomers.some((tc) => cust.includes(tc.toLowerCase()))) return false;
      }

      if (targetItems && targetItems.length > 0) {
        const it = (r.item || '').toLowerCase();
        if (!targetItems.some((ti) => it.includes(ti.toLowerCase()))) return false;
      }

      return true;
    });
  }

  // If no dimensions, compute single scalar row
  if (dimensions.length === 0) {
    let rev = 0;
    let cost = 0;
    let profit = 0;
    let units = 0;
    const count = filteredRows.length;

    for (const r of filteredRows) {
      rev += Number(r.subtotal) || 0;
      cost += Number(r.cost) || 0;
      profit += Number(r.sales) || (Number(r.subtotal) || 0) - (Number(r.cost) || 0);
      units += Number(r.quantity) || 0;
    }

    const singleRow: Record<string, unknown> = {
      label: 'Total',
    };

    for (const m of metrics) {
      if (m === 'revenue') singleRow.revenue = Number(rev.toFixed(2));
      if (m === 'cost') singleRow.cost = Number(cost.toFixed(2));
      if (m === 'profit') singleRow.profit = Number(profit.toFixed(2));
      if (m === 'units_sold') singleRow.units_sold = units;
      if (m === 'order_count') singleRow.order_count = count;
      if (m === 'aov') singleRow.aov = count > 0 ? Number((rev / count).toFixed(2)) : 0;
    }

    return [singleRow];
  }

  // Multi-bucket grouping
  const buckets = new Map<
    string,
    {
      dimValues: Record<string, string>;
      revenue: number;
      cost: number;
      profit: number;
      units_sold: number;
      order_count: number;
    }
  >();

  for (const r of filteredRows) {
    const dimValues: Record<string, string> = {};
    const keyParts: string[] = [];

    for (const d of dimensions) {
      let val = '';
      if (d === 'month') {
        val = r.date && r.date.length >= 7 ? r.date.slice(0, 7) : 'Unknown';
      } else if (d === 'date') {
        val = r.date || 'Unknown';
      } else if (d === 'category') {
        val = r.category || 'Uncategorized';
      } else if (d === 'marketplace') {
        val = r.marketplace || 'Direct';
      } else if (d === 'order_status') {
        val = r.order_status || 'Unknown';
      } else if (d === 'payment_status') {
        val = r.payment_status || 'Unknown';
      } else if (d === 'customer') {
        val = r.customer || 'Anonymous';
      } else if (d === 'item') {
        val = r.item || 'Untitled Item';
      }
      dimValues[d] = val;
      keyParts.push(val);
    }

    const groupKey = keyParts.join('||');
    let entry = buckets.get(groupKey);
    if (!entry) {
      entry = {
        dimValues,
        revenue: 0,
        cost: 0,
        profit: 0,
        units_sold: 0,
        order_count: 0,
      };
      buckets.set(groupKey, entry);
    }

    const sub = Number(r.subtotal) || 0;
    const cst = Number(r.cost) || 0;
    const prf = Number(r.sales) || sub - cst;
    const qty = Number(r.quantity) || 0;

    entry.revenue += sub;
    entry.cost += cst;
    entry.profit += prf;
    entry.units_sold += qty;
    entry.order_count += 1;
  }

  // Format into final records
  let result: Array<Record<string, unknown>> = [];
  for (const entry of buckets.values()) {
    const row: Record<string, unknown> = { ...entry.dimValues };

    for (const m of metrics) {
      if (m === 'revenue') row.revenue = Number(entry.revenue.toFixed(2));
      if (m === 'cost') row.cost = Number(entry.cost.toFixed(2));
      if (m === 'profit') row.profit = Number(entry.profit.toFixed(2));
      if (m === 'units_sold') row.units_sold = entry.units_sold;
      if (m === 'order_count') row.order_count = entry.order_count;
      if (m === 'aov') {
        row.aov =
          entry.order_count > 0 ? Number((entry.revenue / entry.order_count).toFixed(2)) : 0;
      }
    }
    result.push(row);
  }

  // Ensure all compared items appear even if they had 0 sales
  if (filterContext?.targetCategories && filterContext.targetCategories.length > 1 && dimensions.includes('category')) {
    for (const cat of filterContext.targetCategories) {
      const exists = result.some((r) => String(r.category || '').toLowerCase() === cat.toLowerCase());
      if (!exists) {
        const zeroRow: Record<string, unknown> = { category: cat };
        for (const m of metrics) {
          zeroRow[m] = 0;
        }
        result.push(zeroRow);
      }
    }
  }

  if (filterContext?.targetMarketplaces && filterContext.targetMarketplaces.length > 1 && dimensions.includes('marketplace')) {
    for (const mkt of filterContext.targetMarketplaces) {
      const exists = result.some((r) => String(r.marketplace || '').toLowerCase() === mkt.toLowerCase());
      if (!exists) {
        const zeroRow: Record<string, unknown> = { marketplace: mkt };
        for (const m of metrics) {
          zeroRow[m] = 0;
        }
        result.push(zeroRow);
      }
    }
  }

  // Sorting
  const primaryMetric = metrics[0] || 'revenue';
  const primaryDim = dimensions[0];

  result.sort((a, b) => {
    if (orderBy === 'metric_asc') {
      return (Number(a[primaryMetric]) || 0) - (Number(b[primaryMetric]) || 0);
    }
    if (orderBy === 'dimension_asc' && primaryDim) {
      return String(a[primaryDim] || '').localeCompare(String(b[primaryDim] || ''));
    }
    if (orderBy === 'dimension_desc' && primaryDim) {
      return String(b[primaryDim] || '').localeCompare(String(a[primaryDim] || ''));
    }
    // Default: metric_desc
    return (Number(b[primaryMetric]) || 0) - (Number(a[primaryMetric]) || 0);
  });

  if (result.length > limit) {
    result = result.slice(0, limit);
  }

  return result;
}

/**
 * Deterministic Query Execution Engine
 * Evaluates analytics strictly against PostgreSQL via Supabase RPC or direct parameterized queries.
 */
export async function executeSalesMetricsQuery(
  args: QuerySalesMetricsArgs,
  snapshotFallback?: SaleItem[]
): Promise<QueryMetricsResult> {
  const metrics = sanitizeMetrics(args.metrics);
  const rawDimensions = sanitizeDimensions(args.dimensions);
  const limit = sanitizeLimit(args.limit);
  const orderBy = sanitizeSortOrder(args.order_by);
  const filters = args.filters;

  const targetCategories = parseMultiFilter(filters?.category, filters?.categories).map(canonicalizeCategory);
  const targetMarketplaces = parseMultiFilter(filters?.marketplace, filters?.marketplaces).map(canonicalizeMarketplace);
  const targetOrderStatuses = parseMultiFilter(filters?.order_status, filters?.order_statuses);
  const targetPaymentStatuses = parseMultiFilter(filters?.payment_status, filters?.payment_statuses);
  const targetCustomers = parseMultiFilter(filters?.customer, filters?.customers);
  const targetItems = parseMultiFilter(filters?.item, filters?.items);

  // If comparing multiple entities across a dimension, ensure that dimension is included
  const dimensions = [...rawDimensions];
  if (targetCategories.length > 1 && !dimensions.includes('category')) {
    dimensions.unshift('category');
  }
  if (targetMarketplaces.length > 1 && !dimensions.includes('marketplace')) {
    dimensions.unshift('marketplace');
  }
  if (targetCustomers.length > 1 && !dimensions.includes('customer')) {
    dimensions.unshift('customer');
  }
  if (targetOrderStatuses.length > 1 && !dimensions.includes('order_status')) {
    dimensions.unshift('order_status');
  }
  if (targetPaymentStatuses.length > 1 && !dimensions.includes('payment_status')) {
    dimensions.unshift('payment_status');
  }
  if (targetItems.length > 1 && !dimensions.includes('item')) {
    dimensions.unshift('item');
  }

  const filterContext: FilterContext = {
    startDate: filters?.start_date,
    endDate: filters?.end_date,
    targetCategories,
    targetMarketplaces,
    targetOrderStatuses,
    targetPaymentStatuses,
    targetCustomers,
    targetItems,
  };

  let dataRows: Array<Record<string, unknown>> = [];
  let executionSource: 'postgres_rpc' | 'snapshot_fallback' = 'postgres_rpc';

  let user: { id?: string } | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    user = authData?.user ?? null;
  } catch {
    user = null;
  }

  if (user && supabase) {
    // 1. Primary: Server-side PostgreSQL RPC
    try {
      // For multi-value comparisons, pass null to RPC so PostgreSQL groups by dimension without filtering out compared items
      const rpcCategory = targetCategories.length === 1 ? targetCategories[0] : null;
      const rpcMarketplace = targetMarketplaces.length === 1 ? targetMarketplaces[0] : null;
      const rpcOrderStatus = targetOrderStatuses.length === 1 ? targetOrderStatuses[0] : null;
      const rpcPaymentStatus = targetPaymentStatuses.length === 1 ? targetPaymentStatuses[0] : null;
      const rpcCustomer = targetCustomers.length === 1 ? targetCustomers[0] : null;

      const { data, error } = await supabase.rpc('query_sales_metrics', {
        p_metrics: metrics,
        p_dimensions: dimensions,
        p_start_date: filters?.start_date || null,
        p_end_date: filters?.end_date || null,
        p_category: rpcCategory,
        p_marketplace: rpcMarketplace,
        p_order_status: rpcOrderStatus,
        p_payment_status: rpcPaymentStatus,
        p_customer: rpcCustomer,
        p_order_by: orderBy,
        p_limit: targetCategories.length > 1 || targetMarketplaces.length > 1 ? 50 : limit,
      });

      if (!error && Array.isArray(data)) {
        dataRows = data as Array<Record<string, unknown>>;
        executionSource = 'postgres_rpc';

        // Filter returned rows down to requested multi-value targets if comparing
        if (targetCategories.length > 1) {
          const catSet = new Set(targetCategories.map((c) => c.toLowerCase()));
          dataRows = dataRows.filter((r) => catSet.has(String(r.category || '').toLowerCase()));

          // Ensure every compared category appears even if 0 sales
          for (const cat of targetCategories) {
            const exists = dataRows.some((r) => String(r.category || '').toLowerCase() === cat.toLowerCase());
            if (!exists) {
              const zeroRow: Record<string, unknown> = { category: cat };
              for (const m of metrics) zeroRow[m] = 0;
              dataRows.push(zeroRow);
            }
          }
        }

        if (targetMarketplaces.length > 1) {
          const mktSet = new Set(targetMarketplaces.map((m) => m.toLowerCase()));
          dataRows = dataRows.filter((r) => mktSet.has(String(r.marketplace || '').toLowerCase()));

          for (const mkt of targetMarketplaces) {
            const exists = dataRows.some((r) => String(r.marketplace || '').toLowerCase() === mkt.toLowerCase());
            if (!exists) {
              const zeroRow: Record<string, unknown> = { marketplace: mkt };
              for (const m of metrics) zeroRow[m] = 0;
              dataRows.push(zeroRow);
            }
          }
        }

        if (targetCustomers.length > 1) {
          dataRows = dataRows.filter((r) => {
            const cust = String(r.customer || '').toLowerCase();
            return targetCustomers.some((tc) => cust.includes(tc.toLowerCase()));
          });

          for (const cust of targetCustomers) {
            const exists = dataRows.some((r) => String(r.customer || '').toLowerCase().includes(cust.toLowerCase()));
            if (!exists) {
              const zeroRow: Record<string, unknown> = { customer: cust };
              for (const m of metrics) zeroRow[m] = 0;
              dataRows.push(zeroRow);
            }
          }
        }

        // Re-sort and re-limit
        const primaryMetric = metrics[0] || 'revenue';
        const primaryDim = dimensions[0];
        dataRows.sort((a, b) => {
          if (orderBy === 'metric_asc') {
            return (Number(a[primaryMetric]) || 0) - (Number(b[primaryMetric]) || 0);
          }
          if (orderBy === 'dimension_asc' && primaryDim) {
            return String(a[primaryDim] || '').localeCompare(String(b[primaryDim] || ''));
          }
          if (orderBy === 'dimension_desc' && primaryDim) {
            return String(b[primaryDim] || '').localeCompare(String(a[primaryDim] || ''));
          }
          return (Number(b[primaryMetric]) || 0) - (Number(a[primaryMetric]) || 0);
        });

        if (dataRows.length > limit) {
          dataRows = dataRows.slice(0, limit);
        }
      } else {
        throw new Error(error?.message || 'RPC query failed');
      }
    } catch {
      // 2. Fallback: Fast deterministic aggregation on cached snapshot
      if (snapshotFallback && snapshotFallback.length > 0) {
        dataRows = computeDeterministicAggregation(
          snapshotFallback,
          metrics,
          dimensions,
          orderBy,
          limit,
          filterContext
        );
        executionSource = 'snapshot_fallback';
      }
    }
  } else if (snapshotFallback && snapshotFallback.length > 0) {
    // Unauthenticated preview / offline mode
    dataRows = computeDeterministicAggregation(
      snapshotFallback,
      metrics,
      dimensions,
      orderBy,
      limit,
      filterContext
    );
    executionSource = 'snapshot_fallback';
  }

  // Construct Declarative Table Contract (ChartSpec)
  const resolvedXAxisKey = dimensions.length > 0 ? dimensions[0] : 'label';
  const resolvedTitle =
    args.chart_title?.trim() ||
    generateChartTitle(dimensions, metrics, filters, targetCategories, targetMarketplaces);

  const chartSpec: ChartSpec = {
    type: 'table',
    title: resolvedTitle,
    data: dataRows,
    xAxisKey: resolvedXAxisKey,
    dataKeys: metrics,
  };

  return {
    data: dataRows,
    rowCount: dataRows.length,
    chartSpec,
    source: executionSource,
  };
}
