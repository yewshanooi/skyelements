"use client";

import { useState, useMemo, useRef } from 'react';
import type { FC, ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
} from 'lucide-react';
import {
  parseDateString,
  formatDateDisplay,
  generateCalendarGrid,
  MONTH_NAMES_SHORT as MONTH_NAMES,
  DAYS_OF_WEEK,
} from '@/lib/sales/dateUtils';

export interface DateFilterConfig {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

interface NotionDatePickerProps {
  value?: DateFilterConfig;
  onChange: (val: DateFilterConfig) => void;
  onClear: () => void;
  onDeleteFilter: () => void;
}

export const NotionDatePicker: FC<NotionDatePickerProps> = ({
  value,
  onChange,
  onClear,
  onDeleteFilter,
}) => {
  const startDate = value?.startDate || '';
  const endDate = value?.endDate || '';

  const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const [startInputText, setStartInputText] = useState<string>(() =>
    formatDateDisplay(startDate)
  );
  const [endInputText, setEndInputText] = useState<string>(() =>
    formatDateDisplay(endDate)
  );

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  // Sync inputs when startDate and endDate props change
  const [prevStartDate, setPrevStartDate] = useState(startDate);
  if (prevStartDate !== startDate) {
    setPrevStartDate(startDate);
    setStartInputText(formatDateDisplay(startDate));
  }

  const [prevEndDate, setPrevEndDate] = useState(endDate);
  if (prevEndDate !== endDate) {
    setPrevEndDate(endDate);
    setEndInputText(formatDateDisplay(endDate));
  }

  // Month and Year navigation state
  const initialDate = useMemo(() => {
    if (startDate) {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [startDate]);

  const [navYear, setNavYear] = useState<number>(initialDate.getFullYear() || 2026);
  const [navMonth, setNavMonth] = useState<number>(
    isNaN(initialDate.getMonth()) ? 7 : initialDate.getMonth()
  );

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
    const today = new Date();
    setNavYear(today.getFullYear());
    setNavMonth(today.getMonth());
  };

  const gridCells = useMemo(() => generateCalendarGrid(navYear, navMonth), [navYear, navMonth]);

  // Handle clicking a date cell in calendar
  const handleSelectDate = (dateStr: string) => {
    if (activeInput === 'start') {
      setStartInputText(formatDateDisplay(dateStr));
      if (endDate && dateStr > endDate) {
        onChange({
          startDate: dateStr,
          endDate: undefined,
        });
        setActiveInput('end');
      } else {
        onChange({
          startDate: dateStr,
          endDate: endDate || undefined,
        });
        setActiveInput(null);
      }
      return;
    }

    if (activeInput === 'end') {
      setEndInputText(formatDateDisplay(dateStr));
      if (startDate && dateStr < startDate) {
        onChange({
          startDate: dateStr,
          endDate: undefined,
        });
        setActiveInput('end');
      } else {
        onChange({
          startDate: startDate || undefined,
          endDate: dateStr,
        });
        setActiveInput(null);
      }
      return;
    }

    // Default selection logic (no explicit input focused)
    if (startDate && !endDate) {
      if (dateStr > startDate) {
        // Range completed: [startDate, dateStr]
        setEndInputText(formatDateDisplay(dateStr));
        onChange({
          startDate,
          endDate: dateStr,
        });
        setActiveInput(null);
      } else if (dateStr === startDate) {
        // Kept as single date
        setActiveInput(null);
      } else {
        // User clicked an earlier date, start new range from that date
        setStartInputText(formatDateDisplay(dateStr));
        setEndInputText('');
        onChange({
          startDate: dateStr,
          endDate: undefined,
        });
        setActiveInput('end');
      }
    } else {
      // Either both exist or neither exists: start a fresh single date / range start
      setStartInputText(formatDateDisplay(dateStr));
      setEndInputText('');
      onChange({
        startDate: dateStr,
        endDate: undefined,
      });
      setActiveInput('end');
    }
  };

  const handleStartChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setStartInputText(text);

    if (!text.trim()) {
      onChange({ startDate: undefined, endDate: endDate || undefined });
      return;
    }

    const parsed = parseDateString(text);
    if (parsed) {
      const newEnd = endDate && parsed > endDate ? undefined : endDate || undefined;
      onChange({
        startDate: parsed,
        endDate: newEnd,
      });
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

  const handleEndChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setEndInputText(text);

    if (!text.trim()) {
      onChange({ startDate: startDate || undefined, endDate: undefined });
      return;
    }

    const parsed = parseDateString(text);
    if (parsed) {
      if (startDate && parsed < startDate) {
        onChange({
          startDate: parsed,
          endDate: undefined,
        });
      } else {
        onChange({
          startDate: startDate || undefined,
          endDate: parsed,
        });
      }
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

  const handleStartKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setActiveInput('end');
      endInputRef.current?.focus();
    }
  };

  const handleEndKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setActiveInput(null);
      endInputRef.current?.blur();
    }
  };

