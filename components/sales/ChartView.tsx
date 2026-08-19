"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import type { FC, DragEvent as ReactDragEvent } from 'react';
import type { SaleItem } from '@/types/sales';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Layers,
  PieChart as PieIcon,
  RotateCcw,
  Store as StoreIcon,
  CreditCard,
  Truck,
  Users,
  Calendar,
  Award,
  Layers2,
  Sliders,
  Pencil,
  Check,
} from 'lucide-react';
import { NotionFilterBar } from './NotionFilterBar';
import { filterSales, type FilterState, type PropertyType } from '@/lib/sales/filterUtils';
import type {
  WidgetConfig,
  WidgetWidth,
  WidgetLayoutState,
  OverviewKpiLayoutState,
  KpiCardId,
} from './chart/chartTypes';
import {
  ALL_WIDGET_WIDTHS,
  WIDTH_COL_SPAN_CLASS,
  normalizeWidgetWidth,
  DEFAULT_OVERVIEW_KPI_LAYOUT,
  ALL_KPI_DEFINITIONS,
  DEFAULT_KPI_SIZES,
  clampLayoutToMaxRows,
} from './chart/chartTypes';
import { WidgetHeader, CustomizeWidgetsModal, ChartModal } from './chart/ChartControls';
import { OverviewControlCenter } from './chart/OverviewKpiCards';
import {
  computeKpiStats,
  computeTrendData,
  computeDonutData,
  computeCategoryMatrix,
  computeStoreComparison,
  computeTopCustomers,
  computeBasketTiers,
  computePaymentMethods,
  computeFulfillmentData,
  computeDayOfWeekData,
  computeTopProducts,
} from './chart/chartDataUtils';
import { RevenueTrendWidget } from './chart/widgets/RevenueTrendWidget';
import { SalesDonutWidget } from './chart/widgets/SalesDonutWidget';
import { CategoryProfitabilityWidget } from './chart/widgets/CategoryProfitabilityWidget';
import { StoreComparisonWidget } from './chart/widgets/StoreComparisonWidget';
import { TopCustomersWidget } from './chart/widgets/TopCustomersWidget';
import { BasketTiersWidget } from './chart/widgets/BasketTiersWidget';
import { PaymentMethodsWidget } from './chart/widgets/PaymentMethodsWidget';
import { FulfillmentPipelineWidget } from './chart/widgets/FulfillmentPipelineWidget';
import { DayOfWeekWidget } from './chart/widgets/DayOfWeekWidget';
import { TopItemsWidget } from './chart/widgets/TopItemsWidget';

interface ChartViewProps {
  sales: SaleItem[];
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  onResetSearch?: () => void;
}

const STORAGE_KEY_CHART_LAYOUT = 'sales_dashboard_chart_layout_v3';
const STORAGE_KEY_OVERVIEW_KPI_LAYOUT = 'sales_dashboard_overview_kpi_layout_v3';
const DEFAULT_VISIBLE_PROPS: PropertyType[] = ['paymentStatus', 'category', 'date'];

const DEFAULT_FILTERS: FilterState = {
  search: '',
  categories: [],
  stores: [],
  orderStatuses: [],
  paymentStatuses: ['Paid'],
  paymentMethods: [],
  dateRange: 'all',
};

