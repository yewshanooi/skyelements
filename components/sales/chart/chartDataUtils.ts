"use client";

import type { SaleItem } from '@/types/sales';
import type { KpiStats } from './chartTypes';

/**
 * Computes all dashboard KPIs in a single O(N) pass.
 */
export const computeKpiStats = (filteredSales: SaleItem[]): KpiStats => {
  let totalSubtotal = 0;
  let totalSales = 0;
  let totalCost = 0;
  let totalUnits = 0;
  const uniqueCustomers = new Set<string>();

  for (const s of filteredSales) {
    totalSubtotal += s.subtotal || 0;
    totalSales += s.sales || 0;
    totalCost += s.cost || 0;
    totalUnits += s.quantity || 0;
    if (s.customer && s.customer.trim()) {
      uniqueCustomers.add(s.customer.trim().toLowerCase());
    }
  }

  const totalOrders = filteredSales.length;
  const avgOrderValue = totalOrders ? totalSubtotal / totalOrders : 0;
  const profitMargin = totalSubtotal > 0 ? ((totalSales / totalSubtotal) * 100).toFixed(1) : '0';
  const roiPercentage = totalCost > 0 ? ((totalSales / totalCost) * 100).toFixed(1) : '0';
  const avgProfitPerUnit = totalUnits > 0 ? (totalSales / totalUnits).toFixed(2) : '0.00';
  const avgPricePerItem = totalUnits > 0 ? totalSubtotal / totalUnits : 0;
  const avgProfitPerOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
  const itemsPerOrder = totalOrders > 0 ? totalUnits / totalOrders : 0;
  const uniqueCustomersCount = uniqueCustomers.size;

  return {
    totalSales,
    totalSubtotal,
    totalCost,
    totalUnits,
    totalOrders,
    profitMargin,
    roiPercentage,
    avgOrderValue,
    avgPricePerItem,
    avgProfitPerUnit,
    avgProfitPerOrder,
    itemsPerOrder,
    uniqueCustomersCount,
  };
};

export interface TrendDataPoint {
  key: string;
  label: string;
  subtotal: number;
  cost: number;
  profit: number;
  orders: number;
  cumulativeProfit: number;
}

/**
 * Aggregates time-series trend data.
 */
