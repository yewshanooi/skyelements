"use client";

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from '@/lib/sales/AuthContext';
import { Header } from '@/components/sales/Header';
import { TableView } from '@/components/sales/TableView';
import { SaleModal } from '@/components/sales/SaleModal';
import { AuthModal } from '@/components/sales/AuthModal';
import { InvoiceViewerModal } from '@/components/sales/InvoiceViewerModal';
import { UnauthenticatedLanding } from '@/components/sales/UnauthenticatedLanding';
import { ErrorBoundary } from '@/components/sales/ErrorBoundary';
import type { SaleItem, ViewMode, StoreType, SortField, SortOrder } from '@/types/sales';
import {
  fetchSalesAction,
  createSaleAction,
  updateSaleAction,
  deleteSaleAction,
  batchDeleteSalesAction,
} from '@/services/sales/salesActions';
import { normalizeCoordinates } from '@/lib/sales/locationParser';
import { evaluateSalesFormula, STORAGE_KEY_FORMULA, DEFAULT_FORMULA } from '@/lib/sales/formulaEngine';
import {
  filterSales,
  parseFiltersFromSearchParams,
  buildSearchParamsFromFilters,
  type FilterState,
} from '@/lib/sales/filterUtils';

const ViewLoading = () => (
  <div className="flex flex-col items-center justify-center py-24 space-y-3">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-muted-foreground font-medium">Loading...</p>
  </div>
);

// Dynamically import heavy and browser-only components
const ChartView = dynamic(
  () => import('@/components/sales/ChartView').then((m) => ({ default: m.ChartView })),
  { ssr: false, loading: () => <ViewLoading /> }
);
const TimelineView = dynamic(
  () => import('@/components/sales/TimelineView').then((m) => ({ default: m.TimelineView })),
  { ssr: false, loading: () => <ViewLoading /> }
);
const MapView = dynamic(
  () => import('@/components/sales/MapView').then((m) => ({ default: m.MapView })),
  { ssr: false, loading: () => <ViewLoading /> }
);
const KanbanBoardView = dynamic(
  () => import('@/components/sales/KanbanBoardView').then((m) => ({ default: m.KanbanBoardView })),
  { ssr: false, loading: () => <ViewLoading /> }
);
const NotionImportModal = dynamic(
  () => import('@/components/sales/NotionImportModal').then((m) => ({ default: m.NotionImportModal })),
  { ssr: false }
);
const AiAssistantDrawer = dynamic(
  () => import('@/components/sales/AiAssistantDrawer').then((m) => ({ default: m.AiAssistantDrawer })),
  { ssr: false }
);

interface DashboardContentProps {
  initialSales?: SaleItem[];
  activeView: ViewMode;
}

