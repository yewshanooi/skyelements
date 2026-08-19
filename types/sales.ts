export type OrderStatus = 'Processing' | 'Shipped' | 'Delivered';
export const ORDER_STATUSES: OrderStatus[] = ['Processing', 'Shipped', 'Delivered'];

export type PaymentStatus = 'On Hold' | 'Processing' | 'Paid';
export const PAYMENT_STATUSES: PaymentStatus[] = ['On Hold', 'Processing', 'Paid'];

export type StoreType = 'Shopee' | 'Carousell';
export const STORE_TYPES: StoreType[] = ['Shopee', 'Carousell'];

export type Category =
  | 'Trading Card Games'
  | 'Gift Cards'
  | 'Virtual Items'
  | 'Virtual Services'
  | 'Collectibles'
  | 'Miniatures'
  | 'Books'
  | 'Electronics';

export const CATEGORIES: Category[] = [
  'Trading Card Games',
  'Gift Cards',
  'Virtual Items',
  'Virtual Services',
  'Collectibles',
  'Miniatures',
  'Books',
  'Electronics',
];

export type PaymentMethod =
  | 'Online Banking'
  | 'E-Wallet'
  | 'E-Wallet - Business'
  | 'Shopee - ShopeePay Balance'
  | 'Shopee - Online Banking'
  | 'Shopee - Apple Pay'
  | 'Shopee - Credit / Debit Card'
  | 'Shopee - Cash Payment at Physical Stores'
  | 'Shopee - Cash on Delivery'
  | 'Shopee - SPayLater';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Online Banking',
  'E-Wallet',
  'E-Wallet - Business',
  'Shopee - ShopeePay Balance',
  'Shopee - Online Banking',
  'Shopee - Apple Pay',
  'Shopee - Credit / Debit Card',
  'Shopee - Cash Payment at Physical Stores',
  'Shopee - Cash on Delivery',
  'Shopee - SPayLater',
];

export interface SaleItem {
  id: string;
  user_id?: string;
  quantity: number;
  item: string;
  category: Category | string;
  marketplace: StoreType | string;
  payment_method: PaymentMethod | string;
  customer: string;
  date: string; // YYYY-MM-DD
  subtotal: number;
  cost: number;
  sales: number; // Subtotal - Cost
  order_status: OrderStatus | string;
  payment_status: PaymentStatus | string;
  invoice_url?: string;
  invoice_name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  created_at?: string;
}

export type ViewMode = 'table' | 'chart' | 'timeline' | 'map' | 'board';

export type SortField = 'date' | 'item' | 'quantity' | 'subtotal' | 'cost' | 'sales' | 'customer' | 'category' | 'marketplace';
export type SortOrder = 'asc' | 'desc';