export const computeTrendData = (
  filteredSales: SaleItem[],
  granularity: 'daily' | 'weekly' | 'monthly'
): TrendDataPoint[] => {
  const timeMap = new Map<string, { key: string; label: string; subtotal: number; cost: number; profit: number; orders: number }>();

  filteredSales.forEach((s) => {
    if (!s.date) return;
    let key = s.date.slice(0, 7); // Default Monthly: YYYY-MM
    let label = key;

    if (granularity === 'daily') {
      key = s.date.slice(0, 10); // YYYY-MM-DD
      label = key.slice(5); // MM-DD
    } else if (granularity === 'weekly') {
      const d = new Date(s.date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      key = monday.toISOString().slice(0, 10);
      label = `Wk ${key.slice(5)}`;
    }

    const existing = timeMap.get(key) || {
      key,
      label,
      subtotal: 0,
      cost: 0,
      profit: 0,
      orders: 0,
    };

    existing.subtotal += s.subtotal || 0;
    existing.cost += s.cost || 0;
    existing.profit += s.sales || 0;
    existing.orders += 1;
    timeMap.set(key, existing);
  });

  const sorted = Array.from(timeMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  let runningCumulative = 0;
  return sorted.map((item) => {
    runningCumulative += item.profit;
    return {
      ...item,
      subtotal: Number(item.subtotal.toFixed(2)),
      cost: Number(item.cost.toFixed(2)),
      profit: Number(item.profit.toFixed(2)),
      cumulativeProfit: Number(runningCumulative.toFixed(2)),
    };
  });
};

export interface DonutDataPoint {
  name: string;
  value: number;
}

/**
 * Aggregates donut breakdown data for items, categories, stores, or payment methods.
 */
export const computeDonutData = (
  filteredSales: SaleItem[],
  breakdown: 'items' | 'categories' | 'marketplace' | 'payment'
): DonutDataPoint[] => {
  const map = new Map<string, number>();

  filteredSales.forEach((s) => {
    const key =
      breakdown === 'categories'
        ? s.category || 'Uncategorized'
        : breakdown === 'marketplace'
        ? s.marketplace || 'Other'
        : breakdown === 'payment'
        ? s.payment_method || 'Unspecified'
        : s.item || 'Unknown Item';

    const cur = map.get(key) || 0;
    map.set(key, cur + (s.sales || s.subtotal || 0));
  });

  const arr = Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  if (breakdown === 'items' && arr.length > 10) {
    const top = arr.slice(0, 9);
    const otherVal = arr.slice(9).reduce((sum, i) => sum + i.value, 0);
    return [...top, { name: `${arr.length - 9} other items`, value: Number(otherVal.toFixed(2)) }];
  }

  return arr;
};

export interface CategoryMatrixPoint {
  category: string;
  revenue: number;
  profit: number;
  cost: number;
  orders: number;
  quantity: number;
  margin: number;
}

/**
 * Aggregates category profitability matrix.
 */
export const computeCategoryMatrix = (
  filteredSales: SaleItem[],
  sortBy: 'revenue' | 'profit' | 'margin'
): CategoryMatrixPoint[] => {
  const map = new Map<string, { category: string; revenue: number; profit: number; cost: number; orders: number; quantity: number }>();

  filteredSales.forEach((s) => {
    const cat = s.category || 'Uncategorized';
    const cur = map.get(cat) || {
      category: cat,
      revenue: 0,
      profit: 0,
      cost: 0,
      orders: 0,
      quantity: 0,
    };

    cur.revenue += s.subtotal || 0;
    cur.profit += s.sales || 0;
    cur.cost += s.cost || 0;
    cur.orders += 1;
    cur.quantity += s.quantity || 0;
    map.set(cat, cur);
  });

  const arr = Array.from(map.values()).map((c) => ({
    ...c,
    revenue: Number(c.revenue.toFixed(2)),
    profit: Number(c.profit.toFixed(2)),
    cost: Number(c.cost.toFixed(2)),
    margin: c.revenue > 0 ? Number(((c.profit / c.revenue) * 100).toFixed(1)) : 0,
  }));

  if (sortBy === 'profit') return arr.sort((a, b) => b.profit - a.profit);
  if (sortBy === 'margin') return arr.sort((a, b) => b.margin - a.margin);
  return arr.sort((a, b) => b.revenue - a.revenue);
};

export interface StoreComparisonPoint {
  name: string;
  revenue: number;
  profit: number;
  cost: number;
  orders: number;
  units: number;
  aov: number;
  margin: number;
  revShare: number;
  profitShare: number;
}

/**
 * Aggregates store/marketplace comparison metrics.
 */
export const computeStoreComparison = (
  filteredSales: SaleItem[],
  totalSubtotal: number,
  totalSales: number
): StoreComparisonPoint[] => {
  const map = new Map<string, { name: string; revenue: number; profit: number; cost: number; orders: number; units: number }>();

  filteredSales.forEach((s) => {
    const st = s.marketplace || 'Other';
    const cur = map.get(st) || {
      name: st,
      revenue: 0,
      profit: 0,
      cost: 0,
      orders: 0,
      units: 0,
    };

    cur.revenue += s.subtotal || 0;
    cur.profit += s.sales || 0;
    cur.cost += s.cost || 0;
    cur.orders += 1;
    cur.units += s.quantity || 0;
    map.set(st, cur);
  });

  return Array.from(map.values()).map((s) => ({
    ...s,
    revenue: Number(s.revenue.toFixed(2)),
    profit: Number(s.profit.toFixed(2)),
    cost: Number(s.cost.toFixed(2)),
    aov: s.orders > 0 ? Number((s.revenue / s.orders).toFixed(2)) : 0,
    margin: s.revenue > 0 ? Number(((s.profit / s.revenue) * 100).toFixed(1)) : 0,
    revShare: totalSubtotal > 0 ? Number(((s.revenue / totalSubtotal) * 100).toFixed(1)) : 0,
    profitShare: totalSales > 0 ? Number(((s.profit / totalSales) * 100).toFixed(1)) : 0,
  }));
};

export interface TopCustomerPoint {
  customer: string;
  totalRevenue: number;
  totalProfit: number;
  orders: number;
  aov: number;
  lastDate: string;
  topCategory: string;
}

/**
 * Aggregates customer leaderboard.
 */
export const computeTopCustomers = (filteredSales: SaleItem[]): TopCustomerPoint[] => {
  const map = new Map<string, { customer: string; totalRevenue: number; totalProfit: number; orders: number; lastDate: string; categories: Record<string, number> }>();

  filteredSales.forEach((s) => {
    const cust = s.customer?.trim() || 'Anonymous Buyer';
    const cur = map.get(cust) || {
      customer: cust,
      totalRevenue: 0,
      totalProfit: 0,
      orders: 0,
      lastDate: s.date || '',
      categories: {},
    };

    cur.totalRevenue += s.subtotal || 0;
    cur.totalProfit += s.sales || 0;
    cur.orders += 1;
    if (s.date && (!cur.lastDate || s.date > cur.lastDate)) {
      cur.lastDate = s.date;
    }
    if (s.category) {
      cur.categories[s.category] = (cur.categories[s.category] || 0) + 1;
    }
    map.set(cust, cur);
  });

  return Array.from(map.values())
    .map((c) => {
      let topCat = 'General';
      let maxCount = 0;
      Object.entries(c.categories).forEach(([cat, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topCat = cat;
        }
      });

      return {
        customer: c.customer,
        totalRevenue: Number(c.totalRevenue.toFixed(2)),
        totalProfit: Number(c.totalProfit.toFixed(2)),
        orders: c.orders,
        aov: Number((c.totalRevenue / c.orders).toFixed(2)),
        lastDate: c.lastDate,
        topCategory: topCat,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
};

export interface BasketTierPoint {
  key: string;
  min: number;
  max: number;
  count: number;
  revenue: number;
  profit: number;
  color: string;
  pctOrders: number;
  pctRevenue: number;
}

/**
 * Aggregates basket size tiers.
 */
export const computeBasketTiers = (
  filteredSales: SaleItem[],
  totalSubtotal: number
): BasketTierPoint[] => {
  const tiers = [
    { key: '< RM 50', min: 0, max: 49.99, count: 0, revenue: 0, profit: 0, color: '#3b82f6' },
    { key: 'RM 50 - 100', min: 50, max: 99.99, count: 0, revenue: 0, profit: 0, color: '#10b981' },
    { key: 'RM 100 - 250', min: 100, max: 249.99, count: 0, revenue: 0, profit: 0, color: '#f59e0b' },
    { key: 'RM 250 - 500', min: 250, max: 499.99, count: 0, revenue: 0, profit: 0, color: '#8b5cf6' },
    { key: '> RM 500', min: 500, max: Infinity, count: 0, revenue: 0, profit: 0, color: '#f43f5e' },
  ];

  filteredSales.forEach((s) => {
    const val = s.subtotal || 0;
    for (const t of tiers) {
      if (val >= t.min && val <= t.max) {
        t.count += 1;
        t.revenue += val;
        t.profit += s.sales || 0;
        break;
      }
    }
  });

  const totalOrders = filteredSales.length;
  return tiers.map((t) => ({
    ...t,
    revenue: Number(t.revenue.toFixed(2)),
    profit: Number(t.profit.toFixed(2)),
    pctOrders: totalOrders > 0 ? Number(((t.count / totalOrders) * 100).toFixed(1)) : 0,
    pctRevenue: totalSubtotal > 0 ? Number(((t.revenue / totalSubtotal) * 100).toFixed(1)) : 0,
  }));
};

export interface PaymentMethodPoint {
  method: string;
  count: number;
  revenue: number;
  profit: number;
  avgTicket: number;
  sharePct: number;
}

/**
 * Aggregates payment methods breakdown.
 */
export const computePaymentMethods = (
  filteredSales: SaleItem[],
  totalSubtotal: number
): PaymentMethodPoint[] => {
  const map = new Map<string, { method: string; count: number; revenue: number; profit: number }>();

  filteredSales.forEach((s) => {
    const meth = s.payment_method || 'Unspecified';
    const cur = map.get(meth) || {
      method: meth,
      count: 0,
      revenue: 0,
      profit: 0,
    };
    cur.count += 1;
    cur.revenue += s.subtotal || 0;
    cur.profit += s.sales || 0;
    map.set(meth, cur);
  });

  return Array.from(map.values())
    .map((p) => ({
      ...p,
      revenue: Number(p.revenue.toFixed(2)),
      profit: Number(p.profit.toFixed(2)),
      avgTicket: Number((p.revenue / p.count).toFixed(2)),
      sharePct: totalSubtotal > 0 ? Number(((p.revenue / totalSubtotal) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

export interface FulfillmentPipelineData {
  orderStatuses: Array<{ status: string; count: number; revenue: number; pct: number }>;
  paymentStatuses: Array<{ status: string; count: number; revenue: number; pct: number }>;
  completionRate: string;
  pendingRevenue: number;
}

/**
 * Aggregates fulfillment pipeline and delivery status.
 */
export const computeFulfillmentData = (filteredSales: SaleItem[]): FulfillmentPipelineData => {
  const orderStatusCounts: Record<string, { count: number; revenue: number }> = {
    Delivered: { count: 0, revenue: 0 },
    Shipped: { count: 0, revenue: 0 },
    Processing: { count: 0, revenue: 0 },
  };

  const paymentStatusCounts: Record<string, { count: number; revenue: number }> = {
    Paid: { count: 0, revenue: 0 },
    Processing: { count: 0, revenue: 0 },
    'On Hold': { count: 0, revenue: 0 },
  };

  filteredSales.forEach((s) => {
    const oSt = s.order_status || 'Processing';
    if (!orderStatusCounts[oSt]) orderStatusCounts[oSt] = { count: 0, revenue: 0 };
    orderStatusCounts[oSt].count += 1;
    orderStatusCounts[oSt].revenue += s.subtotal || 0;

    const pSt = s.payment_status || 'Paid';
    if (!paymentStatusCounts[pSt]) paymentStatusCounts[pSt] = { count: 0, revenue: 0 };
    paymentStatusCounts[pSt].count += 1;
    paymentStatusCounts[pSt].revenue += s.subtotal || 0;
  });

  const totalOrders = filteredSales.length;
  const deliveredCount = orderStatusCounts['Delivered']?.count || 0;
  const completionRate = totalOrders > 0 ? ((deliveredCount / totalOrders) * 100).toFixed(1) : '100';

  const pendingRevenue =
    (paymentStatusCounts['Processing']?.revenue || 0) + (paymentStatusCounts['On Hold']?.revenue || 0);

  return {
    orderStatuses: Object.entries(orderStatusCounts).map(([status, d]) => ({
      status,
      count: d.count,
      revenue: Number(d.revenue.toFixed(2)),
      pct: totalOrders > 0 ? Number(((d.count / totalOrders) * 100).toFixed(1)) : 0,
    })),
    paymentStatuses: Object.entries(paymentStatusCounts).map(([status, d]) => ({
      status,
      count: d.count,
      revenue: Number(d.revenue.toFixed(2)),
      pct: totalOrders > 0 ? Number(((d.count / totalOrders) * 100).toFixed(1)) : 0,
    })),
    completionRate,
    pendingRevenue: Number(pendingRevenue.toFixed(2)),
  };
};

export interface DayOfWeekPoint {
  day: string;
  fullDay: string;
  orders: number;
  revenue: number;
  profit: number;
  avgTicket: number;
}

/**
 * Aggregates weekly velocity patterns by day of the week.
 */
export const computeDayOfWeekData = (filteredSales: SaleItem[]): DayOfWeekPoint[] => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = days.map((day, idx) => ({
    day: shortDays[idx],
    fullDay: day,
    orders: 0,
    revenue: 0,
    profit: 0,
  }));

  filteredSales.forEach((s) => {
    if (!s.date) return;
    const d = new Date(s.date);
    const dayIdx = d.getDay();
    if (counts[dayIdx]) {
      counts[dayIdx].orders += 1;
      counts[dayIdx].revenue += s.subtotal || 0;
      counts[dayIdx].profit += s.sales || 0;
    }
  });

  return counts.map((c) => ({
    ...c,
    revenue: Number(c.revenue.toFixed(2)),
    profit: Number(c.profit.toFixed(2)),
    avgTicket: c.orders > 0 ? Number((c.revenue / c.orders).toFixed(2)) : 0,
  }));
};

export interface TopProductPoint {
  item: string;
  category: string;
  units: number;
  revenue: number;
  profit: number;
  margin: number;
  profitShare: number;
}

/**
 * Aggregates top selling products.
 */
export const computeTopProducts = (
  filteredSales: SaleItem[],
  totalSales: number
): TopProductPoint[] => {
  const map = new Map<string, { item: string; category: string; units: number; revenue: number; profit: number }>();

  filteredSales.forEach((s) => {
    const cur = map.get(s.item) || {
      item: s.item,
      category: s.category || 'General',
      units: 0,
      revenue: 0,
      profit: 0,
    };
    cur.units += s.quantity || 1;
    cur.revenue += s.subtotal || 0;
    cur.profit += s.sales || 0;
    map.set(s.item, cur);
  });

  return Array.from(map.values())
    .map((p) => ({
      ...p,
      revenue: Number(p.revenue.toFixed(2)),
      profit: Number(p.profit.toFixed(2)),
      margin: p.revenue > 0 ? Number(((p.profit / p.revenue) * 100).toFixed(1)) : 0,
      profitShare: totalSales > 0 ? Number(((p.profit / totalSales) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.profit - a.profit);
};
