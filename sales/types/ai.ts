export type SalesMetric =
  | 'revenue'
  | 'cost'
  | 'profit'
  | 'units_sold'
  | 'order_count'
  | 'aov';

export type SalesDimension =
  | 'category'
  | 'marketplace'
  | 'order_status'
  | 'payment_status'
  | 'customer'
  | 'item'
  | 'date'
  | 'month';

export type ChartType = 'table';

export type MetricSortOrder =
  | 'metric_desc'
  | 'metric_asc'
  | 'dimension_asc'
  | 'dimension_desc';

export interface SalesFilterParams {
  start_date?: string;
  end_date?: string;
  category?: string;
  categories?: string[];
  marketplace?: string;
  marketplaces?: string[];
  order_status?: string;
  order_statuses?: string[];
  payment_status?: string;
  payment_statuses?: string[];
  customer?: string;
  customers?: string[];
  item?: string;
  items?: string[];
}

export interface QuerySalesMetricsArgs {
  metrics?: SalesMetric[];
  dimensions?: SalesDimension[];
  filters?: SalesFilterParams;
  order_by?: MetricSortOrder;
  limit?: number;
  chart_title?: string;
  include_chart?: boolean;
}

export interface ChartSpec {
  type: ChartType;
  title: string;
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  dataKeys: string[];
}

export interface QueryMetricsResult {
  data: Array<Record<string, unknown>>;
  rowCount: number;
  chartSpec: ChartSpec;
  source: 'postgres_rpc' | 'snapshot_fallback';
}

export interface SalesInsightData {
  totalOrders: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  averageOrderValue: number;
  topCategories: Array<{
    name: string;
    revenue: number;
    profit: number;
    margin: number;
    orders: number;
  }>;
  topStores: Array<{
    name: string;
    revenue: number;
    profit: number;
    margin: number;
    orders: number;
  }>;
  recentPeriods: Array<{
    period: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
  }>;
}

