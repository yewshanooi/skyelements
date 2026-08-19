"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC, ChangeEvent, KeyboardEvent } from 'react';
import {
  X,
  ChevronDown,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TableProperties,
  FileText,
  RotateCcw,
} from 'lucide-react';
import type { SaleItem } from '@/types/sales';
import {
  FORMULA_COLUMNS,
  DEFAULT_FORMULA,
  evaluateFormulaDetails,
  type FormulaColumnDef,
} from '@/lib/sales/formulaEngine';


export interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleItem[];
  currentFormula?: string;
  onSaveFormula: (formula: string) => void;
}

interface FunctionDoc {
  name: string;
  signature: string;
  category: 'Math' | 'Logic' | 'Utility';
  description: string;
  example: string;
}

const AVAILABLE_FUNCTIONS: FunctionDoc[] = [
  {
    name: 'round',
    signature: 'round(value, decimals)',
    category: 'Math',
    description: 'Rounds a number to specified decimal places (default 0).',
    example: 'round(# Subtotal (in MYR) - # Cost(s) , 2)',
  },
  {
    name: 'if',
    signature: 'if(condition, ifTrue, ifFalse)',
    category: 'Logic',
    description: 'Returns second argument if condition is true, otherwise third.',
    example: 'if(# Subtotal (in MYR) > 100, # Subtotal (in MYR) * 0.9, # Subtotal (in MYR))',
  },
  {
    name: 'min',
    signature: 'min(a, b, ...)',
    category: 'Math',
    description: 'Returns the minimum value from the given arguments.',
    example: 'min(# Subtotal (in MYR), 50)',
  },
  {
    name: 'max',
    signature: 'max(a, b, ...)',
    category: 'Math',
    description: 'Returns the maximum value from the given arguments.',
    example: 'max(0, # Subtotal (in MYR) - # Cost(s))',
  },
  {
    name: 'add',
    signature: 'add(a, b, ...)',
    category: 'Math',
    description: 'Adds two or more numbers together (or use + operator).',
    example: 'add(# Subtotal (in MYR), 10)',
  },
  {
    name: 'subtract',
    signature: 'subtract(a, b)',
    category: 'Math',
    description: 'Subtracts second number from first (or use - operator).',
    example: 'subtract(# Subtotal (in MYR), # Cost(s))',
  },
  {
    name: 'multiply',
    signature: 'multiply(a, b, ...)',
    category: 'Math',
    description: 'Multiplies two or more numbers (or use * operator).',
    example: 'multiply(# Quantity, # Subtotal (in MYR))',
  },
  {
    name: 'divide',
    signature: 'divide(a, b)',
    category: 'Math',
    description: 'Divides first number by second (or use / operator).',
    example: 'divide(# Subtotal (in MYR), # Quantity)',
  },
  {
    name: 'abs',
    signature: 'abs(value)',
    category: 'Math',
    description: 'Returns the absolute (positive) value of a number.',
    example: 'abs(# Subtotal (in MYR) - # Cost(s))',
  },
  {
    name: 'ceil',
    signature: 'ceil(value)',
    category: 'Math',
    description: 'Rounds a number up to the nearest integer.',
    example: 'ceil(# Subtotal (in MYR))',
  },
  {
    name: 'floor',
    signature: 'floor(value)',
    category: 'Math',
    description: 'Rounds a number down to the nearest integer.',
    example: 'floor(# Subtotal (in MYR))',
  },
  {
    name: 'sqrt',
    signature: 'sqrt(value)',
    category: 'Math',
    description: 'Returns the square root of a non-negative number.',
    example: 'sqrt(# Subtotal (in MYR))',
  },
  {
    name: 'pow',
    signature: 'pow(base, exponent)',
    category: 'Math',
    description: 'Returns base raised to power of exponent (also power).',
    example: 'pow(# Subtotal (in MYR), 2)',
  },
];

interface TokenSegment {
  type: 'function' | 'column' | 'number' | 'string' | 'operator' | 'text';
  text: string;
}

const FUNCTIONS = new Set([
  'round',
  'min',
  'max',
  'abs',
  'if',
  'sum',
  'avg',
  'multiply',
  'divide',
  'add',
  'subtract',
  'ceil',
  'floor',
  'sqrt',
  'pow',
  'power',
  'concat',
  'length',
  'contains',
  'format',
  'now',
  'date',
]);

