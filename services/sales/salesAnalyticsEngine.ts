import { createClient } from '@/utils/supabase/server';
import type { SaleItem } from '@/types/sales';
import type {
  SalesMetric,
  SalesDimension,
  ChartType,
  MetricSortOrder,
  SalesFilterParams,
  QuerySalesMetricsArgs,
  ChartSpec,
  QueryMetricsResult,
} from '@/types/salesAi';

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

/**
 * Formats a metric key for user-friendly UI presentation
 */
function formatMetricLabel(metric: SalesMetric): string {
  switch (metric) {
    case 'revenue':
      return 'Revenue (RM)';
    case 'cost':
      return 'Cost (RM)';
    case 'profit':
      return 'Net Profit (RM)';
    case 'units_sold':
      return 'Units Sold';
    case 'order_count':
      return 'Orders';
    case 'aov':
      return 'Avg Order Value (RM)';
    default:
      return metric;
  }
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
  filters?: SalesFilterParams
): string {
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
  } else if (filters?.category) {
    title += ` [${filters.category}]`;
  }

  return title;
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
  limit: number
): Array<Record<string, unknown>> {
  // If no dimensions, compute single scalar row
  if (dimensions.length === 0) {
    let rev = 0;
    let cost = 0;
    let profit = 0;
    let units = 0;
    const count = rows.length;

    for (const r of rows) {
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

  for (const r of rows) {
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
  const dimensions = sanitizeDimensions(args.dimensions);
  const limit = sanitizeLimit(args.limit);
  const orderBy = sanitizeSortOrder(args.order_by);
  const filters = args.filters;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dataRows: Array<Record<string, unknown>> = [];
  let executionSource: 'postgres_rpc' | 'snapshot_fallback' = 'postgres_rpc';

  if (user) {
    // 1. Primary: Server-side PostgreSQL RPC
    try {
      const { data, error } = await supabase.rpc('query_sales_metrics', {
        p_metrics: metrics,
        p_dimensions: dimensions,
        p_start_date: filters?.start_date || null,
        p_end_date: filters?.end_date || null,
        p_category: filters?.category || null,
        p_marketplace: filters?.marketplace || null,
        p_order_status: filters?.order_status || null,
        p_payment_status: filters?.payment_status || null,
        p_customer: filters?.customer || null,
        p_order_by: orderBy,
        p_limit: limit,
      });

      if (!error && Array.isArray(data)) {
        dataRows = data as Array<Record<string, unknown>>;
        executionSource = 'postgres_rpc';
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
          limit
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
      limit
    );
    executionSource = 'snapshot_fallback';
  }

  // Construct Declarative Table Contract (ChartSpec)
  const resolvedXAxisKey = dimensions.length > 0 ? dimensions[0] : 'label';
  const resolvedTitle =
    args.chart_title?.trim() || generateChartTitle(dimensions, metrics, filters);

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
