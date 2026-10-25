"use client";

import { useState, useMemo, useRef } from 'react';
import type { FC, DragEvent } from 'react';
import { User, ShoppingBag, Calendar } from 'lucide-react';
import type { SaleItem, SortField, SortOrder } from '@/sales/types';
import { TagPill } from '@/sales/views/table/TagPill';
import { NotionFilterBar } from '@/sales/filters/NotionFilterBar';
import { filterSales, hasActiveFilters, type FilterState } from '@/sales/lib/filterUtils';
import { formatDayMonth } from '@/sales/lib/dateUtils';
import { useOptionsStore } from '@/sales/context/OptionsContext';
import { getTagColorHex } from '@/sales/lib/optionTypes';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';

interface KanbanBoardViewProps {
  sales: SaleItem[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortField?: SortField;
  sortOrder?: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
  onSelectSale: (sale: SaleItem) => void;
  onUpdateStore?: (saleId: string, newStore: string) => Promise<void>;
}

interface BoardColumn {
  /** Unique React/drag key. */
  key: string;
  /** Store value written to a sale when it is dropped here ('' = no store). */
  value: string;
  label: string;
  /** Solid accent color derived from the store's saved option color. */
  hex: string;
}

const UNASSIGNED_KEY = '__unassigned__';
const UNASSIGNED_HEX = '#9b9a97';

export const KanbanBoardView: FC<KanbanBoardViewProps> = ({
  sales,
  filters,
  onFiltersChange,
  sortField = 'sales',
  sortOrder = 'desc',
  onSortChange,
  onSelectSale,
  onUpdateStore,
}) => {
  const { getOptionNames, getOptionColor } = useOptionsStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Auto-scroll while dragging so cards can be dropped into columns on rows that are out of view.
  useDragAutoScroll(draggedId !== null, gridRef);

  // High-performance Schwartzian transform sorting (precomputes sort keys once in O(N))
  const filteredAndSortedSales = useMemo(() => {
    const matched = filterSales(sales, filters);
    if (matched.length <= 1) return matched;

    const mapped = matched.map((sale) => {
      let val: string | number = (sale[sortField] as string | number) ?? '';

      if (sortField === 'date') {
        val = sale.date ? new Date(sale.date).getTime() : 0;
        if (isNaN(val)) val = 0;
      } else if (typeof val === 'string') {
        val = val.toLowerCase();
      }

      return { sale, val };
    });

    mapped.sort((a, b) => {
      if (a.val < b.val) return sortOrder === 'asc' ? -1 : 1;
      if (a.val > b.val) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return mapped.map((m) => m.sale);
  }, [sales, sortField, sortOrder, filters]);

  const storeNames = getOptionNames('marketplace');

  // One column per store the user has created, in creation order. Sales with no store (or a store
  // that is no longer in the list) go to an "No store" column so nothing silently disappears.
  const { columns, columnData } = useMemo(() => {
    const data = new Map<string, { sales: SaleItem[]; total: number }>();
    storeNames.forEach((name) => data.set(name, { sales: [], total: 0 }));
    const unassigned = { sales: [] as SaleItem[], total: 0 };

    for (const s of filteredAndSortedSales) {
      const bucket = data.get((s.marketplace || '').trim()) ?? unassigned;
      bucket.sales.push(s);
      bucket.total += s.sales || 0;
    }
    data.set(UNASSIGNED_KEY, unassigned);

    // A Store filter narrows the board to just the selected store columns.
    const visibleStoreNames =
      filters.stores.length > 0 ? storeNames.filter((n) => filters.stores.includes(n)) : storeNames;

    const cols: BoardColumn[] = visibleStoreNames.map((name) => ({
      key: name,
      value: name,
      label: name,
      hex: getTagColorHex(getOptionColor('marketplace', name)),
    }));
    if (unassigned.sales.length > 0) {
      cols.push({ key: UNASSIGNED_KEY, value: '', label: 'No store', hex: UNASSIGNED_HEX });
    }

    return { columns: cols, columnData: data };
  }, [filteredAndSortedSales, storeNames, filters.stores, getOptionColor]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, saleId: string) => {
    e.dataTransfer.setData('text/plain', saleId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(saleId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only reset if leaving column container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverCol(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, col: BoardColumn) => {
    e.preventDefault();
    setDragOverCol(null);
    const saleId = e.dataTransfer.getData('text/plain') || draggedId;
    if (saleId && onUpdateStore) {
      const targetSale = sales.find((s) => s.id === saleId);
      if (targetSale && (targetSale.marketplace || '') !== col.value) {
        await onUpdateStore(saleId, col.value);
      }
    }
    setDraggedId(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Notion Filter & Sort Toolbar for Board View */}
      <NotionFilterBar
        storageKeyPrefix="board"
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

      {/* No stores and nothing to show: a single board-level empty state instead of empty columns */}
      {columns.length === 0 && (
        <div className="min-h-[306px] px-4 flex flex-col items-center justify-center text-center rounded-xl bg-white dark:bg-[#1f1f1f] border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
          <ShoppingBag className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {hasActiveFilters(filters) ? 'No orders match the current filters' : 'No stores available'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {hasActiveFilters(filters)
              ? 'Try adjusting or clearing your filters.'
              : 'Try creating a store when adding a new sale.'}
          </p>
        </div>
      )}

      {/* One column per store, max 2 per row (wraps onto new rows like the Chart grid) */}
      <div
        ref={gridRef}
        className={`grid grid-cols-1 ${columns.length > 1 ? 'md:grid-cols-2' : ''} gap-3.5 sm:gap-5 pb-6`}
      >
        {columns.map((col) => {
          const colInfo = columnData.get(col.key) ?? { sales: [], total: 0 };
          const colSales = colInfo.sales;
          const colTotal = colInfo.total;
          const isOver = dragOverCol === col.key;
          const isUnassignedCol = col.key === UNASSIGNED_KEY;

          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
              className={`flex flex-col min-w-0 rounded-xl bg-neutral-100/60 dark:bg-[#1f1f1f]/80 border transition-all duration-200 p-3 sm:p-4 h-[72vh] min-h-120 max-h-135 md:min-h-130 shadow-xs ${
                isOver
                  ? 'border-blue-500/80 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                  : 'border-neutral-200/80 dark:border-neutral-800'
              }`}
            >
              {/* Column Header */}
              <div
                className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: `${col.hex}1a` }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0"
                    style={{ backgroundColor: col.hex }}
                  />
                  <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {col.label}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 text-neutral-700 dark:text-neutral-300"
                    style={{ backgroundColor: `${col.hex}1a`, borderColor: `${col.hex}40` }}
                  >
                    {colSales.length} {colSales.length === 1 ? 'sale' : 'sales'}
                  </span>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    RM {colTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Total Profit</p>
                </div>
              </div>

              {/* Cards Container */}
              <div
                className={
                  colSales.length === 0
                    ? 'flex-1 flex flex-col min-h-0'
                    : 'flex-1 overflow-y-auto space-y-3 pr-1'
                }
              >
                {colSales.length === 0 ? (
                  <div className="flex-1 w-full py-16 px-4 flex flex-col items-center justify-center text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3">
                    <ShoppingBag className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      No orders in {col.label}
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      Drag to assign orders to this store.
                    </p>
                  </div>
                ) : (
                  colSales.map((sale) => {
                    const isDraggingThis = draggedId === sale.id;

                    return (
                      <div
                        key={sale.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, sale.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectSale(sale)}
                        className={`p-3.5 bg-white dark:bg-[#181818] hover:bg-neutral-50/90 dark:hover:bg-[#232323] border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-2.5 group ${
                          isDraggingThis ? 'opacity-40 scale-98 border-blue-400' : ''
                        }`}
                      >
                        {/* Order Title */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-relaxed">
                            {sale.item}
                          </span>
                          {sale.quantity > 1 && (
                            <span className="shrink-0 text-[10px] font-mono font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                              ×{sale.quantity}
                            </span>
                          )}
                        </div>

                        {/* Pills: Store (only in the "No store" column, for leftover values) + Category + Statuses */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isUnassignedCol && sale.marketplace && (
                            <TagPill text={sale.marketplace} type="marketplace" className="text-[10px]" />
                          )}
                          <TagPill text={sale.category} type="category" className="text-[10px]" />
                          <TagPill text={sale.order_status} type="order_status" className="text-[10px]" />
                          {sale.payment_status && (
                            <TagPill text={sale.payment_status} type="payment_status" className="text-[10px]" />
                          )}
                        </div>

                        {/* Customer Row */}
                        <div className="flex items-center text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-[11px] truncate min-w-0">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{sale.customer}</span>
                            {sale.date && (
                              <>
                                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                <span className="flex items-center gap-0.5 text-[10px] text-neutral-400 shrink-0">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {formatDayMonth(sale.date)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
