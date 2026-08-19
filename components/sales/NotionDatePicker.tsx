"use client";

import { useState, useMemo, useRef } from 'react';
import type { FC, ChangeEvent, KeyboardEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  X,
} from 'lucide-react';
import {
  parseDateString,
  formatDateDisplay,
  formatIsoDate,
  generateCalendarGrid,
  MONTH_NAMES_SHORT as MONTH_NAMES,
  DAYS_OF_WEEK,
} from '@/lib/sales/dateUtils';

export type DateOperator =
  | 'exact'
  | 'before'
  | 'after'
  | 'on_or_before'
  | 'on_or_after'
  | 'between'
  | 'relative_today'
  | 'empty'
  | 'not_empty';

export type DateTargetField = 'start' | 'end';

export interface DateFilterConfig {
  targetField?: DateTargetField;
  operator: DateOperator;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

interface NotionDatePickerProps {
  value?: DateFilterConfig;
  onChange: (val: DateFilterConfig) => void;
  onClear: () => void;
  onDeleteFilter: () => void;
}

const FIELD_OPTIONS: { id: DateTargetField; label: string }[] = [
  { id: 'start', label: 'Start date' },
  { id: 'end', label: 'End date' },
];

const OPERATOR_OPTIONS: { id: DateOperator; label: string }[] = [
  { id: 'exact', label: 'is' },
  { id: 'before', label: 'is before' },
  { id: 'after', label: 'is after' },
  { id: 'on_or_before', label: 'is on or before' },
  { id: 'on_or_after', label: 'is on or after' },
  { id: 'between', label: 'is between' },
  { id: 'relative_today', label: 'is relative to today' },
  { id: 'empty', label: 'is empty' },
  { id: 'not_empty', label: 'is not empty' },
];

export const NotionDatePicker: FC<NotionDatePickerProps> = ({
  value = { operator: 'between', targetField: 'start' },
  onChange,
  onClear,
  onDeleteFilter,
}) => {
  const targetField = value.targetField || 'start';
  const operator = value.operator || 'between';
  const startDate = value.startDate || '';
  const endDate = value.endDate || '';

  const [activeInput, setActiveInput] = useState<'start' | 'end'>('start');
  const [isFieldMenuOpen, setIsFieldMenuOpen] = useState(false);
  const [isOperatorMenuOpen, setIsOperatorMenuOpen] = useState(false);

  const [startInputText, setStartInputText] = useState<string>(() =>
    formatDateDisplay(startDate)
  );
  const [endInputText, setEndInputText] = useState<string>(() =>
    formatDateDisplay(endDate)
  );

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  // Sync inputs with startDate and endDate props
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

  const gridCells = useMemo(() => generateCalendarGrid(navYear, navMonth), [navYear, navMonth]);

  const handleSelectDate = (dateStr: string) => {
    if (operator === 'between') {
      if (activeInput === 'start') {
        setStartInputText(formatDateDisplay(dateStr));
        onChange({
          ...value,
          startDate: dateStr,
          endDate: endDate && dateStr > endDate ? '' : endDate,
        });
        setActiveInput('end');
      } else {
        setEndInputText(formatDateDisplay(dateStr));
        if (startDate && dateStr < startDate) {
          onChange({
            ...value,
            startDate: dateStr,
            endDate: '',
          });
          setActiveInput('end');
        } else {
          onChange({
            ...value,
            endDate: dateStr,
          });
        }
      }
    } else {
      setStartInputText(formatDateDisplay(dateStr));
      onChange({
        ...value,
        startDate: dateStr,
        endDate: undefined,
      });
    }
  };

  const handleStartChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setStartInputText(text);

    if (!text.trim()) {
      onChange({ ...value, startDate: '' });
      return;
    }

    const parsed = parseDateString(text);
    if (parsed) {
      onChange({
        ...value,
        startDate: parsed,
        endDate: operator === 'between' && endDate && parsed > endDate ? '' : endDate,
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
      onChange({ ...value, endDate: '' });
      return;
    }

    const parsed = parseDateString(text);
    if (parsed) {
      onChange({
        ...value,
        endDate: parsed,
        startDate: startDate && parsed < startDate ? parsed : startDate,
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

  const handleStartKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (operator === 'between') {
        setActiveInput('end');
        endInputRef.current?.focus();
      }
    }
  };

  const handleStartBlur = () => {
    if (!startInputText.trim()) {
      if (startDate) onChange({ ...value, startDate: '' });
    } else {
      const parsed = parseDateString(startInputText);
      if (parsed) {
        setStartInputText(formatDateDisplay(parsed));
        onChange({
          ...value,
          startDate: parsed,
          endDate: operator === 'between' && endDate && parsed > endDate ? '' : endDate,
        });
      } else {
        setStartInputText(formatDateDisplay(startDate));
      }
    }
  };

  const handleEndBlur = () => {
    if (!endInputText.trim()) {
      if (endDate) onChange({ ...value, endDate: '' });
    } else {
      const parsed = parseDateString(endInputText);
      if (parsed) {
        setEndInputText(formatDateDisplay(parsed));
        onChange({
          ...value,
          endDate: parsed,
          startDate: startDate && parsed < startDate ? parsed : startDate,
        });
      } else {
        setEndInputText(formatDateDisplay(endDate));
      }
    }
  };

  const isNoDateNeeded = operator === 'empty' || operator === 'not_empty';

  return (
    <div className="w-[270px] sm:w-[285px] p-3 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl space-y-3 select-none text-xs">
      {/* Top Header Row: [Start date ⌄] [is between ⌄] */}
      <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
        {/* 1. Field Dropdown (Start date / End date) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsFieldMenuOpen(!isFieldMenuOpen);
              setIsOperatorMenuOpen(false);
            }}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold transition-colors cursor-pointer"
          >
            <span>{FIELD_OPTIONS.find((f) => f.id === targetField)?.label || 'Start date'}</span>
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          {isFieldMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-32 p-1 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl space-y-0.5">
              {FIELD_OPTIONS.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => {
                    onChange({ ...value, targetField: f.id });
                    setIsFieldMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    targetField === f.id
                      ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Operator Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsOperatorMenuOpen(!isOperatorMenuOpen);
              setIsFieldMenuOpen(false);
            }}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold transition-colors cursor-pointer"
          >
            <span>{OPERATOR_OPTIONS.find((o) => o.id === operator)?.label || 'is between'}</span>
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          {isOperatorMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-44 p-1 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl space-y-0.5 max-h-64 overflow-y-auto">
              {OPERATOR_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => {
                    onChange({ ...value, operator: opt.id });
                    setIsOperatorMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    operator === opt.id
                      ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isNoDateNeeded && (
        <>
          {/* Input Box Row (Starting | Ending) */}
          {operator === 'between' ? (
            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => {
                  setActiveInput('start');
                  startInputRef.current?.focus();
                }}
                className={`flex items-center px-2.5 py-1.5 rounded-lg border bg-neutral-50/80 dark:bg-neutral-900/80 transition-all cursor-text ${
                  activeInput === 'start'
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-neutral-900'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <input
                  ref={startInputRef}
                  type="text"
                  placeholder="Starting (DD/MM)"
                  value={startInputText}
                  onChange={handleStartChange}
                  onKeyDown={handleStartKeyDown}
                  onBlur={handleStartBlur}
                  onFocus={() => setActiveInput('start')}
                  className="w-full text-xs bg-transparent border-none outline-hidden text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 p-0 font-sans"
                />
              </div>

              <div
                onClick={() => {
                  setActiveInput('end');
                  endInputRef.current?.focus();
                }}
                className={`flex items-center px-2.5 py-1.5 rounded-lg border bg-neutral-50/80 dark:bg-neutral-900/80 transition-all cursor-text ${
                  activeInput === 'end'
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-neutral-900'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <input
                  ref={endInputRef}
                  type="text"
                  placeholder="Ending (DD/MM)"
                  value={endInputText}
                  onChange={handleEndChange}
                  onBlur={handleEndBlur}
                  onFocus={() => setActiveInput('end')}
                  className="w-full text-xs bg-transparent border-none outline-hidden text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 p-0 font-sans"
                />
              </div>
            </div>
          ) : (
            <div
              className="flex items-center px-2.5 py-1.5 rounded-lg border border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-neutral-900 transition-all"
            >
              <input
                ref={startInputRef}
                type="text"
                placeholder={operator === 'relative_today' ? 'Relative to today' : 'DD/MM/YYYY'}
                value={startInputText}
                onChange={handleStartChange}
                onBlur={handleStartBlur}
                className="w-full text-xs bg-transparent border-none outline-hidden text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 p-0 font-sans"
              />
              {startInputText && (
                <button
                  type="button"
                  onClick={() => {
                    setStartInputText('');
                    onChange({ ...value, startDate: '' });
                    startInputRef.current?.focus();
                  }}
                  className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Month & Year Navigation Header (e.g. "Aug 2026  < >") */}
          <div className="flex items-center justify-between pt-1 px-1">
            <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
              {MONTH_NAMES[navMonth]} {navYear}
            </span>
            <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
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
          <div className="space-y-1 pt-1">
            {/* Days of Week Header (Mo Tu We Th Fr Sa Su) */}
            <div className="grid grid-cols-7 text-center text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
              {DAYS_OF_WEEK.map((day) => (
                <span key={day} className="py-0.5">
                  {day}
                </span>
              ))}
            </div>

            {/* 7-column Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center text-xs">
              {gridCells.map((cell, idx) => {
                const isStart = cell.dateStr === startDate;
                const isEnd = cell.dateStr === endDate;
                const isSelectedEndpoint = isStart || isEnd;
                const isInRange = Boolean(startDate && endDate && cell.dateStr > startDate && cell.dateStr < endDate);

                return (
                  <button
                    type="button"
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => handleSelectDate(cell.dateStr)}
                    className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center text-xs transition-all cursor-pointer relative ${
                      isSelectedEndpoint
                        ? 'bg-[#2383e2] text-white font-bold shadow-xs'
                        : cell.isToday
                        ? 'bg-[#ea5d50] text-white font-bold shadow-xs'
                        : isInRange
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-none'
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
        </>
      )}

      {/* Footer Actions */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={onClear}
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
