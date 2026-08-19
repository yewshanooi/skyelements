"use client";

import type { LucideIcon } from 'lucide-react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Percent,
  Sparkles,
  ShoppingBag,
  Package,
  Layers,
  Tag,
  Users,
  Award,
  Boxes,
  ArrowUpRight,
} from 'lucide-react';

// =========================================================================
// Widget Dashboard Layout Types & Constants
// =========================================================================
export type WidgetWidth = '1/4' | '2/4' | '3/4' | '4/4';

export const ALL_WIDGET_WIDTHS: WidgetWidth[] = ['1/4', '2/4', '3/4', '4/4'];

export type WidgetCategory = 'overview' | 'revenue' | 'breakdown' | 'customers' | 'operations';

export interface WidgetConfig {
  id: string;
  title: string;
  subtitle?: string;
  category: WidgetCategory;
  description: string;
  icon: LucideIcon;
  defaultWidth: WidgetWidth;
  allowedWidths?: WidgetWidth[];
  isEssential?: boolean;
}

export interface WidgetLayoutState {
  order: string[]; // List of widget IDs in order
  widths: Record<string, WidgetWidth>; // Widget ID -> width
  hidden: Record<string, boolean>; // Widget ID -> isHidden
}

export const WIDTH_COL_SPAN_CLASS: Record<WidgetWidth, string> = {
  '1/4': 'col-span-12 md:col-span-6 xl:col-span-3',
  '2/4': 'col-span-12 lg:col-span-6',
  '3/4': 'col-span-12 lg:col-span-9',
  '4/4': 'col-span-12',
};

export const WIDTH_LABELS: Record<WidgetWidth, string> = {
  '1/4': '1/4 Width',
  '2/4': '2/4 Width',
  '3/4': '3/4 Width',
  '4/4': '4/4 Width',
};

export const WIDTH_SHORT_LABELS: Record<WidgetWidth, string> = {
  '1/4': '1/4',
  '2/4': '2/4',
  '3/4': '3/4',
  '4/4': '4/4',
};

export const normalizeWidgetWidth = (w: unknown, fallback: WidgetWidth = '4/4'): WidgetWidth => {
  if (w === '1/4' || w === 'third' || w === 'fourth') return '1/4';
  if (w === '2/4' || w === 'half') return '2/4';
  if (w === '3/4' || w === 'two-thirds' || w === 'three-fourths') return '3/4';
  if (w === '4/4' || w === 'full') return '4/4';
  return fallback;
};

// Harmonious Notion & Databricks inspired palette
export const CHART_PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#64748b', // Slate
];

// =========================================================================
// KPI Metrics Matrix Types & Definitions
// =========================================================================
export type KpiCardId =
  | 'net_profit'
  | 'gross_revenue'
  | 'total_cost'
  | 'profit_margin'
  | 'roi'
  | 'total_orders'
  | 'items_sold'
  | 'avg_order_value'
  | 'avg_price_per_item'
  | 'unique_buyers'
  | 'avg_profit_per_order'
  | 'items_per_order';

export type KpiCardSize = '1x1' | '2x1' | '3x1';

export interface KpiStats {
  totalSales: number;
  totalSubtotal: number;
  totalCost: number;
  totalUnits: number;
  totalOrders: number;
  profitMargin: string;
  roiPercentage: string;
  avgOrderValue: number;
  avgPricePerItem: number;
  avgProfitPerUnit: string;
  avgProfitPerOrder: number;
  itemsPerOrder: number;
  uniqueCustomersCount: number;
}

export interface KpiCardDefinition {
  id: KpiCardId;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  defaultSize: KpiCardSize;
  getValue: (stats: KpiStats) => string;
  getFullValueTitle: (stats: KpiStats) => string;
  getSubtext: (stats: KpiStats) => { label: string; icon?: LucideIcon; colorClass?: string };
}

