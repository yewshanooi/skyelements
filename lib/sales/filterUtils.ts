import type { DateFilterConfig, DateOperator } from '@/components/sales/NotionDatePicker';
import type { SaleItem, SortField, SortOrder } from '@/types/sales';

export type PropertyType = 'category' | 'store' | 'orderStatus' | 'paymentStatus' | 'paymentMethod' | 'date';

export interface FilterState {
  search: string;
  categories: string[];
  stores: string[];
  orderStatuses: string[];
  paymentStatuses: string[];
  paymentMethods: string[];
  dateRange?: string;
  dateFilter?: DateFilterConfig;
}

export const DEFAULT_EMPTY_FILTERS: FilterState = {
  search: '',
  categories: [],
  stores: [],
  orderStatuses: [],
  paymentStatuses: [],
  paymentMethods: [],
  dateRange: 'all',
};

export interface ParsedUrlState {
  filters: FilterState;
  sortField?: SortField;
  sortOrder?: SortOrder;
  year?: number;
  month?: number;
}

/**
 * Splits comma-separated values or returns array of unique non-empty strings.
 */
function parseArrayParam(val: string | string[] | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return Array.from(new Set(val.flatMap((v) => v.split(',').map((s) => s.trim())).filter(Boolean)));
  }
  return Array.from(new Set(val.split(',').map((s) => s.trim()).filter(Boolean)));
}

/**
 * Parses URL search parameters into FilterState and view options.
 * Handles both single & multi-value keys, legacy aliases (store/marketplace, q/search), and date filters.
 */
export function parseFiltersFromSearchParams(
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined> | string | null
): ParsedUrlState {
  if (!searchParams) {
    return { filters: { ...DEFAULT_EMPTY_FILTERS } };
  }

  let getVal: (key: string) => string | string[] | null = () => null;

  if (typeof searchParams === 'string') {
    const sp = new URLSearchParams(searchParams.startsWith('?') ? searchParams.slice(1) : searchParams);
    getVal = (k: string) => {
      const all = sp.getAll(k);
      if (all.length > 1) return all;
      return sp.get(k);
    };
  } else if (typeof (searchParams as URLSearchParams).get === 'function') {
    const sp = searchParams as URLSearchParams;
    getVal = (k: string) => {
      const all = sp.getAll(k);
      if (all.length > 1) return all;
      return sp.get(k);
    };
  } else {
    const obj = searchParams as Record<string, string | string[] | undefined>;
    getVal = (k: string) => {
      const val = obj[k];
      return val !== undefined ? val : null;
    };
  }

  const search = String(getVal('q') || getVal('search') || '').trim();
  const categories = parseArrayParam(getVal('category') || getVal('categories'));
  const stores = parseArrayParam(getVal('store') || getVal('stores') || getVal('marketplace'));
  const orderStatuses = parseArrayParam(getVal('order_status') || getVal('orderStatus') || getVal('order_statuses'));
  const paymentStatuses = parseArrayParam(
    getVal('payment_status') || getVal('paymentStatus') || getVal('payment_statuses')
  );
  const paymentMethods = parseArrayParam(
    getVal('payment_method') || getVal('paymentMethod') || getVal('payment_methods')
  );

  // Date Filter parsing
  const dateOp = (getVal('date_op') || getVal('operator')) as DateOperator | undefined;
  const dateFrom = String(getVal('date_from') || getVal('start_date') || getVal('startDate') || getVal('date') || '').trim();
  const dateTo = String(getVal('date_to') || getVal('end_date') || getVal('endDate') || '').trim();
  const dateRange = String(getVal('date_range') || getVal('dateRange') || 'all').trim();

  let dateFilter: DateFilterConfig | undefined = undefined;
  if (dateOp || dateFrom || dateTo) {
    dateFilter = {
      operator: dateOp || (dateFrom && dateTo ? 'between' : 'exact'),
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    };
  }

  // Sort & Timeline parameters
  const rawSort = String(getVal('sort') || getVal('sort_field') || '').trim();
  const rawOrder = String(getVal('order') || getVal('direction') || '').trim().toLowerCase();
  const rawYear = getVal('year');
  const rawMonth = getVal('month');

  const sortField = (rawSort as SortField) || undefined;
  const sortOrder = (rawOrder === 'asc' || rawOrder === 'desc' ? rawOrder : undefined) as SortOrder | undefined;

  const year = rawYear ? parseInt(String(rawYear), 10) : undefined;
  const month = rawMonth !== null && rawMonth !== undefined ? parseInt(String(rawMonth), 10) : undefined;

  return {
    filters: {
      search,
      categories,
      stores,
      orderStatuses,
      paymentStatuses,
      paymentMethods,
      dateRange: dateRange !== 'all' ? dateRange : undefined,
      dateFilter,
    },
    sortField,
    sortOrder,
    year: isNaN(year!) ? undefined : year,
    month: isNaN(month!) ? undefined : month,
  };
}

/**
 * Builds URLSearchParams cleanly from FilterState, omitting empty values.
 */
