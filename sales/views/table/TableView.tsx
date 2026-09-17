"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import type { FC, ChangeEvent } from 'react';
import {
  FileText,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  Upload,
  X,
  Table as TableIcon,
  RotateCcw,
} from 'lucide-react';
import type { SaleItem, SortField, SortOrder } from '@/sales/types';
import { TagPill } from '@/sales/views/table/TagPill';
import { NotionFilterBar } from '@/sales/filters/NotionFilterBar';
import { filterSales, type FilterState } from '@/sales/lib/filterUtils';
import { formatDateDisplay } from '@/sales/lib/dateUtils';
import { TableOptionPicker } from '@/sales/views/table/TableOptionPicker';
import { TableDatePicker } from '@/sales/views/table/TableDatePicker';
import { FormulaModal } from '@/sales/modals/FormulaModal';
import { evaluateSalesFormula, DEFAULT_FORMULA, STORAGE_KEY_FORMULA } from '@/sales/lib/formulaEngine';
import { TableLocationPicker } from '@/sales/views/table/TableLocationPicker';
import { useAuth } from '@/sales/context/AuthContext';
import { uploadInvoiceFile } from '@/sales/services/salesService';
import { deleteInvoiceFileAction } from '@/sales/services/salesActions';

export type ColumnId =
  | 'select'
  | 'quantity'
  | 'item'
  | 'category'
  | 'marketplace'
  | 'payment_method'
  | 'customer'
  | 'date'
  | 'subtotal'
  | 'cost'
  | 'sales'
  | 'order_status'
  | 'payment_status'
  | 'invoice'
  | 'location'
  | 'actions';

const DEFAULT_COLUMN_WIDTHS: Record<ColumnId, number> = {
  select: 38,
  quantity: 85,
  item: 260,
  category: 160,
  marketplace: 130,
  payment_method: 180,
  customer: 130,
  date: 120,
  subtotal: 140,
  cost: 110,
  sales: 140,
  order_status: 130,
  payment_status: 130,
  invoice: 130,
  location: 180,
  actions: 80,
};

const MIN_COLUMN_WIDTHS: Record<ColumnId, number> = {
  select: 36,
  quantity: 65,
  item: 140,
  category: 100,
  marketplace: 90,
  payment_method: 110,
  customer: 90,
  date: 95,
  subtotal: 100,
  cost: 80,
  sales: 100,
  order_status: 95,
  payment_status: 95,
  invoice: 95,
  location: 110,
  actions: 65,
};

const STORAGE_KEY_COLUMN_WIDTHS = 'sales_dashboard_table_column_widths_v2';

const TABLE_COLUMNS: {
  id: ColumnId;
  label?: string;
  icon?: string;
  sortField?: SortField;
  align?: 'right' | 'center';
  isFormula?: boolean;
}[] = [
  { id: 'select' },
  { id: 'quantity', label: 'Quantity', icon: '123', sortField: 'quantity', align: 'right' },
  { id: 'item', label: 'Order', icon: '📦', sortField: 'item' },
  { id: 'category', label: 'Category', icon: '🗄️', sortField: 'category' },
  { id: 'marketplace', label: 'Store', icon: '🏪', sortField: 'marketplace' },
  { id: 'payment_method', label: 'Payment Method', icon: '💳' },
  { id: 'customer', label: 'Customer', icon: '👤', sortField: 'customer' },
  { id: 'date', label: 'Date', icon: '📅', sortField: 'date' },
  { id: 'subtotal', label: 'Subtotal (in MYR)', icon: '🏷️', sortField: 'subtotal', align: 'right' },
  { id: 'cost', label: 'Cost(s)', icon: '🏷️', sortField: 'cost', align: 'right' },
  { id: 'sales', label: 'Sales (in MYR)', icon: '💰', align: 'right', isFormula: true },
  { id: 'order_status', label: 'Order Status', icon: '🚚' },
  { id: 'payment_status', label: 'Payment Status', icon: '💳' },
  { id: 'invoice', label: 'Invoice', icon: '🧾' },
  { id: 'location', label: 'Location', icon: '📍' },
  { id: 'actions' },
];