const fmtCurrency = (n: number) =>
  `RM ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ALL_KPI_DEFINITIONS: KpiCardDefinition[] = [
  {
    id: 'net_profit',
    title: 'Total Net Profit',
    shortTitle: 'Net Profit',
    description: 'Net realized profit after cost deductions',
    icon: DollarSign,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    defaultSize: '2x1',
    getValue: (s) => fmtCurrency(s.totalSales),
    getFullValueTitle: (s) => fmtCurrency(s.totalSales),
    getSubtext: () => ({ label: 'Realized profit', icon: ArrowUpRight, colorClass: 'text-emerald-600 dark:text-emerald-400 font-medium' }),
  },
  {
    id: 'gross_revenue',
    title: 'Gross Revenue',
    shortTitle: 'Revenue',
    description: 'Total revenue volume generated before costs',
    icon: TrendingUp,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    defaultSize: '2x1',
    getValue: (s) => fmtCurrency(s.totalSubtotal),
    getFullValueTitle: (s) => fmtCurrency(s.totalSubtotal),
    getSubtext: (s) => ({ label: `Cost: RM ${s.totalCost.toFixed(2)}`, colorClass: 'text-neutral-400' }),
  },
  {
    id: 'total_cost',
    title: 'Total Cost',
    shortTitle: 'Cost',
    description: 'Total product purchase and procurement expenditure',
    icon: CreditCard,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    defaultSize: '2x1',
    getValue: (s) => fmtCurrency(s.totalCost),
    getFullValueTitle: (s) => fmtCurrency(s.totalCost),
    getSubtext: () => ({ label: 'Expenditure', colorClass: 'text-neutral-400' }),
  },
  {
    id: 'profit_margin',
    title: 'Profit Margin',
    shortTitle: 'Margin',
    description: 'Net profit percentage relative to gross revenue',
    icon: Percent,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    defaultSize: '1x1',
    getValue: (s) => `${s.profitMargin}%`,
    getFullValueTitle: (s) => `${s.profitMargin}% profit margin`,
    getSubtext: (s) => ({ label: `ROI: ${s.roiPercentage}%`, colorClass: 'text-amber-600 dark:text-amber-400' }),
  },
  {
    id: 'roi',
    title: 'Return on Investment',
    shortTitle: 'ROI',
    description: 'Return on Investment (Net profit divided by total cost)',
    icon: Sparkles,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    defaultSize: '1x1',
    getValue: (s) => `${s.roiPercentage}%`,
    getFullValueTitle: (s) => `${s.roiPercentage}% Return on Investment`,
    getSubtext: () => ({ label: 'Profit / Cost', colorClass: 'text-purple-600 dark:text-purple-400' }),
  },
  {
    id: 'total_orders',
    title: 'Total Orders',
    shortTitle: 'Orders',
    description: 'Total completed sales transactions',
    icon: ShoppingBag,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    defaultSize: '1x1',
    getValue: (s) => `${s.totalOrders.toLocaleString()}`,
    getFullValueTitle: (s) => `${s.totalOrders} processed orders`,
    getSubtext: () => ({ label: 'Transactions', colorClass: 'text-neutral-400' }),
  },
  {
    id: 'items_sold',
    title: 'Items Sold',
    shortTitle: 'Items Sold',
    description: 'Total physical item quantity sold across all orders',
    icon: Package,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    defaultSize: '1x1',
    getValue: (s) => `${s.totalUnits.toLocaleString()}`,
    getFullValueTitle: (s) => `${s.totalUnits} items sold`,
    getSubtext: (s) => ({ label: `${s.totalOrders} orders`, colorClass: 'text-neutral-400' }),
  },
  {
    id: 'avg_order_value',
    title: 'Avg Order Value',
    shortTitle: 'AOV',
    description: 'Average cart revenue per order transaction',
    icon: Layers,
    iconColor: 'text-cyan-500',
    iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    defaultSize: '2x1',
    getValue: (s) => `RM ${s.avgOrderValue.toFixed(2)}`,
    getFullValueTitle: (s) => `RM ${s.avgOrderValue.toFixed(2)} per transaction`,
    getSubtext: () => ({ label: 'Per transaction', colorClass: 'text-neutral-400' }),
  },
  {
    id: 'avg_price_per_item',
    title: 'Avg Price Per Item',
    shortTitle: 'Price / Item',
    description: 'Average selling price per unit sold (Gross Revenue ÷ Units)',
    icon: Tag,
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    defaultSize: '2x1',
    getValue: (s) => `RM ${s.avgPricePerItem.toFixed(2)}`,
    getFullValueTitle: (s) => `RM ${s.avgPricePerItem.toFixed(2)} average price per unit`,
    getSubtext: () => ({ label: 'Revenue / unit', colorClass: 'text-neutral-400' }),
  },
  {
    id: 'unique_buyers',
    title: 'Unique Buyers',
    shortTitle: 'Buyers',
    description: 'Count of distinct customer profiles or accounts',
    icon: Users,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    defaultSize: '2x1',
    getValue: (s) => `${s.uniqueCustomersCount.toLocaleString()}`,
    getFullValueTitle: (s) => `${s.uniqueCustomersCount} unique customers`,
    getSubtext: (s) => ({ label: `RM ${s.avgProfitPerUnit} / item`, colorClass: 'text-neutral-400' }),
  },
  {
    id: 'avg_profit_per_order',
    title: 'Avg Profit Per Order',
    shortTitle: 'Profit / Order',
    description: 'Average realized profit generated per order transaction',
    icon: Award,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    defaultSize: '1x1',
    getValue: (s) => `RM ${s.avgProfitPerOrder.toFixed(2)}`,
    getFullValueTitle: (s) => `RM ${s.avgProfitPerOrder.toFixed(2)} net profit per order`,
    getSubtext: () => ({ label: 'Realized / order', colorClass: 'text-emerald-600 dark:text-emerald-400' }),
  },
  {
    id: 'items_per_order',
    title: 'Items Per Order',
    shortTitle: 'Items / Order',
    description: 'Average item quantity density per transaction basket',
    icon: Boxes,
    iconColor: 'text-sky-500',
    iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    defaultSize: '1x1',
    getValue: (s) => `${s.itemsPerOrder.toFixed(2)}`,
    getFullValueTitle: (s) => `${s.itemsPerOrder.toFixed(2)} items per order`,
    getSubtext: () => ({ label: 'Units / basket', colorClass: 'text-neutral-400' }),
  },
];

export const KPI_CONFIG_MAP = new Map<KpiCardId, KpiCardDefinition>(
  ALL_KPI_DEFINITIONS.map((c) => [c.id, c])
);

export const DEFAULT_KPI_ORDER: KpiCardId[] = [
  'net_profit',
  'gross_revenue',
  'profit_margin',
  'items_sold',
  'avg_order_value',
  'unique_buyers',
  'total_cost',
  'roi',
  'total_orders',
  'avg_price_per_item',
  'avg_profit_per_order',
  'items_per_order',
];

export const DEFAULT_KPI_SIZES: Record<string, KpiCardSize> = Object.fromEntries(
  DEFAULT_KPI_ORDER.map((id) => [id, '1x1'])
);

export const DEFAULT_KPI_HIDDEN: Record<string, boolean> = {
  total_cost: true,
  roi: true,
  total_orders: true,
  avg_price_per_item: true,
  avg_profit_per_order: true,
  items_per_order: true,
};

export interface OverviewKpiLayoutState {
  order: KpiCardId[];
  hidden: Record<string, boolean>;
  sizes: Record<string, KpiCardSize>;
}

export const DEFAULT_OVERVIEW_KPI_LAYOUT: OverviewKpiLayoutState = {
  order: DEFAULT_KPI_ORDER,
  hidden: DEFAULT_KPI_HIDDEN,
  sizes: DEFAULT_KPI_SIZES,
};

export const getCardColSpan = (
  size: KpiCardSize = '1x1',
  currentWidth: string = '4/4',
  isModal: boolean = false
): string => {
  if (isModal || currentWidth === '4/4') {
    if (size === '3x1') return 'col-span-2 sm:col-span-3';
    if (size === '2x1') return 'col-span-2 sm:col-span-2';
    return 'col-span-1';
  }

  if (currentWidth === '3/4' || currentWidth === '2/4') {
    if (size === '3x1') return 'col-span-2 sm:col-span-3';
    if (size === '2x1') return 'col-span-2';
    return 'col-span-1';
  }

  return size === '1x1' ? 'col-span-1' : 'col-span-2';
};

export const MAX_OVERVIEW_ROWS = 3;

export const getCardSpan = (
  id: KpiCardId,
  sizes: Record<string, KpiCardSize> = DEFAULT_KPI_SIZES,
  cols: number = 6
): number => {
  const cardDef = KPI_CONFIG_MAP.get(id);
  const size = sizes[id] || cardDef?.defaultSize || '1x1';
  const span = size === '3x1' ? 3 : size === '2x1' ? 2 : 1;
  return Math.min(span, cols);
};

export const calculateTotalRows = (
  activeCardIds: KpiCardId[],
  sizes: Record<string, KpiCardSize> = DEFAULT_KPI_SIZES,
  cols: number = 6
): number => {
  if (activeCardIds.length === 0) return 0;

  let currentRowUnits = 0;
  let totalRows = 1;

  for (const id of activeCardIds) {
    const span = getCardSpan(id, sizes, cols);
    if (currentRowUnits + span > cols) {
      totalRows += 1;
      currentRowUnits = span;
    } else {
      currentRowUnits += span;
    }
  }

  return totalRows;
};

export const clampLayoutToMaxRows = (
  layout: OverviewKpiLayoutState,
  maxRows: number = MAX_OVERVIEW_ROWS,
  cols: number = 6
): OverviewKpiLayoutState => {
  const activeIds = layout.order.filter((id) => !layout.hidden[id]);
  const currentSizes = layout.sizes || DEFAULT_KPI_SIZES;

  let currentRowUnits = 0;
  let totalRows = activeIds.length > 0 ? 1 : 0;
  const newHidden = { ...layout.hidden };

  for (const id of activeIds) {
    const span = getCardSpan(id, currentSizes, cols);
    if (currentRowUnits + span > cols) {
      if (totalRows + 1 > maxRows) {
        newHidden[id] = true;
        continue;
      }
      totalRows += 1;
      currentRowUnits = span;
    } else {
      currentRowUnits += span;
    }
  }

  return {
    ...layout,
    hidden: newHidden,
  };
};
