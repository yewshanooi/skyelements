"use client";

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FC, ChangeEvent, KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import {
  parseDateString,
  formatDateDisplay,
  formatIsoDate,
  generateCalendarGrid,
  MONTH_NAMES_SHORT as MONTH_NAMES,
  DAYS_OF_WEEK,
} from '@/lib/sales/dateUtils';

interface TableDatePickerProps {
  currentDate?: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

export const TableDatePicker: FC<TableDatePickerProps> = ({
  currentDate = '',
  onSelectDate,
  onClose,
}) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState<string>(() => formatDateDisplay(currentDate));
  const [selectedDate, setSelectedDate] = useState<string>(currentDate || '');

  const initialDate = useMemo(() => {
    if (currentDate) {
      const parsed = new Date(currentDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [currentDate]);

  const [navYear, setNavYear] = useState<number>(initialDate.getFullYear() || 2026);
  const [navMonth, setNavMonth] = useState<number>(
    isNaN(initialDate.getMonth()) ? 7 : initialDate.getMonth()
  );

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    placement: 'bottom' | 'top';
  } | null>(null);

  // Sync state if currentDate prop updates
  const [prevCurrentDate, setPrevCurrentDate] = useState(currentDate);
  if (prevCurrentDate !== currentDate) {
    setPrevCurrentDate(currentDate);
    setSelectedDate(currentDate || '');
    setInputValue(formatDateDisplay(currentDate));
    if (currentDate) {
      const parts = currentDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          setNavYear(y);
          setNavMonth(m - 1);
        }
      }
    }
  }

  const computePosition = () => {
    const anchor = anchorRef.current?.parentElement || anchorRef.current;
    if (!anchor) return;
    const parentRect = anchor.getBoundingClientRect();
    if (parentRect.width === 0 && parentRect.height === 0) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = popoverRef.current?.offsetWidth || 285;
    const popoverHeight = popoverRef.current?.offsetHeight || 340;

    const spaceBelow = viewportHeight - parentRect.bottom;
    const spaceAbove = parentRect.top;

    let placement: 'bottom' | 'top' = 'bottom';
    if (spaceBelow < Math.min(popoverHeight, 330) && (spaceAbove > spaceBelow || spaceAbove > 200)) {
      placement = 'top';
    }

    let left = parentRect.left;
    if (left + popoverWidth > viewportWidth - 12) {
      left = parentRect.right - popoverWidth;
    }
    left = Math.max(12, Math.min(left, viewportWidth - popoverWidth - 12));

    if (placement === 'top') {
      setCoords({
        bottom: viewportHeight - parentRect.top + 4,
        left,
        placement: 'top',
      });
    } else {
      setCoords({
        top: parentRect.bottom + 4,
        left,
        placement: 'bottom',
      });
    }
  };

  useLayoutEffect(() => {
    computePosition();
  }, [navMonth, navYear]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }
      const anchor = anchorRef.current?.parentElement;
      if (anchor && anchor.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear((y) => y - 1);
    } else {
      setNavMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear((y) => y + 1);
    } else {
      setNavMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    const todayStr = formatIsoDate(now);
    setNavYear(now.getFullYear());
    setNavMonth(now.getMonth());
    setSelectedDate(todayStr);
    setInputValue(formatDateDisplay(todayStr));
    onSelectDate(todayStr);
    onClose();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    if (!text.trim()) {
      setSelectedDate('');
      return;
    }

    const parsed = parseDateString(text);
    if (parsed) {
      setSelectedDate(parsed);
      const parts = parsed.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          setNavYear(y);
          setNavMonth(m - 1);
        }
      }
    }
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!inputValue.trim()) {
        onSelectDate('');
        onClose();
        return;
      }
      const parsed = parseDateString(inputValue);
      if (parsed) {
        onSelectDate(parsed);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      if (selectedDate !== (currentDate || '')) {
        onSelectDate('');
      }
    } else {
      const parsed = parseDateString(inputValue);
      if (parsed) {
        setInputValue(formatDateDisplay(parsed));
        setSelectedDate(parsed);
        onSelectDate(parsed);
      } else {
        // Revert to valid selectedDate if user left invalid text
        setInputValue(formatDateDisplay(selectedDate));
      }
    }
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setInputValue(formatDateDisplay(dateStr));
    onSelectDate(dateStr);
    onClose();
  };

  const gridCells = useMemo(() => generateCalendarGrid(navYear, navMonth), [navYear, navMonth]);

  return (
    <>
      <span ref={anchorRef} className="contents pointer-events-none" />
      {coords &&
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
              zIndex: 99999,
            }}
            className="w-[270px] sm:w-[285px] max-w-[calc(100vw-24px)] p-3.5 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl space-y-3 animate-in fade-in-50 zoom-in-95 duration-100 text-xs select-none"
          >
            {/* Top Input displaying formatted date & manual typing */}
            <div className="relative flex items-center px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                placeholder="DD/MM/YYYY"
                className="w-full text-xs bg-transparent border-none outline-hidden text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 font-sans"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    setSelectedDate('');
                    inputRef.current?.focus();
                  }}
                  className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded cursor-pointer transition-colors"
                  title="Clear input"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Month & Year Header + "Today" Jump + < > */}
            <div className="flex items-center justify-between pt-0.5 px-0.5">
              <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                {MONTH_NAMES[navMonth]} {navYear}
              </span>
              <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                <button
                  type="button"
                  onClick={handleJumpToday}
                  className="text-[11px] font-medium hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-1">
              <div className="grid grid-cols-7 text-center text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                {DAYS_OF_WEEK.map((day) => (
                  <span key={day} className="py-0.5">
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center text-xs">
                {gridCells.map((cell, idx) => {
                  const isSelected = cell.dateStr === selectedDate;
                  return (
                    <button
                      type="button"
                      key={`${cell.dateStr}-${idx}`}
                      onClick={() => handleSelectDate(cell.dateStr)}
                      className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center text-xs transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#2383e2] text-white font-bold shadow-xs'
                          : cell.isToday
                          ? 'bg-[#ea5d50] text-white font-bold shadow-xs'
                          : cell.isCurrentMonth
                          ? 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium'
                          : 'text-neutral-300 dark:text-neutral-600 hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                      }`}
                    >
                      <span>{cell.dayNumber}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear action */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  onSelectDate('');
                  onClose();
                }}
                className="w-full text-left py-1 px-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer text-xs"
              >
                Clear
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
