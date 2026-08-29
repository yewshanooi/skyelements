"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { FC } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Search,
  FileText,
  Calendar,
} from 'lucide-react';
import type { SaleItem } from '@/types/sales';
import { TagPill } from './TagPill';
import { formatIsoDate, parseDateString, formatDateShort } from '@/lib/sales/dateUtils';

interface TimelineViewProps {
  sales: SaleItem[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  currentYear?: number;
  currentMonth?: number;
  onChangeYearMonth?: (year: number, month: number) => void;
  onSelectSale: (sale: SaleItem) => void;
  onOpenNewSale?: () => void;
}

const COLUMN_WIDTH = 48;
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function normalizeDate(raw?: string): string {
  if (!raw) return '';
  const parsed = parseDateString(raw);
  if (parsed) return parsed;
  return raw.trim().slice(0, 10);
}

export const TimelineView: FC<TimelineViewProps> = ({
  sales,
  selectedCategory: propCategory,
  onSelectCategory: propOnSelectCategory,
  currentYear: propYear,
  currentMonth: propMonth,
  onChangeYearMonth,
  onSelectSale,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => formatIsoDate(today), [today]);

  const [internalYear, setInternalYear] = useState<number>(today.getFullYear());
  const [internalMonth, setInternalMonth] = useState<number>(today.getMonth());
  const [internalCategory, setInternalCategory] = useState<string>('all');

  const currentYear = propYear ?? internalYear;
  const currentMonth = propMonth ?? internalMonth;
  const selectedCategory = propCategory || internalCategory;

  const setYearMonth = (y: number, m: number) => {
    if (onChangeYearMonth) {
      onChangeYearMonth(y, m);
    } else {
      setInternalYear(y);
      setInternalMonth(m);
    }
  };

  const setSelectedCategory = (cat: string) => {
    if (propOnSelectCategory) {
      propOnSelectCategory(cat);
    } else {
      setInternalCategory(cat);
    }
  };

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

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

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryOpen]);

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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

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
    const filtered = sales.filter((s) => {
      if (!s.date) return false;
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      return true;
    });

    if (filtered.length <= 1) return filtered;

    const mapped = filtered.map((sale) => {
      const time = sale.date ? new Date(sale.date).getTime() : 0;
      return { sale, time: isNaN(time) ? 0 : time };
    });

    mapped.sort((a, b) => b.time - a.time);
    return mapped.map((m) => m.sale);
  }, [sales, selectedCategory]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => s.category && set.add(s.category));
    return Array.from(set).sort();
  }, [sales]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter((cat) =>
      cat.toLowerCase().includes(categorySearch.trim().toLowerCase())
    );
  }, [categories, categorySearch]);

  return (
    <div className="space-y-3 sm:space-y-3.5 pt-1.5 sm:pt-0">
      {/* Timeline Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 p-2.5 sm:p-3 bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-2xs">
        {/* Left: Month Year */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight whitespace-nowrap">
            {monthNames[currentMonth]} {currentYear}
          </span>
        </div>

        {/* Right: Category Selector & Today Navigator */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800/80">
          {/* Custom Category Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsCategoryOpen(!isCategoryOpen);
                setCategorySearch('');
              }}
              className="px-2.5 py-1 text-xs bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-800 dark:hover:bg-neutral-700/70 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <TagPill
                text={selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                type="category"
                className="text-[11px]"
              />
              <ChevronDown
                className={`w-3.5 h-3.5 opacity-60 ml-0.5 transition-transform duration-150 ${
                  isCategoryOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Custom Category Popover */}
            {isCategoryOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 z-50 w-60 max-w-[calc(100vw-32px)] p-1.5 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl space-y-1 animate-in fade-in-50 zoom-in-95 duration-100 select-none">
                {/* Search box if there are options */}
                {categories.length > 4 && (
                  <div className="relative px-1 pb-1 border-b border-neutral-100 dark:border-neutral-800/80">
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search category..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full pl-6 pr-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md text-neutral-800 dark:text-neutral-200 focus:outline-hidden"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
                  {/* All Option */}
                  {(!categorySearch || 'all categories'.includes(categorySearch.toLowerCase()) || 'all'.includes(categorySearch.toLowerCase())) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setIsCategoryOpen(false);
                        setCategorySearch('');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                        selectedCategory === 'all'
                          ? 'bg-neutral-100 dark:bg-neutral-800 font-medium text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                      }`}
                    >
                      <TagPill text="All Categories" type="category" className="text-[11px]" />
                      {selectedCategory === 'all' && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  )}

                  {/* Filtered Category list */}
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryOpen(false);
                          setCategorySearch('');
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-100 dark:bg-neutral-800 font-medium text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                        }`}
                      >
                        <TagPill text={cat} type="category" className="text-[11px]" />
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                      </button>
                    );
                  })}

                  {filteredCategories.length === 0 && categorySearch && (
                    <div className="text-center py-3 text-xs text-neutral-400 italic">
                      No categories found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Month Navigator (Today selector) */}
          <div className="inline-flex items-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs shadow-2xs shrink-0">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-l-lg transition-colors text-neutral-600 dark:text-neutral-300 cursor-pointer"
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={setToday}
              className="px-2.5 sm:px-3 py-1 font-medium hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-200 cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-r-lg transition-colors text-neutral-600 dark:text-neutral-300 cursor-pointer"
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Horizontal Gantt / Timeline Grid */}
      <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-xl bg-white dark:bg-[#191919] shadow-2xs overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto relative min-h-[380px] sm:min-h-[480px] scroll-smooth touch-scroll-x"
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
                    className={`h-full text-center border-r border-neutral-200/60 dark:border-neutral-800 flex flex-col items-center justify-center shrink-0 select-none py-1 ${
                      col.isCurrentMonth
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
                    className={`h-full border-r border-neutral-200/50 dark:border-neutral-800/40 relative shrink-0 ${
                      col.isCurrentMonth
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
              {relevantSales.length === 0 ? (
                <div
                  className="sticky left-0 flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600 gap-2 text-center"
                  style={{ width: containerWidth ? `${containerWidth}px` : '100%', maxWidth: '100vw' }}
                >
                  <Calendar className="w-8 h-8 stroke-1" />
                  <p className="text-sm font-medium">No sales recorded for this period</p>
                </div>
              ) : (
                relevantSales.map((sale) => {
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
                        title={`${sale.item} • ${formatDateShort(sale.date)} • RM ${sale.sales.toFixed(2)}`}
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