function getColumnTokenPatterns(): string[] {
  const tokens: string[] = [];
  for (const col of FORMULA_COLUMNS) {
    tokens.push(col.token);
    for (const a of col.aliases) {
      if (a.startsWith('#')) {
        tokens.push(a);
      }
    }
  }
  return Array.from(new Set(tokens)).sort((a, b) => b.length - a.length);
}

const COLUMN_PATTERNS = getColumnTokenPatterns();

function tokenizeFormula(formula: string): TokenSegment[] {
  const segments: TokenSegment[] = [];
  let i = 0;

  while (i < formula.length) {
    // 1. Column token starting with '#'
    if (formula[i] === '#') {
      let matchedCol = '';
      for (const pattern of COLUMN_PATTERNS) {
        if (formula.slice(i, i + pattern.length).toLowerCase() === pattern.toLowerCase()) {
          matchedCol = formula.slice(i, i + pattern.length);
          break;
        }
      }

      if (matchedCol) {
        segments.push({ type: 'column', text: matchedCol });
        i += matchedCol.length;
        continue;
      }

      // Generic # column pattern (e.g. # Column Name or # Column(s))
      const genericMatch = formula
        .slice(i)
        .match(/^#\s*[a-zA-Z0-9_]+(?:\s*\([a-zA-Z0-9_ ]+\))?(?:\s+[a-zA-Z0-9_]+)*/);
      if (genericMatch) {
        segments.push({ type: 'column', text: genericMatch[0] });
        i += genericMatch[0].length;
        continue;
      }

      segments.push({ type: 'column', text: '#' });
      i += 1;
      continue;
    }

    // 2. Strings: "..." or '...'
    if (formula[i] === '"' || formula[i] === "'") {
      const quote = formula[i];
      let str = quote;
      let j = i + 1;
      while (j < formula.length && formula[j] !== quote) {
        if (formula[j] === '\\' && j + 1 < formula.length) {
          str += formula[j] + formula[j + 1];
          j += 2;
        } else {
          str += formula[j];
          j++;
        }
      }
      if (j < formula.length) {
        str += formula[j];
        j++;
      }
      segments.push({ type: 'string', text: str });
      i = j;
      continue;
    }

    // 3. Numbers
    const numMatch = formula.slice(i).match(/^\d+(?:\.\d+)?/);
    if (numMatch) {
      segments.push({ type: 'number', text: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }

    // 4. Identifiers / Functions
    const wordMatch = formula.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      if (FUNCTIONS.has(word.toLowerCase())) {
        segments.push({ type: 'function', text: word });
      } else {
        segments.push({ type: 'text', text: word });
      }
      i += word.length;
      continue;
    }

    // 5. Operators & punctuation
    const opMatch = formula.slice(i).match(/^(?:>=|<=|==|!=|&&|\|\||[+\-*/%><=(),])/);
    if (opMatch) {
      segments.push({ type: 'operator', text: opMatch[0] });
      i += opMatch[0].length;
      continue;
    }

    // 6. Whitespace
    const wsMatch = formula.slice(i).match(/^\s+/);
    if (wsMatch) {
      segments.push({ type: 'text', text: wsMatch[0] });
      i += wsMatch[0].length;
      continue;
    }

    segments.push({ type: 'text', text: formula[i] });
    i += 1;
  }

  return segments;
}

const normalizeFormula = (f?: string) => {
  if (!f) return DEFAULT_FORMULA;
  if (f === 'round( # Subtotal (in MYR) - # Cost(s) , 2)') return DEFAULT_FORMULA;
  return f.replace(/round\(\s+#/g, 'round(#');
};

const FormulaModalContent: FC<Omit<FormulaModalProps, 'isOpen'>> = ({
  onClose,
  sales,
  currentFormula = DEFAULT_FORMULA,
  onSaveFormula,
}) => {
  const [formula, setFormula] = useState(() => normalizeFormula(currentFormula));
  const [selectedItemId, setSelectedItemId] = useState<string>(sales[0]?.id || '');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Column Autocomplete State triggered by '#'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownQuery, setDropdownQuery] = useState('');
  const [dropdownTriggerIndex, setDropdownTriggerIndex] = useState<number>(-1);
  const [dropdownSelectedIndex, setDropdownSelectedIndex] = useState<number>(0);

  // Custom Preview With Dropdown State
  const [isPreviewPickerOpen, setIsPreviewPickerOpen] = useState(false);
  const [previewSearchQuery, setPreviewSearchQuery] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previewPickerRef = useRef<HTMLDivElement>(null);
  const previewSearchInputRef = useRef<HTMLInputElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Focus search input when Preview With picker opens
  useEffect(() => {
    if (isPreviewPickerOpen) {
      const timer = setTimeout(() => {
        previewSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isPreviewPickerOpen]);

  // Click outside listener for all popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        textareaRef.current &&
        !textareaRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
      if (previewPickerRef.current && !previewPickerRef.current.contains(target)) {
        setIsPreviewPickerOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(target)) {
        setIsHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const previewItem: SaleItem = useMemo(() => {
    return (
      sales.find((s) => s.id === selectedItemId) ||
      sales[0] || {
        id: 'preview',
        item: 'Animal Kaiser - Ninja Trained Sig...',
        customer: 'wenhui92',
        subtotal: 25.53,
        cost: 2.0,
        sales: 23.53,
        quantity: 1,
        marketplace: 'Shopee',
        category: 'Trading Card Games',
        order_status: 'Delivered',
        payment_status: 'Paid',
        payment_method: 'Online Banking',
        date: '2026-08-17',
      }
    );
  }, [sales, selectedItemId]);

  const evaluationDetails = useMemo(() => {
    return evaluateFormulaDetails(formula, previewItem);
  }, [formula, previewItem]);

  const tokenizedFormula = useMemo(() => {
    return tokenizeFormula(formula);
  }, [formula]);

  // Filter columns based on the dropdown query
  const filteredColumns = useMemo(() => {
    const q = dropdownQuery.toLowerCase().trim();
    if (!q) return FORMULA_COLUMNS;
    return FORMULA_COLUMNS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.token.toLowerCase().includes(q) ||
        c.aliases.some((a) => a.toLowerCase().includes(q)) ||
        c.description.toLowerCase().includes(q)
    );
  }, [dropdownQuery]);

  // Filter sales items in preview picker
  const filteredPreviewSales = useMemo(() => {
    const q = previewSearchQuery.toLowerCase().trim();
    if (!q) return sales;
    return sales.filter(
      (s) =>
        (s.item || '').toLowerCase().includes(q) ||
        (s.customer || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
    );
  }, [sales, previewSearchQuery]);

  // Check text before cursor to see if user is typing a '#' prefix
  const checkAutocompleteTrigger = (val: string, cursorPos: number) => {
    const textBefore = val.slice(0, cursorPos);
    const hashMatch = textBefore.match(/#([a-zA-Z0-9_() ]*)$/);

    if (hashMatch) {
      const query = hashMatch[1];
      const triggerIdx = textBefore.lastIndexOf('#');
      setDropdownTriggerIndex(triggerIdx);
      setDropdownQuery(query);
      setIsDropdownOpen(true);
      setDropdownSelectedIndex(0);
    } else {
      setIsDropdownOpen(false);
    }
  };

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setFormula(val);
    checkAutocompleteTrigger(val, cursorPos);
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Insert a selected column token into the formula
  const handleSelectColumn = (col: FormulaColumnDef) => {
    const textarea = textareaRef.current;
    const tokenToInsert = `${col.token} `;

    if (dropdownTriggerIndex >= 0 && textarea) {
      const cursorPos = textarea.selectionStart;
      const before = formula.slice(0, dropdownTriggerIndex);
      const after = formula.slice(cursorPos);
      const newFormula = before + tokenToInsert + after;

      setFormula(newFormula);
      setIsDropdownOpen(false);
      setDropdownTriggerIndex(-1);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = dropdownTriggerIndex + tokenToInsert.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 10);
    } else {
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = formula.slice(0, start);
        const after = formula.slice(end);
        const newFormula = before + tokenToInsert + after;
        setFormula(newFormula);

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const newPos = start + tokenToInsert.length;
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        }, 10);
      } else {
        setFormula((prev) => prev + ' ' + tokenToInsert);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      return;
    }

    if (!isDropdownOpen || filteredColumns.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDropdownSelectedIndex((prev) => (prev + 1) % filteredColumns.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDropdownSelectedIndex(
        (prev) => (prev - 1 + filteredColumns.length) % filteredColumns.length
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selectedCol = filteredColumns[dropdownSelectedIndex];
      if (selectedCol) {
        handleSelectColumn(selectedCol);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
  };

  const handleSave = () => {
    onSaveFormula(formula);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-visible flex flex-col select-text"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 rounded-t-2xl">
          <div className="flex items-center gap-1.5 leading-none">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-sans leading-none">
              Edit formula
            </h2>
            <div className="relative flex items-center" ref={helpRef}>
              <button
                type="button"
                onClick={() => setIsHelpOpen(!isHelpOpen)}
                className="flex items-center justify-center p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Formula help & all available functions"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* All Available Functions Reference Popover */}
              {isHelpOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-96 max-w-[calc(100vw-32px)] bg-white dark:bg-[#222222] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-3.5 space-y-2.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Formula Reference
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsHelpOpen(false)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Full Functions List */}
                  <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
                    {AVAILABLE_FUNCTIONS.map((fn) => (
                      <div
                        key={fn.name}
                        className="p-2 rounded-xl bg-neutral-50 dark:bg-[#1c1c1c] border border-neutral-200/70 dark:border-neutral-800 space-y-1 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono font-semibold text-xs text-pink-600 dark:text-pink-400">
                            {fn.signature}
                          </span>
                          <span className="px-1.5 py-0.2 bg-neutral-200/60 dark:bg-neutral-800 text-[10px] text-neutral-500 dark:text-neutral-400 rounded font-mono shrink-0">
                            {fn.category}
                          </span>
                        </div>

                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                          {fn.description}
                        </p>

                        <div
                          onClick={() => {
                            setFormula(fn.example);
                            setIsHelpOpen(false);
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-[#242424] hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-neutral-200/60 dark:border-neutral-700/60 text-[10.5px] font-mono text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors flex items-center justify-between group"
                          title="Click to use this formula"
                        >
                          <span className="truncate pr-2">{fn.example}</span>
                          <ArrowRight className="w-3 h-3 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Formula Editor Container with Highlighted Backdrop and Autocomplete */}
          <div className="relative">
            <div
              className="relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-[#161616] min-h-[90px] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text flex flex-col justify-start overflow-hidden shadow-2xs"
              onClick={() => textareaRef.current?.focus()}
            >
              {/* Syntax Highlighted Backdrop Layer */}
              <div
                ref={backdropRef}
                aria-hidden="true"
                className="absolute inset-0 p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words pointer-events-none select-none overflow-y-auto"
              >
                {formula ? (
                  tokenizedFormula.map((tok, idx) => {
                    if (tok.type === 'column') {
                      return (
                        <span
                          key={idx}
                          className="bg-[#e3e2e0] dark:bg-[#37352f] text-neutral-800 dark:text-neutral-100 rounded px-1.5 py-0.5 font-mono text-[11px] font-medium inline-flex items-center align-baseline shadow-2xs mx-0.5"
                        >
                          {tok.text}
                        </span>
                      );
                    }
                    if (tok.type === 'function') {
                      return (
                        <span
                          key={idx}
                          className="text-[#d44040] dark:text-[#f87171] font-mono font-medium"
                        >
                          {tok.text}
                        </span>
                      );
                    }
                    if (tok.type === 'number') {
                      return (
                        <span
                          key={idx}
                          className="text-[#d44040] dark:text-[#f87171] font-mono"
                        >
                          {tok.text}
                        </span>
                      );
                    }
                    if (tok.type === 'string') {
                      return (
                        <span
                          key={idx}
                          className="text-emerald-600 dark:text-emerald-400 font-mono"
                        >
                          {tok.text}
                        </span>
                      );
                    }
                    if (tok.type === 'operator') {
                      return (
                        <span
                          key={idx}
                          className="text-neutral-600 dark:text-neutral-300 font-mono"
                        >
                          {tok.text}
                        </span>
                      );
                    }
                    return (
                      <span
                        key={idx}
                        className="text-neutral-900 dark:text-neutral-100 font-mono"
                      >
                        {tok.text}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-neutral-400 font-mono text-xs">
                    Type formula (e.g. round(# Subtotal (in MYR) - # Cost(s) , 2) or type # for column options)
                  </span>
                )}
              </div>

              {/* Editable Textarea Layer */}
              <textarea
                ref={textareaRef}
                value={formula}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onClick={(e) => {
                  const cursorPos = (e.target as HTMLTextAreaElement).selectionStart;
                  checkAutocompleteTrigger(formula, cursorPos);
                }}
                onKeyUp={(e) => {
                  const cursorPos = (e.target as HTMLTextAreaElement).selectionStart;
                  checkAutocompleteTrigger(formula, cursorPos);
                }}
                onScroll={handleScroll}
                rows={3}
                className="relative w-full h-full min-h-[90px] p-3.5 bg-transparent text-transparent caret-neutral-900 dark:caret-white font-mono text-xs leading-relaxed resize-none border-none outline-none z-10 selection:bg-blue-500/25 selection:text-transparent"
                placeholder=""
                spellCheck={false}
              />
            </div>

            {/* Autocomplete Dropdown Menu when typing '#' */}
            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-[#252525] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-2 bg-neutral-50 dark:bg-[#1e1e1e] border-b border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                    <TableProperties className="w-3.5 h-3.5 text-blue-500" />
                    <span>Select Column to Insert</span>
                    {dropdownQuery && (
                      <span className="text-neutral-400 font-mono">#{dropdownQuery}</span>
                    )}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    ↑↓ to navigate, ↵ to select
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredColumns.length === 0 ? (
                    <div className="p-3.5 text-center text-neutral-400 text-xs">
                      No matching columns found for "#{dropdownQuery}"
                    </div>
                  ) : (
                    filteredColumns.map((col, idx) => {
                      const isSelected = idx === dropdownSelectedIndex;
                      const previewVal = col.getValue(previewItem);
                      const displayVal =
                        col.type === 'number'
                          ? `RM ${Number(previewVal).toFixed(2)}`
                          : String(previewVal || '—');

                      return (
                        <div
                          key={col.id}
                          onClick={() => handleSelectColumn(col)}
                          onMouseEnter={() => setDropdownSelectedIndex(idx)}
                          className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/50 border-l-3 border-blue-600'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60 border-l-3 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm shrink-0">{col.icon}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                                  {col.token}
                                </span>
                                <span className="px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                                  {col.type}
                                </span>
                              </div>
                              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                                {col.description}
                              </div>
                            </div>
                          </div>

                          <div className="text-right pl-3 shrink-0">
                            <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              = {displayVal}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview Row & Evaluated Result (Notion Sample Style) */}
          <div className="space-y-2 pt-0.5">
            {/* Preview With Dropdown Selector */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 dark:text-neutral-400 text-xs">Preview with</span>
              <div className="relative inline-block" ref={previewPickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewPickerOpen(!isPreviewPickerOpen);
                    setPreviewSearchQuery('');
                  }}
                  className="px-2.5 py-1 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 cursor-pointer max-w-[320px] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate">{previewItem.item || 'Untitled Order'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-0.5" />
                </button>

                {/* Custom "Preview with" Dropdown Popover matching Sales Dashboard Popovers */}
                {isPreviewPickerOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-32px)] bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                    <div className="relative">
                      <input
                        ref={previewSearchInputRef}
                        type="text"
                        value={previewSearchQuery}
                        onChange={(e) => setPreviewSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#181818] border border-blue-500 ring-2 ring-blue-500/20 rounded-lg outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      {filteredPreviewSales.length === 0 ? (
                        <div className="p-3 text-center text-xs text-neutral-400">
                          No matching orders found
                        </div>
                      ) : (
                        filteredPreviewSales.map((s) => {
                          const isSelected = s.id === selectedItemId;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedItemId(s.id);
                                setIsPreviewPickerOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors cursor-pointer group ${
                                isSelected
                                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium'
                                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <FileText className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 shrink-0" />
                                <span className="truncate">{s.item || 'Untitled Order'}</span>
                              </div>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200 shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Evaluated Value & Type Badge */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold font-mono text-neutral-900 dark:text-neutral-100">
                  {evaluationDetails.formattedResult}
                </span>
                {!evaluationDetails.isValid && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-sans">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{evaluationDetails.error || 'Syntax warning'}</span>
                  </span>
                )}
              </div>

              <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                Type: {evaluationDetails.type}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/40 rounded-b-2xl">
          <button
            type="button"
            onClick={() => setFormula(DEFAULT_FORMULA)}
            className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-2 py-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Default</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FormulaModal: FC<FormulaModalProps> = ({
  isOpen,
  onClose,
  sales,
  currentFormula = DEFAULT_FORMULA,
  onSaveFormula,
}) => {
  if (!isOpen) return null;

  return (
    <FormulaModalContent
      onClose={onClose}
      sales={sales}
      currentFormula={currentFormula}
      onSaveFormula={onSaveFormula}
    />
  );
};
