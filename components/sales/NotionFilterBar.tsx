"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Building2,
  Trash2,
  GripVertical,
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
  extraLeftActions?: React.ReactNode;
  extraRightActions?: React.ReactNode;
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
  defaultVisibleProps = [],
  isAnyColumnResized = false,
  onResetColumnWidths,
  extraLeftActions,
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

  // Trigger button refs for smart popover viewport positioning
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRefs = useRef<Map<PropertyType, HTMLButtonElement>>(new Map());
  const addFilterButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    placement: 'bottom' | 'top';
  } | null>(null);

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
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch { }
    }
    return [...defaultVisibleProps];
  });

  const [prevStorageKey, setPrevStorageKey] = useState(storageKey);
  if (prevStorageKey !== storageKey) {
    setPrevStorageKey(storageKey);
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setVisibleFilterProps(parsed);
          }
        }
      } catch { }
    }
  }

  // Persist visibleFilterProps to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibleFilterProps));
    } catch {
      /* ignore storage error */
    }
  }, [visibleFilterProps, storageKey]);

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

  // Active option types & lists for current filter popover
  const activeOptType: OptionType = useMemo(() => {
    if (!activeFilterPopover || activeFilterPopover === 'date') return 'category';
    if (activeFilterPopover === 'store') return 'marketplace';
    if (activeFilterPopover === 'orderStatus') return 'order_status';
    if (activeFilterPopover === 'paymentStatus') return 'payment_status';
    if (activeFilterPopover === 'paymentMethod') return 'payment_method';
    return 'category';
  }, [activeFilterPopover]);

  const activeOptionsList: string[] = useMemo(() => {
    if (!activeFilterPopover || activeFilterPopover === 'date') return [];
    return getOptions(activeOptType);
  }, [activeFilterPopover, activeOptType]);

  const activeSelectedList: string[] = useMemo(() => {
    if (!activeFilterPopover) return [];
    if (activeFilterPopover === 'category') return filters.categories;
    if (activeFilterPopover === 'store') return filters.stores;
    if (activeFilterPopover === 'orderStatus') return filters.orderStatuses;
    if (activeFilterPopover === 'paymentStatus') return filters.paymentStatuses;
    if (activeFilterPopover === 'paymentMethod') return filters.paymentMethods;
    return [];
  }, [activeFilterPopover, filters]);

  const activeFilteredOptions = useMemo(() => {
    return activeOptionsList.filter((opt) =>
      opt.toLowerCase().includes(filterSearchQuery.toLowerCase())
    );
  }, [activeOptionsList, filterSearchQuery]);

  // Compute smart viewport-clamped popover positioning
  const computePosition = useCallback(() => {
    let triggerEl: HTMLElement | null = null;
    if (isSortOpen) {
      triggerEl = sortButtonRef.current;
    } else if (activeFilterPopover) {
      triggerEl = filterButtonRefs.current.get(activeFilterPopover) || null;
    } else if (isAddFilterOpen) {
      triggerEl = addFilterButtonRef.current;
    }

    if (!triggerEl) {
      setCoords(null);
      return;
    }

    const triggerRect = triggerEl.getBoundingClientRect();
    if (triggerRect.width === 0 && triggerRect.height === 0) {
      setCoords(null);
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = popoverRef.current?.offsetWidth || (activeFilterPopover === 'date' ? 285 : 256);
    const popoverHeight = popoverRef.current?.offsetHeight || 260;

    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    let placement: 'bottom' | 'top' = 'bottom';
    if (spaceBelow < Math.min(popoverHeight, 220) && (spaceAbove > spaceBelow || spaceAbove > 200)) {
      placement = 'top';
    }

    let left = triggerRect.left;
    if (left + popoverWidth > viewportWidth - 12) {
      left = triggerRect.right - popoverWidth;
    }
    left = Math.max(12, Math.min(left, viewportWidth - popoverWidth - 12));

    if (placement === 'top') {
      setCoords({
        bottom: viewportHeight - triggerRect.top + 6,
        left,
        placement: 'top',
      });
    } else {
      setCoords({
        top: triggerRect.bottom + 6,
        left,
        placement: 'bottom',
      });
    }
  }, [isSortOpen, activeFilterPopover, isAddFilterOpen]);

  useLayoutEffect(() => {
    if (isSortOpen || activeFilterPopover || isAddFilterOpen) {
      computePosition();
    } else {
      setCoords(null);
    }
  }, [isSortOpen, activeFilterPopover, isAddFilterOpen, filterSearchQuery, computePosition]);

  useEffect(() => {
    if (!isSortOpen && !activeFilterPopover && !isAddFilterOpen) return;

    computePosition();
    const handleScrollOrResize = () => {
      computePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isSortOpen, activeFilterPopover, isAddFilterOpen, computePosition]);

  // Close popovers on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }

      if (sortButtonRef.current && sortButtonRef.current.contains(target)) {
        return;
      }

      for (const btn of filterButtonRefs.current.values()) {
        if (btn && btn.contains(target)) {
          return;
        }
      }

      if (addFilterButtonRef.current && addFilterButtonRef.current.contains(target)) {
        return;
      }

      setIsSortOpen(false);
      setActiveFilterPopover(null);
      setIsAddFilterOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSortOpen(false);
        setActiveFilterPopover(null);
        setIsAddFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    const nextFilters = { ...filters };
    if (type === 'category') nextFilters.categories = [];
    if (type === 'store') nextFilters.stores = [];
    if (type === 'orderStatus') nextFilters.orderStatuses = [];
    if (type === 'paymentStatus') nextFilters.paymentStatuses = [];
    if (type === 'paymentMethod') nextFilters.paymentMethods = [];
    if (type === 'date') {
      nextFilters.dateFilter = undefined;
      nextFilters.dateRange = 'all';
    }
    onFiltersChange(nextFilters);
  };

  const removeFilterProp = (type: PropertyType) => {
    clearFilterType(type);
    const updated = visibleFilterProps.filter((p) => p !== type);
    setVisibleFilterProps(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch { }
    }
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
        const { startDate, endDate } = filters.dateFilter;
        if (startDate && endDate) {
          if (startDate === endDate) {
            return `Date: ${formatDateShort(startDate)}`;
          }
          return `Date: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
        }
        if (startDate) {
          return `Date: ${formatDateShort(startDate)}`;
        }
        if (endDate) {
          return `Date: <= ${formatDateShort(endDate)}`;
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
    const fromIdx = activeOptionsList.indexOf(filterDraggedItem);
    const toIdx = activeOptionsList.indexOf(targetOpt);
    if (fromIdx !== -1 && toIdx !== -1) {
      const targetIdx = filterDropPosition === 'after'
        ? (fromIdx < toIdx ? toIdx : toIdx + 1)
        : (fromIdx < toIdx ? toIdx - 1 : toIdx);
      const clampedIdx = Math.max(0, Math.min(targetIdx, activeOptionsList.length - 1));
      reorderOptions(activeOptType, fromIdx, clampedIdx);
    }
    setFilterDraggedItem(null);
    setFilterDragOverItem(null);
    setFilterDropPosition(null);
  };

  return (
    <div className="space-y-2 select-none w-full max-w-full">
      {/* Notion Filter & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5 py-1">
        {/* Left: Notion Sort Pill & Filters */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0 max-w-full">
          {extraLeftActions}

          {/* 1. Notion Sort Pill (optional) */}
          {showSort && onSortChange && (
            <>
              <div className="relative">
                <button
                  ref={sortButtonRef}
                  onClick={() => {
                    setIsSortOpen((prev) => !prev);
                    setActiveFilterPopover(null);
                    setIsAddFilterOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium bg-[#ebf5fb] dark:bg-[#1a2d3d] text-[#2383e2] dark:text-[#529cca] border border-blue-200/70 dark:border-blue-800/60 hover:bg-blue-100/70 dark:hover:bg-blue-900/60 transition-all cursor-pointer shadow-2xs shrink-0"
                >
                  {sortOrder === 'asc' ? (
                    <ArrowUp className="w-3 h-3 text-[#2383e2] dark:text-[#529cca]" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-[#2383e2] dark:text-[#529cca]" />
                  )}
                  <span>{sortFieldLabel}</span>
                  <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                </button>
              </div>

              {/* Vertical Divider */}
              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5 shrink-0" />
            </>
          )}

          {/* 2. Notion Filter Buttons */}
          {effectiveVisibleFilterProps.map((type) => {
            const count = getFilterCount(type);
            const isFiltered = count > 0;

            return (
              <div
                key={type}
                className={`inline-flex items-center rounded-full text-xs font-medium transition-all ${isFiltered
                    ? 'bg-[#ebf5fb] dark:bg-[#1a2d3d] text-[#2383e2] dark:text-[#529cca] border border-blue-200/70 dark:border-blue-800/60'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 border border-transparent'
                  }`}
              >
                <button
                  ref={(el) => {
                    if (el) filterButtonRefs.current.set(type, el);
                    else filterButtonRefs.current.delete(type);
                  }}
                  onClick={() => {
                    if (activeFilterPopover === type) {
                      setActiveFilterPopover(null);
                    } else {
                      setActiveFilterPopover(type);
                      setIsSortOpen(false);
                      setIsAddFilterOpen(false);
                      setFilterSearchQuery('');
                    }
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
            );
          })}

          {/* 3. Notion "+ Filter" Button */}
          {availableFilterProperties.length > 0 && (
            <div className="relative">
              <button
                ref={addFilterButtonRef}
                onClick={() => {
                  setIsAddFilterOpen((prev) => !prev);
                  setIsSortOpen(false);
                  setActiveFilterPopover(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Filter</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Extra Actions / Reset Column Width */}
        {(extraRightActions || (isAnyColumnResized && onResetColumnWidths)) && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
            {extraRightActions}
            {isAnyColumnResized && onResetColumnWidths && (
              <button
                type="button"
                onClick={onResetColumnWidths}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 transition-colors cursor-pointer shadow-2xs"
                title="Reset all column widths to default"
              >
                <RotateCcw className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                <span className="hidden sm:inline">Reset Column Width</span>
                <span className="sm:hidden">Reset Width</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          PORTALS FOR SMART POSITIONED DROPDOWNS (NEVER OVERFLOW VIEWPORT)
         ========================================================================= */}

      {/* 1. Sort Dropdown Portal */}
      {typeof document !== 'undefined' && isSortOpen && coords &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              ...(coords.placement === 'top'
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className="w-56 max-w-[calc(100vw-24px)] p-1.5 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl space-y-1 animate-in fade-in-50 zoom-in-95 duration-100 select-none text-xs"
          >
            <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Sort By
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
              {SORT_FIELD_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onSortChange) onSortChange(item.id, sortOrder);
                    setIsSortOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${sortField === item.id
                      ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                    }`}
                >
                  <span>{item.label}</span>
                  {sortField === item.id && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </button>
              ))}
            </div>

            {onSortChange && (
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-1 mt-1 flex items-center justify-between gap-1 px-1">
                <button
                  onClick={() => {
                    onSortChange(sortField, 'asc');
                    setIsSortOpen(false);
                  }}
                  className={`flex-1 py-1 text-[11px] rounded-md font-medium text-center transition-colors cursor-pointer ${sortOrder === 'asc'
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
                  className={`flex-1 py-1 text-[11px] rounded-md font-medium text-center transition-colors cursor-pointer ${sortOrder === 'desc'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                >
                  Descending
                </button>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* 2. Active Filter Dropdown Portal (Date picker or multi-select option picker) */}
      {typeof document !== 'undefined' && activeFilterPopover && coords &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              ...(coords.placement === 'top'
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className="animate-in fade-in-50 zoom-in-95 duration-100 max-w-[calc(100vw-24px)]"
          >
            {activeFilterPopover === 'date' ? (
              <NotionDatePicker
                value={filters.dateFilter}
                onChange={(val) => onFiltersChange({ ...filters, dateFilter: val })}
                onClear={() => clearFilterType('date')}
                onDeleteFilter={() => removeFilterProp('date')}
              />
            ) : (
              <div className="w-64 max-w-[calc(100vw-24px)] p-2.5 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl space-y-2 select-none text-xs">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search options..."
                    value={filterSearchQuery}
                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500/40"
                    autoFocus={typeof window !== 'undefined' ? window.innerWidth >= 768 : false}
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                  {activeFilteredOptions.length === 0 ? (
                    <div className="text-center py-4 text-xs text-neutral-400 italic">
                      No matching options
                    </div>
                  ) : (
                    activeFilteredOptions.map((opt) => {
                      const isSelected = activeSelectedList.includes(opt);
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
                            onClick={() => toggleFilterItem(activeFilterPopover, opt)}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${isBeingDragged
                                ? 'opacity-30 bg-blue-50/50 dark:bg-blue-950/20 border border-dashed border-blue-400/60 scale-[0.98]'
                                : isSelected
                                  ? 'bg-neutral-100 dark:bg-neutral-800/80 font-medium'
                                  : 'hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                              }`}
                          >
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <div
                                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors hidden sm:block"
                                title="Drag to reorder"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <GripVertical className="w-3 h-3 opacity-60 group-hover/filteropt:opacity-100" />
                              </div>
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected
                                    ? 'bg-[#2383e2] border-[#2383e2] text-white'
                                    : 'border-neutral-300 dark:border-neutral-600'
                                  }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-3" />}
                              </div>
                              <TagPill
                                text={opt}
                                type={activeOptType}
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

                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => clearFilterType(activeFilterPopover)}
                    className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => removeFilterProp(activeFilterPopover)}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* 3. Add Filter Dropdown Portal */}
      {typeof document !== 'undefined' && isAddFilterOpen && coords &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              ...(coords.placement === 'top'
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className="w-52 max-w-[calc(100vw-24px)] p-1.5 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100 select-none text-xs"
          >
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
          </div>,
          document.body
        )}
    </div>
  );
};