  const handleStartBlur = () => {
    if (!startInputText.trim()) {
      if (startDate) onChange({ startDate: undefined, endDate: endDate || undefined });
    } else {
      const parsed = parseDateString(startInputText);
      if (parsed) {
        setStartInputText(formatDateDisplay(parsed));
        const newEnd = endDate && parsed > endDate ? undefined : endDate || undefined;
        onChange({
          startDate: parsed,
          endDate: newEnd,
        });
      } else {
        setStartInputText(formatDateDisplay(startDate));
      }
    }
  };

  const handleEndBlur = () => {
    if (!endInputText.trim()) {
      if (endDate) onChange({ startDate: startDate || undefined, endDate: undefined });
    } else {
      const parsed = parseDateString(endInputText);
      if (parsed) {
        setEndInputText(formatDateDisplay(parsed));
        if (startDate && parsed < startDate) {
          onChange({
            startDate: parsed,
            endDate: undefined,
          });
        } else {
          onChange({
            startDate: startDate || undefined,
            endDate: parsed,
          });
        }
      } else {
        setEndInputText(formatDateDisplay(endDate));
      }
    }
  };

  const handleClearStart = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setStartInputText('');
    onChange({ startDate: undefined, endDate: endDate || undefined });
    startInputRef.current?.focus();
    setActiveInput('start');
  };

  const handleClearEnd = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setEndInputText('');
    onChange({ startDate: startDate || undefined, endDate: undefined });
    endInputRef.current?.focus();
    setActiveInput('end');
  };

  return (
    <div className="w-[270px] sm:w-[285px] p-3 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl space-y-2.5 select-none text-xs">
      {/* Input Box Row (Starting | Ending) */}
      <div className="grid grid-cols-2 gap-2">
        <div
          onClick={() => {
            setActiveInput('start');
            startInputRef.current?.focus();
          }}
          className={`relative flex items-center px-2.5 py-1.5 rounded-lg border bg-neutral-50/80 dark:bg-neutral-900/80 transition-all cursor-text ${
            activeInput === 'start'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-neutral-900'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
          }`}
        >
          <input
            ref={startInputRef}
            type="text"
            placeholder="Start"
            value={startInputText}
            onChange={handleStartChange}
            onKeyDown={handleStartKeyDown}
            onBlur={handleStartBlur}
            onFocus={() => setActiveInput('start')}
            className="w-full text-xs bg-transparent border-none outline-hidden text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 p-0 font-sans pr-4"
          />
          {startInputText && (
            <button
              type="button"
              onClick={handleClearStart}
              className="absolute right-1.5 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded cursor-pointer transition-colors"
              title="Clear start date"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div
          onClick={() => {
            setActiveInput('end');
            endInputRef.current?.focus();
          }}
          className={`relative flex items-center px-2.5 py-1.5 rounded-lg border bg-neutral-50/80 dark:bg-neutral-900/80 transition-all cursor-text ${
            activeInput === 'end'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-neutral-900'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
          }`}
        >
          <input
            ref={endInputRef}
            type="text"
            placeholder="End"
            value={endInputText}
            onChange={handleEndChange}
            onKeyDown={handleEndKeyDown}
            onBlur={handleEndBlur}
            onFocus={() => setActiveInput('end')}
            className="w-full text-xs bg-transparent border-none outline-hidden text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 p-0 font-sans pr-4"
          />
          {endInputText && (
            <button
              type="button"
              onClick={handleClearEnd}
              className="absolute right-1.5 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded cursor-pointer transition-colors"
              title="Clear end date"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Month & Year Navigation Header (e.g. "Aug 2026  Today < >") */}
      <div className="flex items-center justify-between pt-0.5 px-1">
        <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
          {MONTH_NAMES[navMonth]} {navYear}
        </span>
        <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
          <button
            type="button"
            onClick={handleJumpToday}
            className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 px-1.5 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Go to current month"
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
      <div
        className="space-y-1 pt-0.5"
        onMouseLeave={() => setHoverDate(null)}
      >
        {/* Days of Week Header (Mo Tu We Th Fr Sa Su) */}
        <div className="grid grid-cols-7 text-center text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
          {DAYS_OF_WEEK.map((day) => (
            <span key={day} className="py-0.5">
              {day}
            </span>
          ))}
        </div>

        {/* 7-column Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {gridCells.map((cell, idx) => {
            const isStart = cell.dateStr === startDate;
            const isEnd = cell.dateStr === endDate;
            const hasRange = Boolean(startDate && endDate);
            const isInRange = Boolean(hasRange && cell.dateStr > startDate && cell.dateStr < endDate);
            
            // Hover preview calculation when start is selected and end is not
            const isPreviewActive = Boolean(startDate && !endDate && hoverDate && hoverDate > startDate);
            const isInPreviewRange = Boolean(
              isPreviewActive && cell.dateStr > startDate && cell.dateStr < hoverDate!
            );
            const isHoverEnd = Boolean(isPreviewActive && cell.dateStr === hoverDate);

            const hasActiveConnector = hasRange || isPreviewActive;

            return (
              <div
                key={`${cell.dateStr}-${idx}`}
                className="relative flex items-center justify-center h-7"
                onMouseEnter={() => {
                  if (startDate && !endDate) {
                    setHoverDate(cell.dateStr);
                  }
                }}
              >
                {/* Background Range Connector */}
                {isInRange && (
                  <div className="absolute inset-0 bg-blue-100 dark:bg-blue-950/60 pointer-events-none" />
                )}
                {isInPreviewRange && (
                  <div className="absolute inset-0 bg-blue-50/80 dark:bg-blue-950/40 pointer-events-none" />
                )}
                {isStart && hasActiveConnector && (
                  <div
                    className={`absolute right-0 top-0 bottom-0 left-1/2 pointer-events-none ${
                      hasRange ? 'bg-blue-100 dark:bg-blue-950/60' : 'bg-blue-50/80 dark:bg-blue-950/40'
                    }`}
                  />
                )}
                {isEnd && hasRange && (
                  <div className="absolute left-0 top-0 bottom-0 right-1/2 bg-blue-100 dark:bg-blue-950/60 pointer-events-none" />
                )}
                {isHoverEnd && isPreviewActive && (
                  <div className="absolute left-0 top-0 bottom-0 right-1/2 bg-blue-50/80 dark:bg-blue-950/40 pointer-events-none" />
                )}

                {/* Date Button */}
                <button
                  type="button"
                  onClick={() => handleSelectDate(cell.dateStr)}
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs transition-all cursor-pointer relative z-10 ${
                    isStart || isEnd
                      ? 'bg-[#2383e2] text-white font-bold shadow-xs'
                      : isHoverEnd
                      ? 'bg-blue-400 text-white font-bold shadow-xs'
                      : cell.isToday && !isInRange && !isInPreviewRange
                      ? 'bg-[#ea5d50] text-white font-bold shadow-xs'
                      : isInRange
                      ? 'text-blue-700 dark:text-blue-200 font-semibold hover:bg-blue-200/50 dark:hover:bg-blue-900/50'
                      : isInPreviewRange
                      ? 'text-blue-600 dark:text-blue-300 font-medium'
                      : cell.isCurrentMonth
                      ? 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium'
                      : 'text-neutral-300 dark:text-neutral-600 hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                  }`}
                >
                  <span>{cell.dayNumber}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => {
            setStartInputText('');
            setEndInputText('');
            onClear();
          }}
          className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDeleteFilter}
          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
};