// Widget registry definition
const ALL_WIDGET_CONFIGS: WidgetConfig[] = [
  {
    id: 'kpi_metrics',
    title: 'Overview',
    subtitle: 'Key financial & operational metrics',
    category: 'overview',
    description: 'Summary of profit, revenue, margin, and order metrics.',
    icon: DollarSign,
    defaultWidth: '4/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
    isEssential: true,
  },
  {
    id: 'revenue_trend',
    title: 'Revenue & Profit Trends',
    subtitle: 'Financial performance over time',
    category: 'revenue',
    description: 'Revenue and profit performance over time.',
    icon: TrendingUp,
    defaultWidth: '2/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
  {
    id: 'sales_donut',
    title: 'Sales Distribution',
    subtitle: 'Share of revenue by dimension',
    category: 'breakdown',
    description: 'Sales share by order, category, store, or payment.',
    icon: PieIcon,
    defaultWidth: '2/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
  {
    id: 'category_profitability',
    title: 'Category Profitability',
    subtitle: 'Revenue and profit performance across categories',
    category: 'revenue',
    description: 'Revenue and net profit by category.',
    icon: Layers,
    defaultWidth: '2/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
  {
    id: 'store_comparison',
    title: 'Store Performance',
    subtitle: 'Shopee vs Carousell multichannel breakdown',
    category: 'operations',
    description: 'Shopee vs Carousell performance comparison.',
    icon: StoreIcon,
    defaultWidth: '2/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
  {
    id: 'top_customers',
    title: 'Customer Leaderboard',
    subtitle: 'Top customers by spending and order volume',
    category: 'customers',
    description: 'Top buyers ranked by spending and profit.',
    icon: Users,
    defaultWidth: '2/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
  {
    id: 'basket_tiers',
    title: 'Order Size Distribution',
    subtitle: 'Transaction breakdown by price tier',
    category: 'breakdown',
    description: 'Order volume and revenue by price tier.',
    icon: ShoppingBag,
    defaultWidth: '2/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
  {
    id: 'payment_methods',
    title: 'Payment Methods',
    subtitle: 'Payment method usage and settlement breakdown',
    category: 'operations',
    description: 'Usage and revenue by payment method.',
    icon: CreditCard,
    defaultWidth: '1/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
  {
    id: 'fulfillment_pipeline',
    title: 'Fulfillment Status',
    subtitle: 'Delivery stages and pending orders',
    category: 'operations',
    description: 'Fulfillment completion and delivery stages.',
    icon: Truck,
    defaultWidth: '1/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
  {
    id: 'day_of_week',
    title: 'Sales by Day of Week',
    subtitle: 'Revenue and order volume patterns',
    category: 'operations',
    description: 'Daily revenue and order volume velocity.',
    icon: Calendar,
    defaultWidth: '2/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
  {
    id: 'top_items',
    title: 'Top Orders',
    subtitle: 'Order performance ranked by net profit',
    category: 'breakdown',
    description: 'Top orders ranked by realized profit.',
    icon: Award,
    defaultWidth: '4/4',
    allowedWidths: ALL_WIDGET_WIDTHS,
  },
];

const DEFAULT_LAYOUT: WidgetLayoutState = {
  order: ALL_WIDGET_CONFIGS.map((w) => w.id),
  widths: Object.fromEntries(ALL_WIDGET_CONFIGS.map((w) => [w.id, w.defaultWidth])),
  hidden: {},
};

export const ChartView: FC<ChartViewProps> = ({
  sales,
  filters: propFilters,
  onFiltersChange: propOnFiltersChange,
  onResetSearch,
}) => {
  // Modal & Expansion state
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);

  // Drag and Drop state
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');

  // Interactive Resizing state & refs
  const [resizingWidgetId, setResizingWidgetId] = useState<string | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Overview Mini Cards Customization state
  const [isCustomizingOverviewInModal, setIsCustomizingOverviewInModal] = useState(false);
  const [overviewKpiLayout, setOverviewKpiLayout] = useState<OverviewKpiLayoutState>(() => {
    if (typeof window === 'undefined') return DEFAULT_OVERVIEW_KPI_LAYOUT;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OVERVIEW_KPI_LAYOUT);
      if (stored) {
        const parsed = JSON.parse(stored);
        const registered = ALL_KPI_DEFINITIONS.map((c) => c.id);
        const existing = Array.isArray(parsed.order)
          ? parsed.order.filter((id: KpiCardId) => registered.includes(id))
          : [];
        const missing = registered.filter((id) => !existing.includes(id));
        const finalOrder = [...existing, ...missing] as KpiCardId[];

        return clampLayoutToMaxRows({
          order: finalOrder,
          hidden: parsed.hidden || DEFAULT_OVERVIEW_KPI_LAYOUT.hidden,
          sizes: parsed.sizes || DEFAULT_OVERVIEW_KPI_LAYOUT.sizes || DEFAULT_KPI_SIZES,
        });
      }
    } catch {
      /* ignore storage error */
    }
    return DEFAULT_OVERVIEW_KPI_LAYOUT;
  });

  // Save overview mini cards layout to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_OVERVIEW_KPI_LAYOUT, JSON.stringify(overviewKpiLayout));
    } catch {
      /* ignore storage error */
    }
  }, [overviewKpiLayout]);

  // Widget specific subcontrols persistence
  const [subcontrols, setSubcontrols] = useState<{
    trendGranularity: 'daily' | 'weekly' | 'monthly';
    trendChartType: 'area' | 'bar' | 'line';
    trendMetric: 'all' | 'profit' | 'revenue' | 'cumulative';
    donutBreakdown: 'items' | 'categories' | 'marketplace' | 'payment';
    categorySortBy: 'revenue' | 'profit' | 'margin';
  }>(() => {
    const defaults = {
      trendGranularity: 'monthly' as const,
      trendChartType: 'area' as const,
      trendMetric: 'all' as const,
      donutBreakdown: 'items' as const,
      categorySortBy: 'revenue' as const,
    };
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sales_dashboard_chart_subcontrols_v1');
        if (stored) return { ...defaults, ...JSON.parse(stored) };
      } catch {}
    }
    return defaults;
  });

  const trendGranularity = subcontrols.trendGranularity;
  const setTrendGranularity = (v: 'daily' | 'weekly' | 'monthly' | ((prev: 'daily' | 'weekly' | 'monthly') => 'daily' | 'weekly' | 'monthly')) => {
    setSubcontrols((prev) => ({
      ...prev,
      trendGranularity: typeof v === 'function' ? v(prev.trendGranularity) : v,
    }));
  };

  const trendChartType = subcontrols.trendChartType;
  const setTrendChartType = (v: 'area' | 'bar' | 'line' | ((prev: 'area' | 'bar' | 'line') => 'area' | 'bar' | 'line')) => {
    setSubcontrols((prev) => ({
      ...prev,
      trendChartType: typeof v === 'function' ? v(prev.trendChartType) : v,
    }));
  };

  const trendMetric = subcontrols.trendMetric;
  const setTrendMetric = (v: 'all' | 'profit' | 'revenue' | 'cumulative' | ((prev: 'all' | 'profit' | 'revenue' | 'cumulative') => 'all' | 'profit' | 'revenue' | 'cumulative')) => {
    setSubcontrols((prev) => ({
      ...prev,
      trendMetric: typeof v === 'function' ? v(prev.trendMetric) : v,
    }));
  };

  const donutBreakdown = subcontrols.donutBreakdown;
  const setDonutBreakdown = (v: 'items' | 'categories' | 'marketplace' | 'payment' | ((prev: 'items' | 'categories' | 'marketplace' | 'payment') => 'items' | 'categories' | 'marketplace' | 'payment')) => {
    setSubcontrols((prev) => ({
      ...prev,
      donutBreakdown: typeof v === 'function' ? v(prev.donutBreakdown) : v,
    }));
  };

  const categorySortBy = subcontrols.categorySortBy;
  const setCategorySortBy = (v: 'revenue' | 'profit' | 'margin' | ((prev: 'revenue' | 'profit' | 'margin') => 'revenue' | 'profit' | 'margin')) => {
    setSubcontrols((prev) => ({
      ...prev,
      categorySortBy: typeof v === 'function' ? v(prev.categorySortBy) : v,
    }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('sales_dashboard_chart_subcontrols_v1', JSON.stringify(subcontrols));
    } catch {}
  }, [subcontrols]);

  // Load layout from localStorage or fallback to default
  const [layout, setLayout] = useState<WidgetLayoutState>(() => {
    if (typeof window === 'undefined') return DEFAULT_LAYOUT;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CHART_LAYOUT);
      if (stored) {
        const parsed = JSON.parse(stored);
        const registeredIds = ALL_WIDGET_CONFIGS.map((w) => w.id);
        const existingOrder = Array.isArray(parsed.order)
          ? parsed.order.filter((id: string) => registeredIds.includes(id))
          : [];
        const missingIds = registeredIds.filter((id) => !existingOrder.includes(id));
        const finalOrder = [...existingOrder, ...missingIds];

        const normalizedWidths: Record<string, WidgetWidth> = { ...DEFAULT_LAYOUT.widths };
        if (parsed.widths && typeof parsed.widths === 'object') {
          Object.keys(parsed.widths).forEach((id) => {
            normalizedWidths[id] = normalizeWidgetWidth(parsed.widths[id], DEFAULT_LAYOUT.widths[id] || '4/4');
          });
        }

        return {
          order: finalOrder,
          widths: normalizedWidths,
          hidden: parsed.hidden || {},
        };
      }
    } catch {
      /* ignore storage error */
    }
    return DEFAULT_LAYOUT;
  });

  // Save layout changes to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_CHART_LAYOUT, JSON.stringify(layout));
    } catch {
      /* ignore storage error */
    }
  }, [layout]);

  // Chart Filter state
  const [internalFilters, setInternalFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const filters = propFilters ?? internalFilters;
  const setFilters = (newFilters: FilterState) => {
    if (propOnFiltersChange) {
      propOnFiltersChange(newFilters);
    } else {
      setInternalFilters(newFilters);
    }
  };

  // Filtered dataset
  const filteredSales = useMemo(() => filterSales(sales, filters), [sales, filters]);

  // High-performance single-pass KPI calculations
  const kpiStats = useMemo(() => computeKpiStats(filteredSales), [filteredSales]);

  // Aggregated data memoizations
  const trendData = useMemo(
    () => computeTrendData(filteredSales, trendGranularity),
    [filteredSales, trendGranularity]
  );

  const activeDonutData = useMemo(
    () => computeDonutData(filteredSales, donutBreakdown),
    [filteredSales, donutBreakdown]
  );

  const categoryMatrixData = useMemo(
    () => computeCategoryMatrix(filteredSales, categorySortBy),
    [filteredSales, categorySortBy]
  );

  const storeComparisonData = useMemo(
    () => computeStoreComparison(filteredSales, kpiStats.totalSubtotal, kpiStats.totalSales),
    [filteredSales, kpiStats.totalSubtotal, kpiStats.totalSales]
  );

  const topCustomersData = useMemo(
    () => computeTopCustomers(filteredSales),
    [filteredSales]
  );

  const basketTiersData = useMemo(
    () => computeBasketTiers(filteredSales, kpiStats.totalSubtotal),
    [filteredSales, kpiStats.totalSubtotal]
  );

  const paymentMethodsData = useMemo(
    () => computePaymentMethods(filteredSales, kpiStats.totalSubtotal),
    [filteredSales, kpiStats.totalSubtotal]
  );

  const fulfillmentData = useMemo(
    () => computeFulfillmentData(filteredSales),
    [filteredSales]
  );

  const dayOfWeekData = useMemo(
    () => computeDayOfWeekData(filteredSales),
    [filteredSales]
  );

  const topProductsData = useMemo(
    () => computeTopProducts(filteredSales, kpiStats.totalSales),
    [filteredSales, kpiStats.totalSales]
  );

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    onResetSearch?.();
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: ReactDragEvent<HTMLDivElement>, widgetId: string) => {
    setDraggedWidgetId(widgetId);
    e.dataTransfer.setData('text/plain', widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: ReactDragEvent<HTMLDivElement>, targetWidgetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDragOverWidgetId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    setDragOverWidgetId(targetWidgetId);
    setDropPosition(e.clientX < midX ? 'before' : 'after');
  };

  const handleDragLeave = () => {
    setDragOverWidgetId(null);
  };

  const handleDrop = (e: ReactDragEvent<HTMLDivElement>, targetWidgetId: string) => {
    e.preventDefault();
    const sourceId = draggedWidgetId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetWidgetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    setLayout((prev) => {
      const currentOrder = [...prev.order];
      const sourceIndex = currentOrder.indexOf(sourceId);
      const targetIndex = currentOrder.indexOf(targetWidgetId);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      currentOrder.splice(sourceIndex, 1);
      const newTargetIndex = currentOrder.indexOf(targetWidgetId);
      const insertAt = dropPosition === 'before' ? newTargetIndex : newTargetIndex + 1;
      currentOrder.splice(insertAt, 0, sourceId);

      return { ...prev, order: currentOrder };
    });

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  // Auto-scroll viewport during drag
  const autoScrollRafRef = useRef<number | null>(null);
  const dragClientYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!draggedWidgetId) {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
      dragClientYRef.current = null;
      return;
    }

    const scrollThreshold = 140;
    const maxScrollSpeed = 24;

    const scrollLoop = () => {
      const clientY = dragClientYRef.current;
      if (clientY !== null) {
        const viewportHeight = window.innerHeight;
        if (clientY < scrollThreshold) {
          const intensity = Math.max(0.1, (scrollThreshold - clientY) / scrollThreshold);
          window.scrollBy(0, -Math.max(3, Math.round(intensity * maxScrollSpeed)));
        } else if (clientY > viewportHeight - scrollThreshold) {
          const intensity = Math.max(0.1, (clientY - (viewportHeight - scrollThreshold)) / scrollThreshold);
          window.scrollBy(0, Math.max(3, Math.round(intensity * maxScrollSpeed)));
        }
      }
      autoScrollRafRef.current = requestAnimationFrame(scrollLoop);
    };

    autoScrollRafRef.current = requestAnimationFrame(scrollLoop);

    const handleWindowDragOver = (e: DragEvent) => {
      dragClientYRef.current = e.clientY;
    };

    const handleWindowDragEnd = () => {
      dragClientYRef.current = null;
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
    };

    window.addEventListener('dragover', handleWindowDragOver, { passive: true });
    window.addEventListener('dragend', handleWindowDragEnd);
    window.addEventListener('drop', handleWindowDragEnd);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragend', handleWindowDragEnd);
      window.removeEventListener('drop', handleWindowDragEnd);
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
    };
  }, [draggedWidgetId]);

  // Card Width & Visibility Handlers
  const handleWidthChange = (widgetId: string, width: WidgetWidth) => {
    setLayout((prev) => ({
      ...prev,
      widths: {
        ...prev.widths,
        [widgetId]: width,
      },
    }));
  };

  useEffect(() => {
    if (resizingWidgetId) {
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizingWidgetId]);

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, widget: WidgetConfig) => {
    e.preventDefault();
    e.stopPropagation();

    const cardEl = cardRefs.current.get(widget.id);
    const gridEl = gridContainerRef.current;
    if (!cardEl || !gridEl) return;

    setResizingWidgetId(widget.id);

    const calculateWidthFromPointer = (clientX: number): WidgetWidth => {
      const cardRect = cardEl.getBoundingClientRect();
      const gridRect = gridEl.getBoundingClientRect();
      const currentWidthPx = clientX - cardRect.left;
      const ratio = Math.max(0.05, Math.min(1.0, currentWidthPx / gridRect.width));

      if (ratio >= 0.875) return '4/4';
      if (ratio >= 0.625) return '3/4';
      if (ratio >= 0.375) return '2/4';
      return '1/4';
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const newWidth = calculateWidthFromPointer(moveEvent.clientX);
      setLayout((prev) => {
        if (prev.widths[widget.id] === newWidth) return prev;
        return {
          ...prev,
          widths: { ...prev.widths, [widget.id]: newWidth },
        };
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      cleanup();
      const finalWidth = calculateWidthFromPointer(upEvent.clientX);
      handleWidthChange(widget.id, finalWidth);
      setResizingWidgetId(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleToggleWidget = (widgetId: string) => {
    setLayout((prev) => ({
      ...prev,
      hidden: {
        ...prev.hidden,
        [widgetId]: !prev.hidden[widgetId],
      },
    }));
  };

  const handleResetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    setOverviewKpiLayout(DEFAULT_OVERVIEW_KPI_LAYOUT);
    setIsCustomizeModalOpen(false);
  };

  const handleApplyPreset = (presetKey: string) => {
    if (presetKey === 'all') {
      setLayout(DEFAULT_LAYOUT);
      setOverviewKpiLayout(DEFAULT_OVERVIEW_KPI_LAYOUT);
    } else if (presetKey === 'executive') {
      setLayout({
        order: ['kpi_metrics', 'revenue_trend', 'category_profitability', 'top_items'],
        widths: {
          kpi_metrics: '4/4',
          revenue_trend: '4/4',
          category_profitability: '2/4',
          top_items: '2/4',
        },
        hidden: {
          sales_donut: true,
          store_comparison: true,
          top_customers: true,
          basket_tiers: true,
          payment_methods: true,
          fulfillment_pipeline: true,
          day_of_week: true,
        },
      });
    } else if (presetKey === 'operations') {
      setLayout({
        order: ['kpi_metrics', 'store_comparison', 'fulfillment_pipeline', 'payment_methods', 'day_of_week'],
        widths: {
          kpi_metrics: '4/4',
          store_comparison: '2/4',
          fulfillment_pipeline: '2/4',
          payment_methods: '2/4',
          day_of_week: '2/4',
        },
        hidden: {
          revenue_trend: true,
          sales_donut: true,
          category_profitability: true,
          top_customers: true,
          basket_tiers: true,
          top_items: true,
        },
      });
    } else if (presetKey === 'customer_mix') {
      setLayout({
        order: ['kpi_metrics', 'top_customers', 'basket_tiers', 'sales_donut', 'top_items'],
        widths: {
          kpi_metrics: '4/4',
          top_customers: '2/4',
          basket_tiers: '2/4',
          sales_donut: '2/4',
          top_items: '2/4',
        },
        hidden: {
          revenue_trend: true,
          category_profitability: true,
          store_comparison: true,
          payment_methods: true,
          fulfillment_pipeline: true,
          day_of_week: true,
        },
      });
    }
    setIsCustomizeModalOpen(false);
  };

  const widgetConfigMap = useMemo(() => {
    return new Map(ALL_WIDGET_CONFIGS.map((w) => [w.id, w]));
  }, []);

  const orderedVisibleWidgets = useMemo(() => {
    return layout.order
      .map((id) => widgetConfigMap.get(id))
      .filter((w): w is WidgetConfig => Boolean(w && !layout.hidden[w.id]));
  }, [layout.order, layout.hidden, widgetConfigMap]);

  // Render widget dispatcher
  const renderWidgetContent = (widgetId: string, isModal = false, currentWidth: WidgetWidth = '4/4') => {
    switch (widgetId) {
      case 'kpi_metrics':
        return (
          <OverviewControlCenter
            stats={kpiStats}
            layout={overviewKpiLayout}
            isModal={isModal}
            isEditMode={isModal && isCustomizingOverviewInModal}
            currentWidth={currentWidth}
            onChangeLayout={setOverviewKpiLayout}
            onReset={() => setOverviewKpiLayout(DEFAULT_OVERVIEW_KPI_LAYOUT)}
          />
        );

      case 'revenue_trend':
        return (
          <RevenueTrendWidget
            data={trendData}
            granularity={trendGranularity}
            onGranularityChange={setTrendGranularity}
            chartType={trendChartType}
            onChartTypeChange={setTrendChartType}
            metric={trendMetric}
            onMetricChange={setTrendMetric}
            currentWidth={currentWidth}
            isModal={isModal}
          />
        );

      case 'sales_donut':
        return (
          <SalesDonutWidget
            data={activeDonutData}
            totalSales={kpiStats.totalSales}
            breakdown={donutBreakdown}
            onBreakdownChange={setDonutBreakdown}
            currentWidth={currentWidth}
            isModal={isModal}
          />
        );

      case 'category_profitability':
        return (
          <CategoryProfitabilityWidget
            data={categoryMatrixData}
            sortBy={categorySortBy}
            onSortByChange={setCategorySortBy}
            currentWidth={currentWidth}
            isModal={isModal}
          />
        );

      case 'store_comparison':
        return <StoreComparisonWidget data={storeComparisonData} />;

      case 'top_customers':
        return <TopCustomersWidget data={topCustomersData} isModal={isModal} />;

      case 'basket_tiers':
        return (
          <BasketTiersWidget
            data={basketTiersData}
            currentWidth={currentWidth}
            isModal={isModal}
          />
        );

      case 'payment_methods':
        return <PaymentMethodsWidget data={paymentMethodsData} isModal={isModal} />;

      case 'fulfillment_pipeline':
        return <FulfillmentPipelineWidget data={fulfillmentData} />;

      case 'day_of_week':
        return (
          <DayOfWeekWidget
            data={dayOfWeekData}
            currentWidth={currentWidth}
            isModal={isModal}
          />
        );

      case 'top_items':
        return (
          <TopItemsWidget
            data={topProductsData}
            currentWidth={currentWidth}
            isModal={isModal}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notion Filter Bar with Integrated Card Controls */}
      <NotionFilterBar
        storageKeyPrefix="chart"
        showSort={false}
        showSearch={true}
        showNewButton={false}
        salesCount={sales.length}
        filteredCount={filteredSales.length}
        filters={filters}
        onFiltersChange={setFilters}
        defaultVisibleProps={DEFAULT_VISIBLE_PROPS}
        extraRightActions={
          <button
            type="button"
            onClick={() => setIsCustomizeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 transition-colors cursor-pointer shadow-2xs"
            title="Show, hide, or choose presets for dashboard cards"
          >
            <Sliders className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            <span>Manage Cards</span>
          </button>
        }
      />

      {/* Zero State if no matching filters */}
      {filteredSales.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white dark:bg-[#1f1f1f] border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
          <Layers2 className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            No orders match the selected filters
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Try adjusting your active filters to view metrics and charts.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      ) : (
        /* Re-organizable Grid */
        <div ref={gridContainerRef} className="grid grid-cols-12 gap-5">
          {orderedVisibleWidgets.map((widget) => {
            const currentWidth = layout.widths[widget.id] || widget.defaultWidth;
            const colSpanClass = WIDTH_COL_SPAN_CLASS[currentWidth];
            const isDragging = draggedWidgetId === widget.id;
            const isTarget = dragOverWidgetId === widget.id;
            const isResizing = resizingWidgetId === widget.id;

            return (
              <div
                key={widget.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(widget.id, el);
                  else cardRefs.current.delete(widget.id);
                }}
                onDragOver={(e) => handleDragOver(e, widget.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, widget.id)}
                className={`${colSpanClass} transition-all duration-200 relative group`}
              >
                {/* Drop Indicator Bar */}
                {isTarget && (
                  <div
                    className={`absolute inset-y-0 w-1.5 bg-blue-500 rounded-full z-30 pointer-events-none shadow-md animate-pulse ${
                      dropPosition === 'before' ? '-left-3' : '-right-3'
                    }`}
                  />
                )}

                <div
                  className={`p-5 rounded-xl bg-white dark:bg-[#202020] border shadow-2xs transition-all h-full flex flex-col justify-between relative ${
                    isDragging
                      ? 'opacity-40 border-dashed border-blue-500 scale-[0.98]'
                      : isResizing
                      ? 'border-blue-500 ring-2 ring-blue-500/25 shadow-lg'
                      : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Widget Header with Drag Handle and Actions */}
                    <WidgetHeader
                      widget={widget}
                      onExpand={() => setExpandedWidgetId(widget.id)}
                      onDragStart={(e) => handleDragStart(e, widget.id)}
                      onDragEnd={handleDragEnd}
                    />

                    {/* Widget Body Content with dynamic responsive width */}
                    <div className="flex-1 flex flex-col min-h-0">
                      {renderWidgetContent(widget.id, false, currentWidth)}
                    </div>
                  </div>

                  {/* Bottom Right Corner Resize Grip */}
                  <div
                    onPointerDown={(e) => handleResizeStart(e, widget)}
                    className="absolute right-2 bottom-2 p-1 rounded-md cursor-se-resize flex items-center justify-center text-neutral-300 dark:text-neutral-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors z-20 touch-none select-none"
                    title="Click & drag to resize card width"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="21" y1="9" x2="9" y2="21" />
                      <line x1="21" y1="15" x2="15" y2="21" />
                      <line x1="21" y1="21" x2="21.01" y2="21" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customization / Widget Manager Modal */}
      <CustomizeWidgetsModal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        allWidgets={ALL_WIDGET_CONFIGS}
        hiddenWidgets={layout.hidden}
        onToggleWidget={handleToggleWidget}
        onApplyPreset={handleApplyPreset}
        onResetLayout={handleResetLayout}
      />

      {/* Fullscreen Expand Chart Modal */}
      <ChartModal
        widget={expandedWidgetId ? widgetConfigMap.get(expandedWidgetId) || null : null}
        isOpen={Boolean(expandedWidgetId)}
        onClose={() => {
          setExpandedWidgetId(null);
          setIsCustomizingOverviewInModal(false);
        }}
        headerActions={
          expandedWidgetId === 'kpi_metrics' ? (
            <button
              type="button"
              onClick={() => setIsCustomizingOverviewInModal((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                isCustomizingOverviewInModal
                  ? 'bg-[#2383e2] hover:bg-[#1a6ebd] text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
              title={isCustomizingOverviewInModal ? 'Done customizing' : 'Customize overview metrics'}
            >
              {isCustomizingOverviewInModal ? (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <Pencil className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isCustomizingOverviewInModal ? 'Done' : 'Customize'}
              </span>
            </button>
          ) : undefined
        }
      >
        {expandedWidgetId && renderWidgetContent(expandedWidgetId, true, '4/4')}
      </ChartModal>
    </div>
  );
};
