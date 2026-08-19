"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import type { FC, DragEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Plus,
  Search,
  X,
  Check,
  Calendar,
  Layers,
  ShoppingBag,
  Truck,
  CreditCard,
  GripVertical,
  Building2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import type { SortField, SortOrder } from '@/types/sales';
import { TagPill } from './TagPill';
import { NotionDatePicker } from './NotionDatePicker';
import {
  getOptions,
  reorderOptions,
  subscribeToOptions,
  type OptionType,
} from '@/services/sales/optionsService';
import type { FilterState, PropertyType } from '@/lib/sales/filterUtils';
export type { FilterState, PropertyType } from '@/lib/sales/filterUtils';

interface NotionFilterBarProps {
  storageKeyPrefix?: string;
  showSort?: boolean;
  sortField?: SortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: SortField, order: SortOrder) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  defaultVisibleProps?: PropertyType[];
  isAnyColumnResized?: boolean;
  onResetColumnWidths?: () => void;
  extraRightActions?: React.ReactNode;
  showSearch?: boolean;
  showNewButton?: boolean;
  salesCount?: number;
  filteredCount?: number;
  onOpenNewSale?: (defaultStore?: string) => void;
}

const SORT_FIELD_OPTIONS: { id: SortField; label: string }[] = [
  { id: 'sales', label: 'Sales (in MYR)' },
  { id: 'date', label: 'Date' },
  { id: 'item', label: 'Order' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'subtotal', label: 'Subtotal' },
  { id: 'cost', label: 'Cost' },
  { id: 'customer', label: 'Customer' },
  { id: 'category', label: 'Category' },
  { id: 'marketplace', label: 'Store' },
];

const ALL_FILTER_PROPERTIES: { id: PropertyType; label: string }[] = [
  { id: 'paymentStatus', label: 'Payment Status' },
  { id: 'category', label: 'Category' },
  { id: 'date', label: 'Date' },
  { id: 'store', label: 'Store' },
  { id: 'orderStatus', label: 'Order Status' },
  { id: 'paymentMethod', label: 'Payment Method' },
];