interface TableViewProps {
  sales: SaleItem[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortField?: SortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: SortField, order: SortOrder) => void;
  onEditSale: (sale: SaleItem) => void;
  onUpdateSale?: (saleId: string, updates: Partial<SaleItem>) => Promise<void>;
  onDeleteSale: (id: string) => void;
  onViewInvoice: (sale: SaleItem) => void;
  onSelectMapPin?: (sale: SaleItem) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onResetSearch?: () => void;
}

export const TableView: FC<TableViewProps> = ({
  sales,
  filters,
  onFiltersChange,
  sortField: propSortField = 'date',
  sortOrder: propSortOrder = 'desc',
  onSortChange,
  onEditSale,
  onUpdateSale,
  onDeleteSale,
  onViewInvoice,
  onSelectMapPin,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  onResetSearch,
}) => {
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

  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const setSelectedIds = (ids: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(ids);
    } else {
      setInternalSelectedIds(ids);
    }
  };

  // Active cell inline edit state (Excel-like)
  const [editingCell, setEditingCell] = useState<{ saleId: string; field: keyof SaleItem } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Active popover picker state
  const [activeOptionPicker, setActiveOptionPicker] = useState<{
    saleId: string;
    field: 'category' | 'marketplace' | 'order_status' | 'payment_status' | 'payment_method';
  } | null>(null);

  const [activeDatePickerSaleId, setActiveDatePickerSaleId] = useState<string | null>(null);
  const [activeLocationPickerSaleId, setActiveLocationPickerSaleId] = useState<string | null>(null);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [uploadingSaleId, setUploadingSaleId] = useState<string | null>(null);
  const { user } = useAuth();

  // Custom formula state
  const [customFormula, setCustomFormula] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedFormula = localStorage.getItem(STORAGE_KEY_FORMULA);
        if (savedFormula && savedFormula !== 'round( # Subtotal (in MYR) - # Cost(s) , 2)') {
          return savedFormula.replace(/round\(\s+#/g, 'round(#');
        }
      } catch { }
    }
    return DEFAULT_FORMULA;
  });

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Column Resizing state & persistence
  const [columnWidths, setColumnWidths] = useState<Record<ColumnId, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedWidths = localStorage.getItem(STORAGE_KEY_COLUMN_WIDTHS);
        if (storedWidths) {
          const parsed = JSON.parse(storedWidths);
          return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
        }
      } catch { }
    }
    return { ...DEFAULT_COLUMN_WIDTHS };
  });
  const [resizingCol, setResizingCol] = useState<ColumnId | null>(null);
  const dragOccurredRef = useRef(false);

  // Listen to custom formula storage changes
  useEffect(() => {
    const handleStorage = () => {
      const savedFormula = localStorage.getItem(STORAGE_KEY_FORMULA);
      if (savedFormula) {
        setCustomFormula(savedFormula.replace(/round\(\s+#/g, 'round(#'));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Persist column widths
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_COLUMN_WIDTHS, JSON.stringify(columnWidths));
    } catch {
      /* ignore storage error */
    }
  }, [columnWidths]);

  useEffect(() => {
    if (!resizingCol) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingCol]);

  // Track scroll container width so empty state message stays dead-center in visible viewport
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };
    updateWidth();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const resizeRafRef = useRef<number | null>(null);

  const startColumnResize = (startX: number, colId: ColumnId) => {
    dragOccurredRef.current = true;
    const startWidth = columnWidths[colId];
    setResizingCol(colId);

    const onMove = (clientX: number) => {
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = requestAnimationFrame(() => {
        const deltaX = clientX - startX;
        const minW = MIN_COLUMN_WIDTHS[colId] || 50;
        const newWidth = Math.max(minW, Math.round(startWidth + deltaX));
        setColumnWidths((prev) => (prev[colId] === newWidth ? prev : { ...prev, [colId]: newWidth }));
      });
    };

    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX);
    };

    const cleanup = () => {
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      setResizingCol(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', cleanup);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', cleanup);
      window.removeEventListener('touchcancel', cleanup);

      const preventClick = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        clickEvent.preventDefault();
      };
      window.addEventListener('click', preventClick, { capture: true, once: true });
      setTimeout(() => {
        window.removeEventListener('click', preventClick, { capture: true });
        dragOccurredRef.current = false;
      }, 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', cleanup);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', cleanup);
    window.addEventListener('touchcancel', cleanup);
  };

  const handleResetColumnWidth = (e: React.MouseEvent, colId: ColumnId) => {
    e.preventDefault();
    e.stopPropagation();
    setColumnWidths((prev) => ({
      ...prev,
      [colId]: DEFAULT_COLUMN_WIDTHS[colId],
    }));
  };

  const handleResetAllColumnWidths = () => {
    setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS });
  };

  const isAnyColumnResized = useMemo(() => {
    return (Object.keys(DEFAULT_COLUMN_WIDTHS) as ColumnId[]).some(
      (key) => columnWidths[key] !== DEFAULT_COLUMN_WIDTHS[key]
    );
  }, [columnWidths]);

  const totalTableWidth = useMemo(() => {
    return Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
  }, [columnWidths]);

  const renderResizeHandle = (colId: ColumnId) => {
    const isResizing = resizingCol === colId;
    return (
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startColumnResize(e.clientX, colId);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          if (e.touches[0]) startColumnResize(e.touches[0].clientX, colId);
        }}
        onDoubleClick={(e) => handleResetColumnWidth(e, colId)}
        title="Drag to resize column (Double-click to reset)"
        className={`absolute right-0 top-0 bottom-0 w-3 -mr-1.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resizer hover:bg-transparent ${isResizing ? 'pointer-events-auto' : ''
          }`}
      >
        <div
          className={`w-[2px] h-full transition-all duration-150 ${isResizing
            ? 'bg-blue-600 dark:bg-blue-400 scale-x-150 shadow-[0_0_6px_rgba(59,130,246,0.6)]'
            : 'bg-transparent group-hover/resizer:bg-blue-500/80 dark:group-hover/resizer:bg-blue-400/80'
            }`}
        />
      </div>
    );
  };

  const handleSort = (field: SortField) => {
    if (dragOccurredRef.current) return;
    if (sortField === field) {
      setSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field, 'desc');
    }
  };

  // High-performance Schwartzian transform sorting (precomputes sort keys once in O(N))
  const filteredAndSortedSales = useMemo(() => {
    const matched = filterSales(sales, filters);
    if (matched.length <= 1) return matched;

    const mapped = matched.map((sale) => {
      let val: string | number = (sale[sortField] as string | number) ?? '';

      if (sortField === 'sales') {
        val = evaluateSalesFormula(customFormula, sale);
      } else if (sortField === 'date') {
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
  }, [sales, sortField, sortOrder, filters, customFormula]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedSales.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedSales.map((s) => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIdSet.has(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Commit text/number cell edit (Excel-style)
  const handleCommitCell = async (sale: SaleItem, field: keyof SaleItem) => {
    if (!onUpdateSale) {
      setEditingCell(null);
      return;
    }

    let parsedVal: string | number = tempValue;
    if (field === 'quantity') {
      const parsed = parseInt(tempValue, 10);
      parsedVal = isNaN(parsed) ? 0 : Math.max(0, parsed);
    } else if (field === 'subtotal' || field === 'cost' || field === 'sales') {
      parsedVal = parseFloat(tempValue) || 0;
    }

    if (sale[field] !== parsedVal) {
      if (field === 'subtotal' || field === 'cost' || field === 'quantity') {
        const updatedSale = { ...sale, [field]: parsedVal };
        const calculatedSales = evaluateSalesFormula(customFormula, updatedSale);
        await onUpdateSale(sale.id, { [field]: parsedVal, sales: calculatedSales });
      } else {
        await onUpdateSale(sale.id, { [field]: parsedVal });
      }
    }
    setEditingCell(null);
  };

  // Handle invoice file upload directly to Supabase Storage
  const handleUploadInvoiceFile = async (e: ChangeEvent<HTMLInputElement>, sale: SaleItem) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateSale) return;

    if (!user?.id) {
      alert('Please sign in to upload invoices to Supabase Storage.');
      return;
    }

    setUploadingSaleId(sale.id);
    try {
      // If there is an existing invoice file in storage, remove it to avoid orphaned files
      if (sale.invoice_url) {
        await deleteInvoiceFileAction(sale.invoice_url);
      }
      const { url, name } = await uploadInvoiceFile(file, user.id);
      await onUpdateSale(sale.id, {
        invoice_name: name,
        invoice_url: url,
      });
    } catch (err: unknown) {
      console.error('Invoice upload failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to upload invoice';
      alert(`Invoice upload error: ${msg}`);
    } finally {
      setUploadingSaleId(null);
      if (fileInputRefs.current[sale.id]) {
        fileInputRefs.current[sale.id]!.value = '';
      }
    }
  };

  const handleRemoveInvoice = async (e: React.MouseEvent, sale: SaleItem) => {
    e.stopPropagation();
    try {
      if (sale.invoice_url || sale.id) {
        await deleteInvoiceFileAction(sale.invoice_url, sale.id);
      }
      if (onUpdateSale) {
        await onUpdateSale(sale.id, {
          invoice_name: null,
          invoice_url: null,
        });
      }
    } catch (err) {
      console.error('Failed to remove invoice:', err);
    }
  };

  // Optimized single-pass summary metrics calculation
  const { totalSubtotal, totalCost, totalSales, totalQuantity } = useMemo(() => {
    let subtotal = 0;
    let cost = 0;
    let netSales = 0;
    let qty = 0;

    for (let i = 0; i < sales.length; i++) {
      const s = sales[i];
      subtotal += s.subtotal || 0;
      cost += s.cost || 0;
      netSales += evaluateSalesFormula(customFormula, s);
      qty += s.quantity || 0;
    }

    return {
      totalSubtotal: subtotal,
      totalCost: cost,
      totalSales: netSales,
      totalQuantity: qty,
    };
  }, [sales, customFormula]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
    );
  };

  type OptionField = 'category' | 'marketplace' | 'order_status' | 'payment_status' | 'payment_method';

  const renderOptionPickerCell = (sale: SaleItem, field: OptionField) => {
    const isActive = activeOptionPicker?.saleId === sale.id && activeOptionPicker?.field === field;
    const value = sale[field];

    return (
      <td
        key={field}
        onClick={() => setActiveOptionPicker(isActive ? null : { saleId: sale.id, field })}
        className={`px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 relative cursor-pointer hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors select-none ${
          isActive ? 'z-30' : ''
        }`}
      >
        <div className="flex items-center min-h-[22px] w-full min-w-0">
          {value ? <TagPill text={value} type={field} /> : null}
        </div>
        {isActive && (
          <TableOptionPicker
            type={field}
            currentValue={value}
            onSelect={(val) => {
              if (onUpdateSale) onUpdateSale(sale.id, { [field]: val });
              setActiveOptionPicker(null);
            }}
            onClose={() => setActiveOptionPicker(null)}
          />
        )}
      </td>
    );
  };

  const handleResetFilters = () => {
    onFiltersChange({
      search: '',
      categories: [],
      stores: [],
      orderStatuses: [],
      paymentStatuses: [],
      paymentMethods: [],
      dateRange: 'all',
      dateFilter: undefined,
    });
    if (onResetSearch) {
      onResetSearch();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Notion Filter & Sort Toolbar */}
      <NotionFilterBar
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={onFiltersChange}
        isAnyColumnResized={isAnyColumnResized}
        onResetColumnWidths={handleResetAllColumnWidths}
      />

      {/* Notion-style Data Table with Excel-like Inline Editing & Resizable Columns */}
      <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-xl bg-white dark:bg-[#191919] shadow-2xs overflow-hidden">
        <div ref={scrollContainerRef} className="overflow-x-auto rounded-xl touch-scroll-x">
          <table
            className="text-left text-xs border-collapse select-text table-fixed"
            style={{ width: `${totalTableWidth}px`, minWidth: '100%' }}
          >
            {/* Dynamic Column Width Group */}
            <colgroup>
              {(Object.keys(DEFAULT_COLUMN_WIDTHS) as ColumnId[]).map((colId) => (
                <col key={colId} style={{ width: `${columnWidths[colId]}px` }} />
              ))}
            </colgroup>

            {/* Table Header */}
            <thead>
              <tr className="border-b border-neutral-200/80 dark:border-neutral-800 bg-[#fbfbfa] dark:bg-[#1f1f1f] text-neutral-500 dark:text-neutral-400 font-medium h-9">
                {TABLE_COLUMNS.map((col) => {
                  if (col.id === 'select') {
                    return (
                      <th key={col.id} className="px-2 text-center border-r border-neutral-200/60 dark:border-neutral-800 relative select-none">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer mx-auto"
                          title={selectedIds.length > 0 ? 'Deselect all' : 'Select all'}
                        >
                          {selectedIds.length > 0 && selectedIds.length === filteredAndSortedSales.length ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {renderResizeHandle('select')}
                      </th>
                    );
                  }

                  if (col.id === 'actions') {
                    return (
                      <th key={col.id} className="px-2 py-2 text-center whitespace-nowrap relative select-none">
                        {renderResizeHandle('actions')}
                      </th>
                    );
                  }

                  const isClickable = Boolean(col.sortField || col.isFormula);
                  const isRight = col.align === 'right';

                  return (
                    <th
                      key={col.id}
                      onClick={() => {
                        if (dragOccurredRef.current) return;
                        if (col.isFormula) {
                          setIsFormulaModalOpen(true);
                        } else if (col.sortField) {
                          handleSort(col.sortField);
                        }
                      }}
                      className={`px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 whitespace-nowrap relative select-none ${
                        isClickable ? 'cursor-pointer hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40 group' : ''
                      } ${isRight ? 'text-right' : ''}`}
                      title={
                        col.isFormula
                          ? 'Click to edit formula for Sales (in MYR)'
                          : col.sortField
                          ? `Click to sort by ${col.label?.toLowerCase()}`
                          : undefined
                      }
                    >
                      <div className={`flex items-center gap-1.5 overflow-hidden ${isRight ? 'justify-end gap-1' : ''}`}>
                        {col.icon && (
                          <span className={col.icon === '123' ? 'font-mono text-neutral-400' : ''}>
                            {col.icon}
                          </span>
                        )}
                        <span className="truncate">
                          {col.label}
                          {col.isFormula && <span className="text-blue-600 dark:text-blue-400"> 𝑓</span>}
                        </span>
                        {col.sortField && renderSortIcon(col.sortField)}
                      </div>
                      {renderResizeHandle(col.id)}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body with In-Place Excel & Notion Editing */}
            <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/80 font-normal">
              {filteredAndSortedSales.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-0 border-none">
                    <div
                      className="sticky left-0 py-16 px-4 flex flex-col items-center justify-center space-y-3 text-center pointer-events-auto"
                      style={{ width: containerWidth ? `${containerWidth}px` : '100%', maxWidth: '100vw' }}
                    >
                      <TableIcon className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
                      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                        No orders match the selected filters
                      </h3>
                      <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                        Try adjusting your active filters to view orders.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Filters</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedSales.map((sale) => {
                  const isSelected = selectedIdSet.has(sale.id);
                  const isRowActive =
                    activeOptionPicker?.saleId === sale.id ||
                    activeDatePickerSaleId === sale.id ||
                    activeLocationPickerSaleId === sale.id;

                  // Dynamically evaluate formula if custom formula is present
                  const displaySales = evaluateSalesFormula(customFormula, sale);

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-[#202020]/80 transition-colors group ${isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        } ${isRowActive ? 'relative z-30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td
                        onClick={() => toggleSelectRow(sale.id)}
                        className="px-2 py-2 text-center border-r border-neutral-200/60 dark:border-neutral-800 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40"
                      >
                        <div className="flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Square className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                          )}
                        </div>
                      </td>

                      {/* Quantity (Excel-like inline number edit) */}
                      <td
                        onClick={() => {
                          setEditingCell({ saleId: sale.id, field: 'quantity' });
                          setTempValue(sale.quantity > 0 ? String(sale.quantity) : '');
                        }}
                        className="px-3 py-2 font-mono text-right border-r border-neutral-200/60 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-text hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        {editingCell?.saleId === sale.id && editingCell?.field === 'quantity' ? (
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleCommitCell(sale, 'quantity')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitCell(sale, 'quantity');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full max-w-[80px] px-1 py-0.5 text-right font-mono bg-white dark:bg-neutral-900 border border-blue-500 ring-2 ring-blue-500/20 rounded outline-hidden ml-auto block text-xs"
                          />
                        ) : (
                          <div className="w-full flex items-center justify-end min-h-[22px] min-w-0">
                            <span className="truncate">{sale.quantity > 0 ? sale.quantity : '-'}</span>
                          </div>
                        )}
                      </td>

                      {/* Order Description (Excel-like inline text edit + Notion [OPEN] popup button) */}
                      <td
                        onClick={() => {
                          setEditingCell({ saleId: sale.id, field: 'item' });
                          setTempValue(sale.item || '');
                        }}
                        className="px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 font-medium text-neutral-900 dark:text-neutral-100 cursor-text hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors relative group/itemcell"
                      >
                        {editingCell?.saleId === sale.id && editingCell?.field === 'item' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleCommitCell(sale, 'item')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitCell(sale, 'item');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-blue-500 ring-2 ring-blue-500/20 rounded outline-hidden text-xs"
                          />
                        ) : (
                          <div className="flex items-center justify-between gap-1.5 min-w-0 min-h-[22px] w-full">
                            <span className="truncate block font-medium" title={sale.item}>
                              {sale.item}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSale(sale);
                              }}
                              className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover/itemcell:opacity-100 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-[#252525] hover:bg-neutral-100 dark:hover:bg-[#303030] border border-neutral-200/80 dark:border-neutral-700 rounded-md shadow-2xs text-[10px] font-semibold tracking-wider text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 cursor-pointer select-none"
                              title="Open edit order dialog"
                            >
                              <svg
                                className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.2"
                              >
                                <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" />
                                <rect x="9.5" y="2.5" width="5" height="11" rx="0" fill="currentColor" fillOpacity="0.4" stroke="currentColor" />
                              </svg>
                              <span>OPEN</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Category, Store & Payment Method (Notion Option Pickers) */}
                      {renderOptionPickerCell(sale, 'category')}
                      {renderOptionPickerCell(sale, 'marketplace')}
                      {renderOptionPickerCell(sale, 'payment_method')}

                      {/* Customer (Excel-like inline text edit) */}
                      <td
                        onClick={() => {
                          setEditingCell({ saleId: sale.id, field: 'customer' });
                          setTempValue(sale.customer || '');
                        }}
                        className="px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-text hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        {editingCell?.saleId === sale.id && editingCell?.field === 'customer' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleCommitCell(sale, 'customer')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitCell(sale, 'customer');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-blue-500 ring-2 ring-blue-500/20 rounded outline-hidden text-xs"
                          />
                        ) : (
                          <div className="flex items-center min-h-[22px] w-full min-w-0">
                            <span className="truncate block" title={sale.customer}>{sale.customer}</span>
                          </div>
                        )}
                      </td>

                      {/* Date (Notion TableDatePicker) */}
                      <td
                        onClick={() =>
                          setActiveDatePickerSaleId(activeDatePickerSaleId === sale.id ? null : sale.id)
                        }
                        className={`px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap relative cursor-pointer hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors select-none ${activeDatePickerSaleId === sale.id ? 'z-30' : ''
                          }`}
                      >
                        <div className="flex items-center min-h-[22px] w-full min-w-0">
                          <span className="truncate">{formatDateDisplay(sale.date) || '-'}</span>
                        </div>
                        {activeDatePickerSaleId === sale.id && (
                          <TableDatePicker
                            currentDate={sale.date}
                            onSelectDate={(newDate) => {
                              if (onUpdateSale) onUpdateSale(sale.id, { date: newDate });
                              setActiveDatePickerSaleId(null);
                            }}
                            onClose={() => setActiveDatePickerSaleId(null)}
                          />
                        )}
                      </td>

                      {/* Subtotal (Excel-like inline number edit) */}
                      <td
                        onClick={() => {
                          setEditingCell({ saleId: sale.id, field: 'subtotal' });
                          setTempValue(sale.subtotal > 0 ? sale.subtotal.toFixed(2) : '');
                        }}
                        className="px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 font-mono text-right text-neutral-800 dark:text-neutral-200 cursor-text hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        {editingCell?.saleId === sale.id && editingCell?.field === 'subtotal' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleCommitCell(sale, 'subtotal')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitCell(sale, 'subtotal');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full max-w-[100px] px-1 py-0.5 text-right font-mono bg-white dark:bg-neutral-900 border border-blue-500 ring-2 ring-blue-500/20 rounded outline-hidden ml-auto block text-xs"
                          />
                        ) : (
                          <div className="w-full flex items-center justify-end min-h-[22px] min-w-0">
                            <span className="truncate">{sale.subtotal > 0 ? sale.subtotal.toFixed(2) : '-'}</span>
                          </div>
                        )}
                      </td>

                      {/* Cost (Excel-like inline number edit) */}
                      <td
                        onClick={() => {
                          setEditingCell({ saleId: sale.id, field: 'cost' });
                          setTempValue(sale.cost > 0 ? sale.cost.toFixed(2) : '');
                        }}
                        className="px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 font-mono text-right text-neutral-500 dark:text-neutral-400 cursor-text hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        {editingCell?.saleId === sale.id && editingCell?.field === 'cost' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleCommitCell(sale, 'cost')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitCell(sale, 'cost');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full max-w-[100px] px-1 py-0.5 text-right font-mono bg-white dark:bg-neutral-900 border border-blue-500 ring-2 ring-blue-500/20 rounded outline-hidden ml-auto block text-xs"
                          />
                        ) : (
                          <div className="w-full flex items-center justify-end min-h-[22px] min-w-0">
                            <span className="truncate">{sale.cost > 0 ? sale.cost.toFixed(2) : '-'}</span>
                          </div>
                        )}
                      </td>

                      {/* Net Sales (Formula-Driven) */}
                      <td
                        onClick={() => setIsFormulaModalOpen(true)}
                        className="px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 font-mono text-right font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors select-none"
                        title="Click to view or customize formula"
                      >
                        <div className="w-full flex items-center justify-end min-h-[22px] min-w-0">
                          <span className="truncate">{displaySales > 0 ? displaySales.toFixed(2) : '-'}</span>
                        </div>
                      </td>

                      {/* Order Status & Payment Status (Notion Option Pickers) */}
                      {renderOptionPickerCell(sale, 'order_status')}
                      {renderOptionPickerCell(sale, 'payment_status')}

                      {/* Invoice (In-Place File Upload & Remove) */}
                      <td className="px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800">
                        <div className="flex items-center min-h-[22px] max-w-full">
                          {uploadingSaleId === sale.id ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40">
                              <div className="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              <span>Uploading...</span>
                            </div>
                          ) : sale.invoice_name || sale.invoice_url ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 group/inv max-w-full min-w-0">
                              <button
                                onClick={() => onViewInvoice(sale)}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 font-mono text-[11px] truncate cursor-pointer min-w-0"
                                title="View Invoice"
                              >
                                <FileText className="w-3 h-3 text-neutral-400 shrink-0" />
                                <span className="truncate">{sale.invoice_name || 'receipt.pdf'}</span>
                              </button>
                              <button
                                onClick={(e) => handleRemoveInvoice(e, sale)}
                                className="p-0.5 hover:text-red-500 text-neutral-400 opacity-60 group-hover/inv:opacity-100 transition-opacity cursor-pointer shrink-0"
                                title="Remove invoice"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => fileInputRefs.current[sale.id]?.click()}
                              className="cursor-pointer hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 rounded transition-colors -mx-1 px-1 py-0.5 inline-flex items-center min-w-0 max-w-full"
                            >
                              <input
                                type="file"
                                ref={(el) => {
                                  fileInputRefs.current[sale.id] = el;
                                }}
                                onChange={(e) => handleUploadInvoiceFile(e, sale)}
                                className="hidden"
                                accept="image/*,.pdf"
                              />
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer min-w-0"
                                title="Upload invoice"
                              >
                                <Upload className="w-3 h-3 shrink-0" />
                                <span className="truncate">Upload</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Location (Mini-Map & Search Picker) */}
                      <td
                        onClick={() =>
                          setActiveLocationPickerSaleId(
                            activeLocationPickerSaleId === sale.id ? null : sale.id
                          )
                        }
                        className={`px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 relative cursor-pointer hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors select-none ${activeLocationPickerSaleId === sale.id ? 'z-30' : ''
                          }`}
                      >
                        <div className="flex items-center gap-1 max-w-full min-w-0 min-h-[22px] w-full">
                          <MapPin
                            className={`w-3.5 h-3.5 shrink-0 ${sale.location ? 'text-red-500' : 'text-neutral-400'
                              }`}
                          />
                          <span className="truncate text-xs" title={sale.location || 'Pin location'}>
                            {sale.location || '-'}
                          </span>
                        </div>
                        {activeLocationPickerSaleId === sale.id && (
                          <TableLocationPicker
                            sale={sale}
                            onSaveLocation={(loc, lat, lng) => {
                              if (onUpdateSale) {
                                onUpdateSale(sale.id, {
                                  location: loc,
                                  latitude: lat,
                                  longitude: lng,
                                });
                              }
                              setActiveLocationPickerSaleId(null);
                            }}
                            onOpenFullMap={() => {
                              if (onSelectMapPin) onSelectMapPin(sale);
                              setActiveLocationPickerSaleId(null);
                            }}
                            onClose={() => setActiveLocationPickerSaleId(null)}
                          />
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditSale(sale)}
                            className="p-1 text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Edit full modal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${sale.item}"?`)) {
                                onDeleteSale(sale.id);
                              }
                            }}
                            className="p-1 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Summary Aggregations */}
            <tfoot>
              <tr className="border-t-2 border-neutral-200 dark:border-neutral-800 bg-[#fbfbfa] dark:bg-[#1c1c1c] font-semibold text-neutral-800 dark:text-neutral-200 h-10">
                <td className="px-2 text-center border-r border-neutral-200/60 dark:border-neutral-800 text-neutral-400">
                  ∑
                </td>
                <td className="px-3 py-2 text-right border-r border-neutral-200/60 dark:border-neutral-800 font-mono truncate" title={String(totalQuantity)}>
                  {totalQuantity}
                </td>
                <td className="px-3 py-2 border-r border-neutral-200/60 dark:border-neutral-800 text-neutral-500 truncate" title={`Total: ${sales.length} orders`}>
                  Total: {sales.length} orders
                </td>
                <td className="border-r border-neutral-200/60 dark:border-neutral-800"></td>
                <td className="border-r border-neutral-200/60 dark:border-neutral-800"></td>
                <td className="border-r border-neutral-200/60 dark:border-neutral-800"></td>
                <td className="border-r border-neutral-200/60 dark:border-neutral-800"></td>
                <td className="border-r border-neutral-200/60 dark:border-neutral-800 text-neutral-400 text-right pr-2 truncate">
                  SUM
                </td>
                <td className="px-3 py-2 text-right border-r border-neutral-200/60 dark:border-neutral-800 font-mono truncate" title={`RM ${totalSubtotal.toFixed(2)}`}>
                  RM {totalSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-right border-r border-neutral-200/60 dark:border-neutral-800 font-mono text-neutral-500 truncate" title={`RM ${totalCost.toFixed(2)}`}>
                  RM {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-right border-r border-neutral-200/60 dark:border-neutral-800 font-mono text-emerald-600 dark:text-emerald-400 truncate" title={`RM ${totalSales.toFixed(2)}`}>
                  RM {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border-r border-neutral-200/60 dark:border-neutral-800" colSpan={5}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Formula Editor Modal (Screenshot 3) */}
      <FormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        sales={sales}
        currentFormula={customFormula}
        onSaveFormula={(newFormula) => {
          setCustomFormula(newFormula);
          // If onUpdateSale is available, we can also sync the evaluated sales values
          if (onUpdateSale) {
            sales.forEach((s) => {
              const val = evaluateSalesFormula(newFormula, s);
              if (val !== s.sales) {
                onUpdateSale(s.id, { sales: val });
              }
            });
          }
        }}
      />
    </div>
  );
};