function DashboardContent({ initialSales, activeView }: DashboardContentProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sales, setSales] = useState<SaleItem[]>(initialSales || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSales && Boolean(user?.id));
  const [hasInitializedInitialSales, setHasInitializedInitialSales] = useState(
    Boolean(initialSales && initialSales.length > 0)
  );

  // Initialize filter and view options from URL parameters
  const initialUrlState = useMemo(() => {
    return parseFiltersFromSearchParams(searchParams);
  }, [searchParams]);

  const [filters, setFilters] = useState<FilterState>(initialUrlState.filters);
  const [sortField, setSortField] = useState<SortField>(initialUrlState.sortField || 'date');
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialUrlState.sortOrder || 'desc');
  const [timelineYear, setTimelineYear] = useState<number>(
    initialUrlState.year || new Date().getFullYear()
  );
  const [timelineMonth, setTimelineMonth] = useState<number>(
    initialUrlState.month !== undefined ? initialUrlState.month : new Date().getMonth()
  );

  // Synchronize state when URL query parameters change (e.g. browser back/forward or external navigation)
  useEffect(() => {
    const parsed = parseFiltersFromSearchParams(searchParams);
    setFilters(parsed.filters);
    if (parsed.sortField) setSortField(parsed.sortField);
    if (parsed.sortOrder) setSortOrder(parsed.sortOrder);
    if (parsed.year) setTimelineYear(parsed.year);
    if (parsed.month !== undefined) setTimelineMonth(parsed.month);
  }, [searchParams]);

  // Sync filter changes directly to the browser URL
  const syncFiltersToUrl = useCallback(
    (
      nextFilters: FilterState,
      extras?: { sortField?: SortField; sortOrder?: SortOrder; year?: number; month?: number }
    ) => {
      const sp = buildSearchParamsFromFilters(nextFilters, {
        sortField: extras?.sortField ?? sortField,
        sortOrder: extras?.sortOrder ?? sortOrder,
        year: extras?.year ?? timelineYear,
        month: extras?.month ?? timelineMonth,
      });
      const qs = sp.toString();
      const currentPath = pathname || `/sales/${activeView}`;
      const newUrl = `${currentPath}${qs ? `?${qs}` : ''}`;
      window.history.replaceState(null, '', newUrl);
    },
    [pathname, activeView, sortField, sortOrder, timelineYear, timelineMonth]
  );

  // Filter change handlers
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    syncFiltersToUrl(newFilters);
  };

  const handleSortChange = (field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
    syncFiltersToUrl(filters, { sortField: field, sortOrder: order });
  };

  const handleTimelineYearMonthChange = (year: number, month: number) => {
    setTimelineYear(year);
    setTimelineMonth(month);
    syncFiltersToUrl(filters, { year, month });
  };

  const handleSelectTimelineCategory = (category: string) => {
    const updated = {
      ...filters,
      categories: category === 'all' ? [] : [category],
    };
    setFilters(updated);
    syncFiltersToUrl(updated);
  };

  // Debounced search change handler for smooth typing & URL update
  const debounceSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (query: string) => {
    const updated = { ...filters, search: query };
    setFilters(updated);

    if (debounceSearchTimerRef.current) {
      clearTimeout(debounceSearchTimerRef.current);
    }
    debounceSearchTimerRef.current = setTimeout(() => {
      syncFiltersToUrl(updated);
    }, 150);
  };

  // View tab navigation (preserves active URL filters)
  const handleSelectView = (view: ViewMode) => {
    setSelectedIds([]);
    setSelectedMapSale(null);
    const sp = buildSearchParamsFromFilters(filters, {
      sortField,
      sortOrder,
      year: timelineYear,
      month: timelineMonth,
    });
    const qs = sp.toString();
    router.push(`/sales/${view}${qs ? `?${qs}` : ''}`);
  };

  // Modals state
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleItem | null>(null);
  const [defaultStoreForNewSale, setDefaultStoreForNewSale] = useState<StoreType | string | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [invoiceSale, setInvoiceSale] = useState<SaleItem | null>(null);
  const [selectedMapSale, setSelectedMapSale] = useState<SaleItem | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Global keyboard shortcut to toggle AI Copilot (Ctrl+J or Cmd+J)
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsAiOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Fetch sales on mount if not pre-populated
  useEffect(() => {
    let ignore = false;
    if (!user?.id) return;

    if (hasInitializedInitialSales) {
      setHasInitializedInitialSales(false);
      return;
    }

    setIsLoading(true);
    fetchSalesAction()
      .then((data) => {
        if (!ignore) {
          setSales(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load sales data:', err);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [user?.id, hasInitializedInitialSales]);

  // Create or update line item via Server Actions
  const handleSaveSale = async (saleData: Omit<SaleItem, 'id'> | SaleItem) => {
    try {
      if ('id' in saleData && saleData.id) {
        const updated = await updateSaleAction(saleData.id, saleData);
        setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createSaleAction(saleData);
        setSales((prev) => [created, ...prev]);
      }
      setIsSaleModalOpen(false);
      setEditingSale(null);
    } catch (err) {
      console.error('Save sale failed:', err);
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSaleAction(id);
      setSales((prev) => prev.filter((s) => s.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (err) {
      console.error('Delete sale failed:', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (window.confirm(`Are you sure you want to delete ${count} selected order${count > 1 ? 's' : ''}?`)) {
      try {
        await batchDeleteSalesAction(selectedIds);
        setSales((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
        setSelectedIds([]);
      } catch (err) {
        console.error('Batch delete failed:', err);
      }
    }
  };

  const handleUpdateStore = async (saleId: string, newStore: StoreType | string) => {
    try {
      const updated = await updateSaleAction(saleId, { marketplace: newStore });
      setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      console.error('Store update failed:', err);
    }
  };

  const handleUpdateLocation = async (saleId: string, location: string, lat: number, lng: number) => {
    try {
      const norm = normalizeCoordinates(lat, lng);
      const updated = await updateSaleAction(
        saleId,
        { location, latitude: norm ? norm.lat : lat, longitude: norm ? norm.lng : lng }
      );
      setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      console.error('Location update failed:', err);
    }
  };

  const handleOpenEdit = (sale: SaleItem) => {
    setEditingSale(sale);
    setIsSaleModalOpen(true);
  };

  const handleOpenNew = (defaultStore?: StoreType | string) => {
    setEditingSale(null);
    setDefaultStoreForNewSale(defaultStore || '');
    setIsSaleModalOpen(true);
  };

  const handleSelectMapPin = (sale: SaleItem) => {
    setSelectedMapSale(sale);
    handleSelectView('map');
  };

  const handleImportComplete = (newSales: SaleItem[]) => {
    setSales((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const filteredNew = newSales.filter((s) => !existingIds.has(s.id));
      return [...filteredNew, ...prev];
    });
  };

  const handleExportCsv = () => {
    if (sales.length === 0) return;

    const headers = [
      'ID',
      'Quantity',
      'Order',
      'Category',
      'Marketplace',
      'Payment Method',
      'Customer',
      'Date',
      'Subtotal (MYR)',
      'Cost (MYR)',
      'Sales (MYR)',
      'Order Status',
      'Payment Status',
      'Invoice',
      'Location',
      'Latitude',
      'Longitude',
    ];

    const rows = sales.map((s) => [
      s.id,
      s.quantity,
      `"${s.item.replace(/"/g, '""')}"`,
      `"${s.category}"`,
      `"${s.marketplace}"`,
      `"${s.payment_method}"`,
      `"${s.customer}"`,
      s.date,
      s.subtotal,
      s.cost,
      s.sales,
      s.order_status,
      s.payment_status,
      `"${s.invoice_name || ''}"`,
      `"${(s.location || '').replace(/"/g, '""')}"`,
      s.latitude || '',
      s.longitude || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_dashboard_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter sales based on active URL filters
  const filteredSales = useMemo(() => {
    return filterSales(sales, filters);
  }, [sales, filters]);

  const handleUpdateSaleInline = async (saleId: string, updates: Partial<SaleItem>) => {
    try {
      const existing = sales.find((s) => s.id === saleId);
      if (!existing) return;
      const updatedItem: SaleItem = { ...existing, ...updates };

      if ('subtotal' in updates || 'cost' in updates || 'quantity' in updates) {
        if (!('sales' in updates)) {
          const formula = localStorage.getItem(STORAGE_KEY_FORMULA) || DEFAULT_FORMULA;
          updatedItem.sales = evaluateSalesFormula(formula, updatedItem);
        }
      }

      await handleSaveSale(updatedItem);
    } catch (err) {
      console.error('Failed to update sale inline:', err);
    }
  };

  if (!user) {
    return (
      <>
        <UnauthenticatedLanding onOpenAuth={handleOpenAuth} />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultMode={authModalMode}
          redirectTo={`/sales/${activeView}`}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors">
      <Header
        activeView={activeView}
        onSelectView={handleSelectView}
        onOpenAuth={() => handleOpenAuth('login')}
        onExportCsv={handleExportCsv}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenNewSale={handleOpenNew}
        searchQuery={filters.search}
        onSearchChange={handleSearchChange}
        salesCount={sales.length}
        filteredCount={filteredSales.length}
        selectedIdsCount={activeView === 'table' ? selectedIds.length : 0}
        onBatchDelete={handleBatchDelete}
        onDeselectAll={() => setSelectedIds([])}
        onToggleAi={() => setIsAiOpen((prev) => !prev)}
        isAiOpen={isAiOpen}
      />

      <main className="flex-1 px-4 md:px-6 py-4 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Loading...</p>
          </div>
        ) : (
          <ErrorBoundary fallbackTitle="Dashboard View Error">
            {activeView === 'table' && (
              <TableView
                sales={sales}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                sortField={sortField}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                onEditSale={handleOpenEdit}
                onUpdateSale={handleUpdateSaleInline}
                onDeleteSale={handleDelete}
                onOpenNewSale={handleOpenNew}
                onViewInvoice={(sale) => setInvoiceSale(sale)}
                onSelectMapPin={handleSelectMapPin}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onResetSearch={() => handleSearchChange('')}
              />
            )}

            <Suspense fallback={<ViewLoading />}>
              {activeView === 'chart' && (
                <ChartView
                  sales={sales}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onResetSearch={() => handleSearchChange('')}
                />
              )}

              {activeView === 'timeline' && (
                <TimelineView
                  sales={sales}
                  selectedCategory={filters.categories[0] || 'all'}
                  onSelectCategory={handleSelectTimelineCategory}
                  currentYear={timelineYear}
                  currentMonth={timelineMonth}
                  onChangeYearMonth={handleTimelineYearMonthChange}
                  onSelectSale={handleOpenEdit}
                  onOpenNewSale={handleOpenNew}
                />
              )}

              {activeView === 'map' && (
                <MapView
                  sales={sales}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onSelectSale={handleOpenEdit}
                  onOpenNewSale={handleOpenNew}
                  onUpdateSaleLocation={handleUpdateLocation}
                  selectedSalePin={selectedMapSale}
                />
              )}

              {activeView === 'board' && (
                <KanbanBoardView
                  sales={sales}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                  onSelectSale={handleOpenEdit}
                  onOpenNewSale={handleOpenNew}
                  onUpdateStore={handleUpdateStore}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        )}
      </main>

      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setEditingSale(null);
        }}
        onSave={handleSaveSale}
        initialData={editingSale}
        defaultStore={defaultStoreForNewSale}
      />

      <InvoiceViewerModal
        sale={invoiceSale}
        onClose={() => setInvoiceSale(null)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authModalMode}
        redirectTo={`/sales/${activeView}`}
      />

      {isImportModalOpen && (
        <Suspense fallback={null}>
          <NotionImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            userId={user?.id}
            onImportComplete={handleImportComplete}
          />
        </Suspense>
      )}

      {isAiOpen && (
        <Suspense fallback={null}>
          <AiAssistantDrawer
            isOpen={isAiOpen}
            onClose={() => setIsAiOpen(false)}
            sales={sales}
            onCreateSale={async (newSaleData) => {
              const created = await createSaleAction(newSaleData);
              setSales((prev) => [created, ...prev]);
              return created;
            }}
            onUpdateSale={async (saleId, updates) => {
              await handleUpdateSaleInline(saleId, updates);
            }}
            onDeleteSale={handleDelete}
            onSwitchView={(v) => handleSelectView(v)}
            onSetSearch={(query) => handleSearchChange(query)}
          />
        </Suspense>
      )}
    </div>
  );
}

export function SalesClient({
  initialUser,
  initialSales,
  activeView = 'table',
}: {
  initialUser?: User | null;
  initialSales?: SaleItem[];
  activeView?: ViewMode;
}) {
  return (
    <AuthProvider initialUser={initialUser}>
      <DashboardContent initialSales={initialSales} activeView={activeView} />
    </AuthProvider>
  );
}