export const NotionFilterBar: FC<NotionFilterBarProps> = ({
  storageKeyPrefix = 'default',
  showSort = true,
  sortField = 'date',
  sortOrder = 'desc',
  onSortChange,
  filters,
  onFiltersChange,
  defaultVisibleProps = ['category', 'paymentStatus'],
  isAnyColumnResized = false,
  onResetColumnWidths,
  extraRightActions,
}) => {
  // Popover states
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [activeFilterPopover, setActiveFilterPopover] = useState<PropertyType | null>(null);
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  
  // Reordering inside filter dropdown state
  const [filterDraggedItem, setFilterDraggedItem] = useState<string | null>(null);
  const [filterDragOverItem, setFilterDragOverItem] = useState<string | null>(null);
  const [filterDropPosition, setFilterDropPosition] = useState<'before' | 'after' | null>(null);

  // Subscribe to live option changes across views/tabs
  const [, setOptionsVersion] = useState(0);
  useEffect(() => {
    return subscribeToOptions(() => {
      setOptionsVersion((v) => v + 1);
    });
  }, []);

  const storageKey = `sales_dashboard_visible_filters_${storageKeyPrefix}_v4`;

  // Active filter pills visible on toolbar
  const [visibleFilterProps, setVisibleFilterProps] = useState<PropertyType[]>(() => {
    const initial = [...defaultVisibleProps];
    if (filters.categories?.length > 0 && !initial.includes('category')) initial.push('category');
    if (filters.stores?.length > 0 && !initial.includes('store')) initial.push('store');
    if (filters.orderStatuses?.length > 0 && !initial.includes('orderStatus')) initial.push('orderStatus');
    if (filters.paymentStatuses?.length > 0 && !initial.includes('paymentStatus')) initial.push('paymentStatus');
    if (filters.paymentMethods?.length > 0 && !initial.includes('paymentMethod')) initial.push('paymentMethod');
    if (
      (filters.dateFilter?.startDate || (filters.dateRange && filters.dateRange !== 'all')) &&
      !initial.includes('date')
    ) {
      initial.push('date');
    }
    return initial;
  });

  const isHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setVisibleFilterProps(JSON.parse(stored));
      }
    } catch {
      /* ignore storage error */
    }
    const timer = setTimeout(() => {
      isHydratedRef.current = true;
    }, 50);
    return () => clearTimeout(timer);
  }, [storageKey]);

  const barRef = useRef<HTMLDivElement>(null);

  // Persist visibleFilterProps to localStorage
  useEffect(() => {
    if (!isHydratedRef.current || typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibleFilterProps));
    } catch {
      /* ignore storage error */
    }
  }, [visibleFilterProps, storageKey]);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
        setActiveFilterPopover(null);
        setIsAddFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute effective visible filter properties derived from state and active filters
  const effectiveVisibleFilterProps = useMemo(() => {
    const set = new Set<PropertyType>(visibleFilterProps);
    if (filters.categories.length > 0) set.add('category');
    if (filters.stores.length > 0) set.add('store');
    if (filters.orderStatuses.length > 0) set.add('orderStatus');
    if (filters.paymentStatuses.length > 0) set.add('paymentStatus');
    if (filters.paymentMethods.length > 0) set.add('paymentMethod');
    if (
      filters.dateFilter?.startDate ||
      filters.dateFilter?.endDate ||
      (filters.dateRange && filters.dateRange !== 'all')
    ) {
      set.add('date');
    }
    return Array.from(set);
  }, [visibleFilterProps, filters]);

  // Available filter properties not yet added to toolbar
  const availableFilterProperties = useMemo(() => {
    return ALL_FILTER_PROPERTIES.filter(
      (prop) => !effectiveVisibleFilterProps.includes(prop.id)
    );
  }, [effectiveVisibleFilterProps]);

  const toggleFilterItem = (type: PropertyType, item: string) => {
    if (type === 'category') {
      const exists = filters.categories.includes(item);
      const next = exists
        ? filters.categories.filter((c) => c !== item)
        : [...filters.categories, item];
      onFiltersChange({ ...filters, categories: next });
    } else if (type === 'store') {
      const exists = filters.stores.includes(item);
      const next = exists
        ? filters.stores.filter((s) => s !== item)
        : [...filters.stores, item];
      onFiltersChange({ ...filters, stores: next });
    } else if (type === 'orderStatus') {
      const exists = filters.orderStatuses.includes(item);
      const next = exists
        ? filters.orderStatuses.filter((s) => s !== item)
        : [...filters.orderStatuses, item];
      onFiltersChange({ ...filters, orderStatuses: next });
    } else if (type === 'paymentStatus') {
      const exists = filters.paymentStatuses.includes(item);
      const next = exists
        ? filters.paymentStatuses.filter((s) => s !== item)
        : [...filters.paymentStatuses, item];
      onFiltersChange({ ...filters, paymentStatuses: next });
    } else if (type === 'paymentMethod') {
      const exists = filters.paymentMethods.includes(item);
      const next = exists
        ? filters.paymentMethods.filter((s) => s !== item)
        : [...filters.paymentMethods, item];
      onFiltersChange({ ...filters, paymentMethods: next });
    }
  };

  const clearFilterType = (type: PropertyType) => {
    if (type === 'category') onFiltersChange({ ...filters, categories: [] });
    if (type === 'store') onFiltersChange({ ...filters, stores: [] });
    if (type === 'orderStatus') onFiltersChange({ ...filters, orderStatuses: [] });
    if (type === 'paymentStatus') onFiltersChange({ ...filters, paymentStatuses: [] });
    if (type === 'paymentMethod') onFiltersChange({ ...filters, paymentMethods: [] });
    if (type === 'date') onFiltersChange({ ...filters, dateFilter: undefined, dateRange: 'all' });
  };

  const removeFilterProp = (type: PropertyType) => {
    clearFilterType(type);
    const updated = visibleFilterProps.filter((p) => p !== type);
    setVisibleFilterProps(updated);
    if (activeFilterPopover === type) setActiveFilterPopover(null);
  };

  const sortFieldLabel = SORT_FIELD_OPTIONS.find((s) => s.id === sortField)?.label || 'Date';

  const getFilterCount = (type: PropertyType) => {
    if (type === 'category') return filters.categories.length;
    if (type === 'store') return filters.stores.length;
    if (type === 'orderStatus') return filters.orderStatuses.length;
    if (type === 'paymentStatus') return filters.paymentStatuses.length;
    if (type === 'paymentMethod') return filters.paymentMethods.length;
    if (type === 'date') {
      return filters.dateFilter?.startDate || (filters.dateRange && filters.dateRange !== 'all') ? 1 : 0;
    }
    return 0;
  };

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
    }
    return dateStr;
  };

  const getFilterLabel = (type: PropertyType) => {
    if (type === 'category') {
      if (filters.categories.length === 1) return `Category: ${filters.categories[0]}`;
      if (filters.categories.length > 1) return `Category (${filters.categories.length})`;
      return 'Category';
    }
    if (type === 'store') {
      if (filters.stores.length === 1) return `Store: ${filters.stores[0]}`;
      if (filters.stores.length > 1) return `Store (${filters.stores.length})`;
      return 'Store';
    }
    if (type === 'orderStatus') {
      if (filters.orderStatuses.length === 1) return `Order Status: ${filters.orderStatuses[0]}`;
      if (filters.orderStatuses.length > 1) return `Order Status (${filters.orderStatuses.length})`;
      return 'Order Status';
    }
    if (type === 'paymentStatus') {
      if (filters.paymentStatuses.length === 1) return `Payment Status: ${filters.paymentStatuses[0]}`;
      if (filters.paymentStatuses.length > 1) return `Payment Status (${filters.paymentStatuses.length})`;
      return 'Payment Status';
    }
    if (type === 'paymentMethod') {
      if (filters.paymentMethods.length === 1) return `Payment Method: ${filters.paymentMethods[0]}`;
      if (filters.paymentMethods.length > 1) return `Payment Method (${filters.paymentMethods.length})`;
      return 'Payment Method';
    }
    if (type === 'date') {
      if (filters.dateFilter) {
        const { operator, startDate, endDate } = filters.dateFilter;
        if (operator === 'empty') return 'Date: is empty';
        if (operator === 'not_empty') return 'Date: is not empty';
        if (operator === 'relative_today') return 'Date: relative to today';
        if (operator === 'between' && startDate && endDate) {
          return `Date: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
        }
        if (startDate) {
          if (operator === 'exact' || operator === 'between') return `Date: ${formatDateShort(startDate)}`;
          if (operator === 'before') return `Date: < ${formatDateShort(startDate)}`;
          if (operator === 'after') return `Date: > ${formatDateShort(startDate)}`;
          if (operator === 'on_or_before') return `Date: <= ${formatDateShort(startDate)}`;
          if (operator === 'on_or_after') return `Date: >= ${formatDateShort(startDate)}`;
        }
      }
      if (filters.dateRange && filters.dateRange !== 'all') {
        return `Date: ${filters.dateRange}`;
      }
      return 'Date';
    }
    return '';
  };

  const getPropertyIcon = (type: PropertyType) => {
    switch (type) {
      case 'category':
        return <Layers className="w-3.5 h-3.5" />;
      case 'store':
        return <ShoppingBag className="w-3.5 h-3.5" />;
      case 'orderStatus':
        return <Truck className="w-3.5 h-3.5" />;
      case 'paymentStatus':
        return <Building2 className="w-3.5 h-3.5" />;
      case 'paymentMethod':
        return <CreditCard className="w-3.5 h-3.5" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div ref={barRef} className="space-y-2 select-none">
      {/* Notion Filter & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 py-1">
        {/* Left: Notion Sort Pill & Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 1. Notion Sort Pill (optional) */}
          {showSort && onSortChange && (
            <>
              <div className="relative">
                <button
                  onClick={() => {
                    setIsSortOpen(!isSortOpen);
                    setActiveFilterPopover(null);
                    setIsAddFilterOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#ebf5fb] dark:bg-[#1a2d3d] text-[#2383e2] dark:text-[#529cca] border border-blue-200/70 dark:border-blue-800/60 hover:bg-blue-100/70 dark:hover:bg-blue-900/60 transition-all cursor-pointer shadow-2xs"
                >
                  {sortOrder === 'asc' ? (
                    <ArrowUp className="w-3 h-3 text-[#2383e2] dark:text-[#529cca]" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-[#2383e2] dark:text-[#529cca]" />
                  )}
                  <span>{sortFieldLabel}</span>
                  <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                </button>

                {/* Notion Sort Dropdown Popover */}
                {isSortOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-56 p-1.5 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl space-y-1 animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Sort By
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                      {SORT_FIELD_OPTIONS.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSortChange(item.id, sortOrder);
                            setIsSortOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                            sortField === item.id
                              ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                          }`}
                        >
                          <span>{item.label}</span>
                          {sortField === item.id && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-1 mt-1 flex items-center justify-between gap-1 px-1">
                      <button
                        onClick={() => {
                          onSortChange(sortField, 'asc');
                          setIsSortOpen(false);
                        }}
                        className={`flex-1 py-1 text-[11px] rounded-md font-medium text-center transition-colors ${
                          sortOrder === 'asc'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        Ascending
                      </button>
                      <button
                        onClick={() => {
                          onSortChange(sortField, 'desc');
                          setIsSortOpen(false);
                        }}
                        className={`flex-1 py-1 text-[11px] rounded-md font-medium text-center transition-colors ${
                          sortOrder === 'desc'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        Descending
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Vertical Divider */}
              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />
            </>
          )}

          {/* 2. Notion Filter Buttons (e.g. "💰 Payment Status: Paid ⌄", "📅 Date ⌄") */}
          {effectiveVisibleFilterProps.map((type) => {
            const count = getFilterCount(type);
            const isFiltered = count > 0;
            const isOpen = activeFilterPopover === type;

            const optType: OptionType =
              type === 'store'
                ? 'marketplace'
                : type === 'orderStatus'
                ? 'order_status'
                : type === 'paymentStatus'
                ? 'payment_status'
                : type === 'paymentMethod'
                ? 'payment_method'
                : 'category';

            const optionsList: string[] = type === 'date' ? [] : getOptions(optType);
            const selectedList: string[] =
              type === 'category'
                ? filters.categories
                : type === 'store'
                ? filters.stores
                : type === 'orderStatus'
                ? filters.orderStatuses
                : type === 'paymentStatus'
                ? filters.paymentStatuses
                : type === 'paymentMethod'
                ? filters.paymentMethods
                : [];

            const filteredOptions = optionsList.filter((opt) =>
              opt.toLowerCase().includes(filterSearchQuery.toLowerCase())
            );

            const handleFilterDragStart = (e: DragEvent<HTMLDivElement>, opt: string) => {
              setFilterDraggedItem(opt);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', opt);
            };

            const handleFilterDragOver = (e: DragEvent<HTMLDivElement>, opt: string) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (!filterDraggedItem || filterDraggedItem === opt) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const midY = rect.top + rect.height / 2;
              setFilterDragOverItem(opt);
              setFilterDropPosition(e.clientY < midY ? 'before' : 'after');
            };

            const handleFilterDrop = (e: DragEvent<HTMLDivElement>, targetOpt: string) => {
              e.preventDefault();
              if (!filterDraggedItem || filterDraggedItem === targetOpt) {
                setFilterDraggedItem(null);
                setFilterDragOverItem(null);
                setFilterDropPosition(null);
                return;
              }
              const fromIdx = optionsList.indexOf(filterDraggedItem);
              const toIdx = optionsList.indexOf(targetOpt);
              if (fromIdx !== -1 && toIdx !== -1) {
                const targetIdx = filterDropPosition === 'after'
                  ? (fromIdx < toIdx ? toIdx : toIdx + 1)
                  : (fromIdx < toIdx ? toIdx - 1 : toIdx);
                const clampedIdx = Math.max(0, Math.min(targetIdx, optionsList.length - 1));
                reorderOptions(optType, fromIdx, clampedIdx);
              }
              setFilterDraggedItem(null);
              setFilterDragOverItem(null);
              setFilterDropPosition(null);
            };

            return (
              <div key={type} className="relative">
                <div
                  className={`inline-flex items-center rounded-full text-xs font-medium transition-all ${
                    isFiltered
                      ? 'bg-[#ebf5fb] dark:bg-[#1a2d3d] text-[#2383e2] dark:text-[#529cca] border border-blue-200/70 dark:border-blue-800/60'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 border border-transparent'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveFilterPopover(isOpen ? null : type);
                      setIsSortOpen(false);
                      setIsAddFilterOpen(false);
                      setFilterSearchQuery('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 cursor-pointer"
                  >
                    <span className="opacity-90">{getPropertyIcon(type)}</span>
                    <span>{getFilterLabel(type)}</span>
                    <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                  </button>

                  {isFiltered && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFilterType(type);
                      }}
                      className="pr-2.5 pl-0.5 text-[#2383e2]/70 dark:text-[#529cca]/70 hover:text-[#2383e2] dark:hover:text-[#529cca] cursor-pointer"
                      title="Clear filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Notion Filter Popup Box */}
                {isOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                    {type === 'date' ? (
                      <NotionDatePicker
                        value={filters.dateFilter || { operator: 'between' }}
                        onChange={(val) => onFiltersChange({ ...filters, dateFilter: val })}
                        onClear={() => clearFilterType('date')}
                        onDeleteFilter={() => removeFilterProp('date')}
                      />
                    ) : (
                      <div className="w-64 p-2 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl space-y-2 select-none">
                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="text"
                            placeholder="Search options..."
                            value={filterSearchQuery}
                            onChange={(e) => setFilterSearchQuery(e.target.value)}
                            className="w-full pl-6 pr-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md text-neutral-800 dark:text-neutral-200 focus:outline-hidden"
                          />
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                          {filteredOptions.length === 0 ? (
                            <div className="text-center py-4 text-xs text-neutral-400 italic">
                              No matching options
                            </div>
                          ) : (
                            filteredOptions.map((opt) => {
                              const isSelected = selectedList.includes(opt);
                              const isBeingDragged = filterDraggedItem === opt;
                              const isTargetOver = filterDragOverItem === opt && filterDraggedItem !== opt;

                              return (
                                <div
                                  key={opt}
                                  draggable
                                  onDragStart={(e) => handleFilterDragStart(e, opt)}
                                  onDragOver={(e) => handleFilterDragOver(e, opt)}
                                  onDrop={(e) => handleFilterDrop(e, opt)}
                                  onDragEnd={() => {
                                    setFilterDraggedItem(null);
                                    setFilterDragOverItem(null);
                                    setFilterDropPosition(null);
                                  }}
                                  className="relative group/filteropt"
                                >
                                  {isTargetOver && filterDropPosition === 'before' && (
                                    <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10 animate-pulse pointer-events-none" />
                                  )}

                                  <div
                                    onClick={() => toggleFilterItem(type, opt)}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                                      isBeingDragged
                                        ? 'opacity-30 bg-blue-50/50 dark:bg-blue-950/20 border border-dashed border-blue-400/60 scale-[0.98]'
                                        : isSelected
                                        ? 'bg-neutral-100 dark:bg-neutral-800/80 font-medium'
                                        : 'hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                      <div
                                        className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
                                        title="Drag to reorder"
                                        onMouseDown={(e) => e.stopPropagation()}
                                      >
                                        <GripVertical className="w-3 h-3 opacity-60 group-hover/filteropt:opacity-100" />
                                      </div>
                                      <div
                                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected
                                            ? 'bg-[#2383e2] border-[#2383e2] text-white'
                                            : 'border-neutral-300 dark:border-neutral-600'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-2.5 h-2.5 stroke-3" />}
                                      </div>
                                      <TagPill
                                        text={opt}
                                        type={
                                          type === 'category'
                                            ? 'category'
                                            : type === 'store'
                                            ? 'marketplace'
                                            : type === 'orderStatus'
                                            ? 'order_status'
                                            : type === 'paymentStatus'
                                            ? 'payment_status'
                                            : 'payment_method'
                                        }
                                      />
                                    </div>
                                  </div>

                                  {isTargetOver && filterDropPosition === 'after' && (
                                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10 animate-pulse pointer-events-none" />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-1.5 flex items-center justify-between text-[11px]">
                          <button
                            onClick={() => clearFilterType(type)}
                            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => removeFilterProp(type)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* 3. Notion "+ Filter" Button */}
          {availableFilterProperties.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsAddFilterOpen(!isAddFilterOpen);
                  setIsSortOpen(false);
                  setActiveFilterPopover(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Filter</span>
              </button>

              {/* Notion "+ Filter" Property Selector Popover */}
              {isAddFilterOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-52 p-1.5 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Filter by
                  </div>
                  {availableFilterProperties.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => {
                        if (!visibleFilterProps.includes(prop.id)) {
                          setVisibleFilterProps([...visibleFilterProps, prop.id]);
                        }
                        setActiveFilterPopover(prop.id);
                        setIsAddFilterOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left cursor-pointer"
                    >
                      <span className="text-neutral-400">{getPropertyIcon(prop.id)}</span>
                      <span>{prop.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Extra Actions / Reset Column Width */}
        {(extraRightActions || (isAnyColumnResized && onResetColumnWidths)) && (
          <div className="flex items-center gap-2 shrink-0">
            {extraRightActions}
            {isAnyColumnResized && onResetColumnWidths && (
              <button
                type="button"
                onClick={onResetColumnWidths}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 transition-colors cursor-pointer shadow-2xs"
                title="Reset all column widths to default"
              >
                <RotateCcw className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                <span>Reset Column Width</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