export function buildSearchParamsFromFilters(
  filters: FilterState,
  extras?: { sortField?: SortField; sortOrder?: SortOrder; year?: number; month?: number }
): URLSearchParams {
  const sp = new URLSearchParams();

  if (filters.search && filters.search.trim()) {
    sp.set('q', filters.search.trim());
  }

  if (filters.categories && filters.categories.length > 0) {
    sp.set('category', filters.categories.join(','));
  }

  if (filters.stores && filters.stores.length > 0) {
    sp.set('marketplace', filters.stores.join(','));
  }

  if (filters.orderStatuses && filters.orderStatuses.length > 0) {
    sp.set('order_status', filters.orderStatuses.join(','));
  }

  if (filters.paymentStatuses && filters.paymentStatuses.length > 0) {
    sp.set('payment_status', filters.paymentStatuses.join(','));
  }

  if (filters.paymentMethods && filters.paymentMethods.length > 0) {
    sp.set('payment_method', filters.paymentMethods.join(','));
  }

  if (filters.dateFilter) {
    if (filters.dateFilter.operator && filters.dateFilter.operator !== 'between') {
      sp.set('date_op', filters.dateFilter.operator);
    }
    if (filters.dateFilter.startDate) {
      sp.set('date_from', filters.dateFilter.startDate);
    }
    if (filters.dateFilter.endDate) {
      sp.set('date_to', filters.dateFilter.endDate);
    }
  }

  if (filters.dateRange && filters.dateRange !== 'all') {
    sp.set('date_range', filters.dateRange);
  }

  if (extras?.sortField && extras.sortField !== 'date') {
    sp.set('sort', extras.sortField);
  }

  if (extras?.sortOrder && extras.sortOrder !== 'desc') {
    sp.set('order', extras.sortOrder);
  }

  if (extras?.year !== undefined) {
    sp.set('year', String(extras.year));
  }

  if (extras?.month !== undefined) {
    sp.set('month', String(extras.month));
  }

  return sp;
}

/**
 * Returns a URL query string (e.g. "?category=Clothing&q=shirt") or empty string.
 */
export function filtersToQueryString(
  filters: FilterState,
  extras?: { sortField?: SortField; sortOrder?: SortOrder; year?: number; month?: number }
): string {
  const sp = buildSearchParamsFromFilters(filters, extras);
  const str = sp.toString();
  return str ? `?${str}` : '';
}

export function matchesDateFilter(dateStr?: string, dateFilter?: DateFilterConfig, legacyRange?: string): boolean {
  if (dateFilter) {
    const { operator, startDate, endDate } = dateFilter;

    if (operator === 'empty') return !dateStr;
    if (operator === 'not_empty') return Boolean(dateStr);

    if (operator === 'between') {
      if (!startDate && !endDate) return true;
      if (!dateStr) return false;
      const saleDate = dateStr.slice(0, 10);
      if (startDate && endDate) return saleDate >= startDate && saleDate <= endDate;
      if (startDate) return saleDate >= startDate;
      if (endDate) return saleDate <= endDate;
      return true;
    }

    if (!dateStr) return false;
    const saleDate = dateStr.slice(0, 10);

    if (operator === 'exact') return !startDate || saleDate === startDate;
    if (operator === 'before') return !startDate || saleDate < startDate;
    if (operator === 'after') return !startDate || saleDate > startDate;
    if (operator === 'on_or_before') return !startDate || saleDate <= startDate;
    if (operator === 'on_or_after') return !startDate || saleDate >= startDate;

    if (operator === 'relative_today') {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate()
      ).padStart(2, '0')}`;
      return saleDate === todayStr;
    }
  }

  // Legacy preset fallback if used
  if (legacyRange && legacyRange !== 'all') {
    if (!dateStr) return false;
    try {
      const itemDate = new Date(dateStr);
      const now = new Date();
      if (legacyRange === 'this_month') {
        return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
      }
      if (legacyRange === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return itemDate.getFullYear() === lastMonth.getFullYear() && itemDate.getMonth() === lastMonth.getMonth();
      }
      if (legacyRange === 'last_30_days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return itemDate >= past30 && itemDate <= now;
      }
      if (legacyRange === 'last_90_days') {
        const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return itemDate >= past90 && itemDate <= now;
      }
      if (legacyRange === 'this_year') {
        return itemDate.getFullYear() === now.getFullYear();
      }
    } catch {
      return true;
    }
  }

  return true;
}

export function matchesSaleFilter(sale: SaleItem, filters: FilterState): boolean {
  const matchesCategory =
    filters.categories.length === 0 || filters.categories.includes(sale.category);
  const matchesStore =
    filters.stores.length === 0 || filters.stores.includes(sale.marketplace);
  const matchesOrderStatus =
    filters.orderStatuses.length === 0 || filters.orderStatuses.includes(sale.order_status);
  const matchesPaymentStatus =
    filters.paymentStatuses.length === 0 || filters.paymentStatuses.includes(sale.payment_status);
  const matchesPaymentMethod =
    filters.paymentMethods.length === 0 || filters.paymentMethods.includes(sale.payment_method);
  const matchesDate = matchesDateFilter(sale.date, filters.dateFilter, filters.dateRange);

  const query = filters.search.toLowerCase().trim();
  const matchesSearch =
    !query ||
    sale.item.toLowerCase().includes(query) ||
    sale.customer.toLowerCase().includes(query) ||
    sale.marketplace.toLowerCase().includes(query) ||
    Boolean(sale.location && sale.location.toLowerCase().includes(query)) ||
    Boolean(sale.notes && sale.notes.toLowerCase().includes(query));

  return (
    matchesCategory &&
    matchesStore &&
    matchesOrderStatus &&
    matchesPaymentStatus &&
    matchesPaymentMethod &&
    matchesDate &&
    matchesSearch
  );
}

export function filterSales(sales: SaleItem[], filters: FilterState): SaleItem[] {
  return sales.filter((sale) => matchesSaleFilter(sale, filters));
}
