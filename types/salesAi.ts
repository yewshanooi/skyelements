import type { SaleItem } from '@/types/sales';

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
  marketplace?: string;
  order_status?: string;
  payment_status?: string;
  customer?: string;
}

export interface QuerySalesMetricsArgs {
  metrics?: SalesMetric[];
  dimensions?: SalesDimension[];
  filters?: SalesFilterParams;
  order_by?: MetricSortOrder;
  limit?: number;
  chart_title?: string;
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

export interface PendingCreateForm {
  initialValues?: Partial<SaleItem>;
  confirmed?: boolean;
  cancelled?: boolean;
}

export interface PendingUpdateForm {
  orderId?: string;
  searchHint?: string;
  initialValues?: Partial<SaleItem>;
  confirmed?: boolean;
  cancelled?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  chartSpec?: ChartSpec;
  createdSale?: SaleItem;
  updatedSale?: {
    item: SaleItem;
    changes: Record<string, { before: unknown; after: unknown }>;
  };
  pendingDelete?: {
    id: string;
    itemName: string;
    customer: string;
    subtotal: number;
    confirmed?: boolean;
    cancelled?: boolean;
  };
  pendingCreateForm?: PendingCreateForm;
  pendingUpdateForm?: PendingUpdateForm;
  actionExecuted?: string;
  error?: boolean;
}

export interface AiServerResponse {
  id: string;
  role: 'model';
  text: string;
  timestamp: number;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  chartSpec?: ChartSpec;
  pendingDelete?: {
    id: string;
    itemName: string;
    customer: string;
    subtotal: number;
  };
  pendingCreateForm?: PendingCreateForm;
  pendingUpdateForm?: PendingUpdateForm;
  actionExecuted?: string;
}
