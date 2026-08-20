"use client";

import { useState, useMemo } from 'react';
import type { FC, DragEvent } from 'react';
import { Plus, User, ShoppingBag, Calendar } from 'lucide-react';
import type { SaleItem, StoreType, SortField, SortOrder } from '@/types/sales';
import { TagPill } from './TagPill';
import { NotionFilterBar } from './NotionFilterBar';
import { filterSales, type FilterState } from '@/lib/sales/filterUtils';

interface KanbanBoardViewProps {
  sales: SaleItem[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortField?: SortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: SortField, order: SortOrder) => void;
  onSelectSale: (sale: SaleItem) => void;
  onOpenNewSale: (defaultStore?: StoreType | string) => void;
  onUpdateStore?: (saleId: string, newStore: StoreType | string) => Promise<void>;
}

interface ColumnConfig {
  id: StoreType;
  label: string;
  dotColor: string;
  badgeBg: string;
  borderAccent: string;
  headerBg: string;
}

const STORE_COLUMNS: ColumnConfig[] = [
  {
    id: 'Shopee',
    label: 'Shopee',
    dotColor: 'bg-orange-500',
    badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    borderAccent: 'hover:border-orange-500/40',
    headerBg: 'bg-orange-50/50 dark:bg-orange-950/20',
  },
  {
    id: 'Carousell',
    label: 'Carousell',
    dotColor: 'bg-red-500',
    badgeBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    borderAccent: 'hover:border-red-500/40',
    headerBg: 'bg-red-50/50 dark:bg-red-950/20',
  },
];

export const KanbanBoardView: FC<KanbanBoardViewProps> = ({
  sales,
  filters,
  onFiltersChange,
  sortField: propSortField = 'sales',
  sortOrder: propSortOrder = 'desc',
  onSortChange,
  onSelectSale,
  onOpenNewSale,
  onUpdateStore,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<StoreType | null>(null);

  const [internalSortField, setInternalSortField] = useState<SortField>(propSortField);
  const [internalSortOrder, setInternalSortOrder] = useState<SortOrder>(propSortOrder);

  const sortField = propSortField ?? internalSortField;
  const sortOrder = propSortOrder ?? internalSortOrder;

  const setSort = (field: SortField, order: SortOrder) => {
    if (onSortChange) {
      onSortChange(field, order);
    } else {
      setInternalSortField(field);
      setInternalSortOrder(order);
    }
  };

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

  // Single-pass column grouping and total aggregation
  const storeColumnData = useMemo(() => {
    const data: Record<StoreType, { sales: SaleItem[]; total: number }> = {
      Shopee: { sales: [], total: 0 },
      Carousell: { sales: [], total: 0 },
    };

    for (let i = 0; i < filteredAndSortedSales.length; i++) {
      const s = filteredAndSortedSales[i];
      const mp = (s.marketplace || '').trim().toLowerCase();
      if (mp === 'shopee') {
        data.Shopee.sales.push(s);
        data.Shopee.total += s.sales || 0;
      } else if (mp === 'carousell') {
        data.Carousell.sales.push(s);
        data.Carousell.total += s.sales || 0;
      }
    }

    return data;
  }, [filteredAndSortedSales]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, saleId: string) => {
    e.dataTransfer.setData('text/plain', saleId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(saleId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, colId: StoreType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only reset if leaving column container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverCol(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, colId: StoreType) => {
    e.preventDefault();
    setDragOverCol(null);
    const saleId = e.dataTransfer.getData('text/plain') || draggedId;
    if (saleId && onUpdateStore) {
      const targetSale = sales.find((s) => s.id === saleId);
      if (targetSale && targetSale.marketplace !== colId) {
        await onUpdateStore(saleId, colId);
      }
    }
    setDraggedId(null);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notion Filter & Sort Toolbar for Board View */}
      <NotionFilterBar
        storageKeyPrefix="board"
        salesCount={sales.length}
        filteredCount={filteredAndSortedSales.length}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onOpenNewSale={(defaultStore) => onOpenNewSale(defaultStore)}
      />

      {/* 2-Column Store Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
        {STORE_COLUMNS.map((col) => {
          const colInfo = storeColumnData[col.id] || { sales: [], total: 0 };
          const colSales = colInfo.sales;
          const colTotal = colInfo.total;
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-xl bg-neutral-100/60 dark:bg-[#1f1f1f]/80 border transition-all duration-200 p-4 min-h-[550px] max-h-[800px] shadow-xs ${
                isOver
                  ? 'border-blue-500/80 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                  : 'border-neutral-200/80 dark:border-neutral-800'
              }`}
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 ${col.headerBg}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} shadow-xs`} />
                  <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {col.label}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${col.badgeBg}`}>
                    {colSales.length} {colSales.length === 1 ? 'sale' : 'sales'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    RM {colTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Total Profit</p>
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colSales.length === 0 ? (
                  <div className="py-16 px-4 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3">
                    <ShoppingBag className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      No orders in {col.label}
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      Drag orders here or add a new order.
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

                        {/* Pills: Category + Order Status */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <TagPill text={sale.category} type="category" className="text-[10px]" />
                          <TagPill text={sale.order_status} type="order_status" className="text-[10px]" />
                          {sale.payment_status && (
                            <TagPill text={sale.payment_status} type="payment_status" className="text-[10px]" />
                          )}
                        </div>

                        {/* Customer & Profit Row */}
                        <div className="flex justify-between items-center text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-[11px] truncate max-w-[180px]">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{sale.customer}</span>
                            {sale.date && (
                              <>
                                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                <span className="flex items-center gap-0.5 text-[10px] text-neutral-400">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {formatDate(sale.date)}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            RM {sale.sales.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Column Footer Button */}
              <button
                onClick={() => onOpenNewSale(col.id)}
                className="mt-3 py-2 w-full text-center text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800/80 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-neutral-400" />
                <span>New order in {col.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
