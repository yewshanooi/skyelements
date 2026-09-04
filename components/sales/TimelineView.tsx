"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { FC } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  RotateCcw,
} from 'lucide-react';
import type { SaleItem } from '@/types/sales';
import { formatIsoDate, parseDateString, formatDateDisplay } from '@/lib/sales/dateUtils';
import { NotionFilterBar } from './NotionFilterBar';
import { filterSales, DEFAULT_EMPTY_FILTERS, hasActiveFilters, type FilterState } from '@/lib/sales/filterUtils';

interface TimelineViewProps {
  sales: SaleItem[];
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  currentYear?: number;
  currentMonth?: number;
  onChangeYearMonth?: (year: number, month: number) => void;
  onSelectSale: (sale: SaleItem) => void;
}

const COLUMN_WIDTH = 48;
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];


function normalizeDate(raw?: string): string {
  if (!raw) return '';
  const parsed = parseDateString(raw);
  if (parsed) return parsed;
  return raw.trim().slice(0, 10);
}

export const TimelineView: FC<TimelineViewProps> = ({
  sales,
  filters: propFilters,
  onFiltersChange: propOnFiltersChange,
  currentYear: propYear,
  currentMonth: propMonth,
  onChangeYearMonth,
  onSelectSale,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => formatIsoDate(today), [today]);

  const [internalYear, setInternalYear] = useState<number>(today.getFullYear());
  const [internalMonth, setInternalMonth] = useState<number>(today.getMonth());
  const [internalFilters, setInternalFilters] = useState<FilterState>(() => ({
    ...DEFAULT_EMPTY_FILTERS,
  }));

  const currentYear = propYear ?? internalYear;
  const currentMonth = propMonth ?? internalMonth;
  const activeFilters = propFilters || internalFilters;

  const handleFiltersChange = useCallback(
    (newFilters: FilterState) => {
      if (propOnFiltersChange) {
        propOnFiltersChange(newFilters);
      } else {
        setInternalFilters(newFilters);
      }
    },
    [propOnFiltersChange]
  );

  const setYearMonth = (y: number, m: number) => {
    if (onChangeYearMonth) {
      onChangeYearMonth(y, m);
    } else {
      setInternalYear(y);
      setInternalMonth(m);
    }
  };

  // Track visible container width so empty state message stays dead-center in viewport
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

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setYearMonth(currentYear - 1, 11);
    } else {
      setYearMonth(currentYear, currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setYearMonth(currentYear + 1, 0);
    } else {
      setYearMonth(currentYear, currentMonth + 1);
    }
  };


  // Number of days in selected month and previous month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const daysInPrevMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Generate date columns (Previous month's tail ~12 days + Current month ~31 days + Next month head ~12 days)
  const timelineDays = useMemo(() => {
    const list: {
      day: number;
      month: number;
      year: number;
      fullDate: string;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      dayOfWeek: number;
    }[] = [];

    // Tail of previous month (last 12 days)
    const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
    for (let d = Math.max(1, daysInPrevMonth - 11); d <= daysInPrevMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(prevM + 1).padStart(2, '0');
      const dateObj = new Date(prevY, prevM, d);
      const dayOfWeek = dateObj.getDay();
      list.push({
        day: d,
        month: prevM,
        year: prevY,
        fullDate: `${prevY}-${monthStr}-${dayStr}`,
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dayOfWeek,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dateObj = new Date(currentYear, currentMonth, d);
      const dayOfWeek = dateObj.getDay();
      list.push({
        day: d,
        month: currentMonth,
        year: currentYear,
        fullDate: `${currentYear}-${monthStr}-${dayStr}`,
        isCurrentMonth: true,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dayOfWeek,
      });
    }

    // Head of next month (first 12 days for smooth overscroll & end-of-month pill visibility)
    const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let d = 1; d <= 12; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(nextM + 1).padStart(2, '0');
      const dateObj = new Date(nextY, nextM, d);
      const dayOfWeek = dateObj.getDay();
      list.push({
        day: d,
        month: nextM,
        year: nextY,
        fullDate: `${nextY}-${monthStr}-${dayStr}`,
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dayOfWeek,
      });
    }

    return list;
  }, [currentYear, currentMonth, daysInMonth, daysInPrevMonth]);

  // Fast O(1) date string to timeline column index lookup map
  const dayIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < timelineDays.length; i++) {
      map.set(timelineDays[i].fullDate, i);
    }
    return map;
  }, [timelineDays]);

  const totalGridWidth = useMemo(() => timelineDays.length * COLUMN_WIDTH, [timelineDays]);

  // Left-align to the first day of the current month
  const scrollToMonthStart = useCallback((smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Find the first day of the month (where isCurrentMonth is true)
    const firstDayIdx = timelineDays.findIndex((d) => d.isCurrentMonth);
    if (firstDayIdx === -1) return;

    const targetScroll = firstDayIdx * COLUMN_WIDTH;

    container.scrollTo({
      left: Math.max(0, targetScroll),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [timelineDays]);

  // Scroll to Today marker centered in view
  const scrollToToday = useCallback((smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const todayIdx = dayIndexMap.get(todayDateStr) ?? -1;
    if (todayIdx === -1) {
      scrollToMonthStart(smooth);
      return;
    }

    const containerWidth = container.clientWidth || 800;
    const targetScroll = todayIdx * COLUMN_WIDTH - containerWidth / 2 + COLUMN_WIDTH / 2;

    container.scrollTo({
      left: Math.max(0, targetScroll),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [dayIndexMap, todayDateStr, scrollToMonthStart]);

  // Left-align when month changes
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToMonthStart(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [currentYear, currentMonth, scrollToMonthStart]);

  // Maintain alignment on window resize
  useEffect(() => {
    const handleResize = () => {
      scrollToMonthStart(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scrollToMonthStart]);

  const setToday = () => {
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();

    if (currentYear === nowYear && currentMonth === nowMonth) {
      scrollToToday(true);
    } else {
      setYearMonth(nowYear, nowMonth);
      setTimeout(() => {
        scrollToToday(true);
      }, 70);
    }
  };

  // Filter and sort sales for the timeline efficiently
  const relevantSales = useMemo(() => {
    const filtered = filterSales(sales, activeFilters).filter((s) => Boolean(s.date));

    if (filtered.length <= 1) return filtered;

    const mapped = filtered.map((sale) => {
      const time = sale.date ? new Date(sale.date).getTime() : 0;
      return { sale, time: isNaN(time) ? 0 : time };
    });

    mapped.sort((a, b) => b.time - a.time);
    return mapped.map((m) => m.sale);
  }, [sales, activeFilters]);

  // Sales falling within the active timeline window (prev tail + current month + next head)
  const timelineSales = useMemo(() => {
    return relevantSales.filter((sale) => {
      const saleIso = normalizeDate(sale.date);
      return dayIndexMap.has(saleIso);
    });
  }, [relevantSales, dayIndexMap]);

  const isFilterActive = useMemo(() => hasActiveFilters(activeFilters), [activeFilters]);

  const handleResetFilters = useCallback(() => {
    handleFiltersChange({ ...DEFAULT_EMPTY_FILTERS });
  }, [handleFiltersChange]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Notion Filter Toolbar for Timeline */}
      <NotionFilterBar
        storageKeyPrefix="timeline"
        showSort={false}
        filters={activeFilters}
        onFiltersChange={handleFiltersChange}
        extraRightActions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs shrink-0">
              <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
            </div>
            <div className="inline-flex items-center rounded-md border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 sm:px-1.5 sm:py-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
                title="Previous month"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={setToday}
                className="px-2 sm:px-2.5 py-1 text-xs font-medium border-x border-neutral-200/80 dark:border-neutral-700/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 sm:px-1.5 sm:py-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
                title="Next month"
                aria-label="Next month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        }
      />

      {/* Interactive Horizontal Gantt / Timeline Grid */}
      <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-xl bg-white dark:bg-[#191919] shadow-2xs overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto relative min-h-[380px] sm:min-h-[480px] scroll-smooth touch-scroll-x rounded-xl"
        >
          {/* Synchronized full-width timeline canvas */}
          <div
            style={{ width: `${totalGridWidth}px`, minWidth: `${totalGridWidth}px` }}
            className="relative min-h-[480px]"
          >
            {/* Days Header Bar */}
            <div className="sticky top-0 z-20 flex w-full h-11 border-b border-neutral-200 dark:border-neutral-800 bg-[#fbfbfa] dark:bg-[#1e1e1e] text-[11px] font-mono text-neutral-500 shadow-2xs">
              {timelineDays.map((col, index) => {
                const isToday = col.fullDate === todayDateStr;
                return (
                  <div
                    key={index}
                    style={{
                      width: `${COLUMN_WIDTH}px`,
                      minWidth: `${COLUMN_WIDTH}px`,
                      maxWidth: `${COLUMN_WIDTH}px`,
                    }}
                    className={`h-full text-center border-r border-neutral-200/60 dark:border-neutral-800 flex flex-col items-center justify-center shrink-0 select-none py-1 ${col.isCurrentMonth
                        ? col.isWeekend
                          ? 'bg-neutral-100/50 dark:bg-neutral-900/30 text-neutral-600 dark:text-neutral-400'
                          : 'text-neutral-700 dark:text-neutral-300 font-medium'
                        : 'text-neutral-400 dark:text-neutral-600 bg-neutral-100/70 dark:bg-neutral-900/60'
                      }`}
                  >
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-sans leading-none mb-0.5">
                      {WEEKDAYS[col.dayOfWeek]}
                    </span>
                    <div className="w-5 h-5 flex items-center justify-center">
                      {isToday ? (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white font-bold flex items-center justify-center text-[10px] shadow-xs">
                          {col.day}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono leading-none">{col.day}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Background vertical day column grid lines & Today guide line */}
            <div className="absolute inset-0 top-[44px] flex pointer-events-none w-full h-[calc(100%-44px)]">
              {timelineDays.map((col, index) => {
                const isToday = col.fullDate === todayDateStr;
                return (
                  <div
                    key={index}
                    style={{
                      width: `${COLUMN_WIDTH}px`,
                      minWidth: `${COLUMN_WIDTH}px`,
                      maxWidth: `${COLUMN_WIDTH}px`,
                    }}
                    className={`h-full border-r border-neutral-200/50 dark:border-neutral-800/40 relative shrink-0 ${col.isCurrentMonth
                        ? col.isWeekend
                          ? 'bg-neutral-50/40 dark:bg-neutral-950/20'
                          : ''
                        : 'bg-neutral-100/40 dark:bg-neutral-950/40'
                      }`}
                  >
                    {isToday && (
                      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-red-500/70 z-10" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sales Event Items positioned along the Timeline */}
            <div className="relative z-10 w-full pt-4 pb-16 space-y-2.5">
              {timelineSales.length === 0 ? (
                <div
                  className="sticky left-0 py-16 px-4 flex flex-col items-center justify-center space-y-3 text-center pointer-events-auto"
                  style={{ width: containerWidth ? `${containerWidth}px` : '100%', maxWidth: '100vw' }}
                >
                  <Calendar className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {isFilterActive ? 'No orders match the selected filters' : 'No sales recorded for this period'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    {isFilterActive
                      ? 'Try adjusting your active filters to view orders.'
                      : 'Navigate to a different month or add a new sale to see it.'}
                  </p>
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              ) : (
                timelineSales.map((sale) => {
                  const saleIso = normalizeDate(sale.date);
                  const colIdx = dayIndexMap.get(saleIso) ?? -1;
                  if (colIdx === -1) return null;

                  // Align flush with the day column boundary
                  const leftPos = colIdx * COLUMN_WIDTH;

                  return (
                    <div
                      key={sale.id}
                      style={{
                        transform: `translateX(${leftPos}px)`,
                      }}
                      className="relative flex items-center transition-transform duration-200"
                    >
                      <div
                        onClick={() => onSelectSale(sale)}
                        title={`${sale.item} • ${formatDateDisplay(sale.date)} • RM ${sale.sales.toFixed(2)}`}
                        className="group cursor-pointer bg-white dark:bg-[#252525] hover:bg-blue-50/80 dark:hover:bg-blue-950/40 border border-neutral-200/90 dark:border-neutral-700/80 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg px-3 py-1.5 shadow-2xs hover:shadow-md transition-all flex items-center gap-2 max-w-sm whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-500 shrink-0 transition-colors" />
                        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                          {sale.item}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          RM {sale.sales.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

