/**
 * Category, Store (marketplace), Payment Method, Order Status and Payment Status are
 * user-defined options stored per account (see `sales_options`), so sales rows hold
 * them as plain text. An empty string means "not set".
 */
export interface SaleItem {
  id: string;
  user_id?: string;
  quantity: number;
  item: string;
  category: string;
  marketplace: string;
  payment_method: string;
  customer: string;
  date: string; // YYYY-MM-DD
  subtotal: number;
  cost: number;
  sales: number; // Subtotal - Cost
  order_status: string;
  payment_status: string;
  invoice_url?: string | null;
  invoice_name?: string | null;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  created_at?: string;
}

export const VIEW_MODES = ['table', 'chart', 'timeline', 'map', 'board'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export function isViewMode(value: string): value is ViewMode {
  return (VIEW_MODES as readonly string[]).includes(value);
}

export type SortField = 'date' | 'item' | 'quantity' | 'subtotal' | 'cost' | 'sales' | 'customer' | 'category' | 'marketplace';
export type SortOrder = 'asc' | 'desc';
