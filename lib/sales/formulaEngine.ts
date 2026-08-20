import type { SaleItem } from '@/types/sales';

export interface FormulaColumnDef {
  id: string;
  name: string;
  token: string;
  aliases: string[];
  icon: string;
  type: 'number' | 'string' | 'date';
  getValue: (item: Partial<SaleItem> | null | undefined) => number | string;
  description: string;
}

export const FORMULA_COLUMNS: FormulaColumnDef[] = [
  {
    id: 'subtotal',
    name: 'Subtotal (in MYR)',
    token: '# Subtotal (in MYR)',
    aliases: [
      '# Subtotal (in MYR)',
      '#Subtotal (in MYR)',
      '# Subtotal',
      '#Subtotal',
      'Subtotal (in MYR)',
      'Subtotal',
      'subtotal',
    ],
    icon: '🏷️',
    type: 'number',
    getValue: (item) => Number(item?.subtotal ?? 0),
    description: 'Gross line total amount before costs (RM)',
  },
  {
    id: 'cost',
    name: 'Cost(s)',
    token: '# Cost(s)',
    aliases: [
      '# Cost(s)',
      '#Cost(s)',
      '# Cost',
      '#Cost',
      'Cost(s)',
      'Cost',
      'cost',
    ],
    icon: '🏷️',
    type: 'number',
    getValue: (item) => Number(item?.cost ?? 0),
    description: 'Cost and item expenses (RM)',
  },
  {
    id: 'quantity',
    name: 'Quantity',
    token: '# Quantity',
    aliases: ['# Quantity', '#Quantity', 'Quantity', 'quantity', 'qty'],
    icon: '🔢',
    type: 'number',
    getValue: (item) => Number(item?.quantity ?? 1),
    description: 'Number of items sold',
  },
  {
    id: 'sales',
    name: 'Sales (in MYR)',
    token: '# Sales (in MYR)',
    aliases: [
      '# Sales (in MYR)',
      '#Sales (in MYR)',
      '# Sales',
      '#Sales',
      'Sales (in MYR)',
      'Sales',
      'sales',
    ],
    icon: '𝑓',
    type: 'number',
    getValue: (item) => {
      if (item?.sales !== undefined && item.sales !== null && !isNaN(Number(item.sales))) {
        return Number(item.sales);
      }
      return Number((Number(item?.subtotal ?? 0) - Number(item?.cost ?? 0)).toFixed(2));
    },
    description: 'Calculated net sales / profit (RM)',
  },
  {
    id: 'item',
    name: 'Order',
    token: '# Order',
    aliases: ['# Order', '#Order', 'Order', 'order', '# Item', '#Item', 'Item', 'item'],
    icon: '📦',
    type: 'string',
    getValue: (item) => String(item?.item ?? ''),
    description: 'Order name / product title',
  },
  {
    id: 'category',
    name: 'Category',
    token: '# Category',
    aliases: ['# Category', '#Category', 'Category', 'category'],
    icon: '🏷️',
    type: 'string',
    getValue: (item) => String(item?.category ?? ''),
    description: 'Product category grouping',
  },
  {
    id: 'marketplace',
    name: 'Store',
    token: '# Store',
    aliases: ['# Store', '#Store', '# Marketplace', '#Marketplace', 'Marketplace', 'Store', 'marketplace', 'store'],
    icon: '🏪',
    type: 'string',
    getValue: (item) => String(item?.marketplace ?? ''),
    description: 'Sales channel or store (Shopee, Carousell)',
  },
  {
    id: 'payment_method',
    name: 'Payment Method',
    token: '# Payment Method',
    aliases: ['# Payment Method', '#Payment Method', '#PaymentMethod', 'Payment Method', 'payment_method'],
    icon: '💳',
    type: 'string',
    getValue: (item) => String(item?.payment_method ?? ''),
    description: 'Payment method used',
  },
  {
    id: 'customer',
    name: 'Customer',
    token: '# Customer',
    aliases: ['# Customer', '#Customer', 'Customer', 'customer'],
    icon: '👤',
    type: 'string',
    getValue: (item) => String(item?.customer ?? ''),
    description: 'Customer or buyer name',
  },
  {
    id: 'date',
    name: 'Date',
    token: '# Date',
    aliases: ['# Date', '#Date', 'Date', 'date'],
    icon: '📅',
    type: 'date',
    getValue: (item) => String(item?.date ?? ''),
    description: 'Order transaction date (YYYY-MM-DD)',
  },
  {
    id: 'order_status',
    name: 'Order Status',
    token: '# Order Status',
    aliases: ['# Order Status', '#OrderStatus', 'order_status'],
    icon: '🚚',
    type: 'string',
    getValue: (item) => String(item?.order_status ?? ''),
    description: 'Fulfillment order status (Processing, Shipped, Delivered)',
  },
  {
    id: 'payment_status',
    name: 'Payment Status',
    token: '# Payment Status',
    aliases: ['# Payment Status', '#PaymentStatus', 'payment_status'],
    icon: '💳',
    type: 'string',
    getValue: (item) => String(item?.payment_status ?? ''),
    description: 'Payment settlement status (Paid, Processing, On Hold)',
  },
];

export const DEFAULT_FORMULA = 'round(# Subtotal (in MYR) - # Cost(s) , 2)';
export const STORAGE_KEY_FORMULA = 'sales_dashboard_formula_v2';

export interface FormulaDetails {
  isValid: boolean;
  result: unknown;
  numericValue: number;
  formattedResult: string;
  type: 'number' | 'string' | 'boolean' | 'error';
  substitutedExpr: string;
  error?: string;
  variables: { token: string; value: number | string; colId: string }[];
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const RE_DANGEROUS = /(window|document|localStorage|sessionStorage|fetch|eval|Function|process|global|import|require)/i;
const RE_IF_KEYWORD = /\bif\s*\(/gi;

// Static Math and utility scope functions (instantiated once, reused for all evaluations)
const MATH_FUNCS: Record<string, (...args: unknown[]) => unknown> = {
  round: (val: unknown, decimals: unknown = 0) => {
    const num = Number(val);
    if (isNaN(num)) return 0;
    const factor = Math.pow(10, Math.max(0, Number(decimals) || 0));
    return Math.round((num + Number.EPSILON) * factor) / factor;
  },
  multiply: (...args: unknown[]) => (args.length === 0 ? 0 : args.reduce((acc: number, v: unknown) => acc * Number(v || 0), 1)),
  divide: (a: unknown, b: unknown) => (Number(b || 0) === 0 ? 0 : Number(a || 0) / Number(b || 0)),
  add: (...args: unknown[]) => args.reduce((acc: number, v: unknown) => acc + Number(v || 0), 0),
  subtract: (a: unknown, b: unknown) => Number(a || 0) - Number(b || 0),
  min: (...args: unknown[]) => Math.min(...args.map((x) => Number(x || 0))),
  max: (...args: unknown[]) => Math.max(...args.map((x) => Number(x || 0))),
  abs: (x: unknown) => Math.abs(Number(x || 0)),
  ceil: (x: unknown) => Math.ceil(Number(x || 0)),
  floor: (x: unknown) => Math.floor(Number(x || 0)),
  sqrt: (x: unknown) => Math.sqrt(Math.max(0, Number(x || 0))),
  pow: (a: unknown, b: unknown) => Math.pow(Number(a || 0), Number(b || 0)),
  power: (a: unknown, b: unknown) => Math.pow(Number(a || 0), Number(b || 0)),
  _if: (cond: unknown, ifTrue: unknown, ifFalse: unknown) => (cond ? ifTrue : ifFalse),
  iff: (cond: unknown, ifTrue: unknown, ifFalse: unknown) => (cond ? ifTrue : ifFalse),
};

const STATIC_SCOPE: Record<string, unknown> = {};
for (const [key, fn] of Object.entries(MATH_FUNCS)) {
  STATIC_SCOPE[key] = fn;
  STATIC_SCOPE[key.toUpperCase()] = fn;
}

const STATIC_SCOPE_KEYS = Object.keys(STATIC_SCOPE);
const STATIC_SCOPE_VALUES = Object.values(STATIC_SCOPE);

// Pre-compiled token replacement rules from FORMULA_COLUMNS
const TOKEN_REPLACERS = FORMULA_COLUMNS.flatMap((col) =>
  col.aliases.map((alias) => ({
    col,
    alias,
    pattern: alias.startsWith('#')
      ? new RegExp(escapeRegex(alias), 'gi')
      : new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi'),
  }))
);

/**
 * Checks whether the formula string represents the standard default profit formula.
 */
function isDefaultFormula(formulaStr?: string | null): boolean {
  if (!formulaStr) return true;
  const normalized = formulaStr.replace(/\s+/g, '').toLowerCase();
  return (
    normalized === 'round(#subtotal(inmyr)-#cost(s),2)' ||
    normalized === 'round(#subtotal(inmyr)-#cost,2)' ||
    normalized === 'round(#subtotal-#cost(s),2)' ||
    normalized === 'round(#subtotal-#cost,2)' ||
    normalized === '#subtotal(inmyr)-#cost(s)' ||
    normalized === '#subtotal-#cost' ||
    normalized === 'subtotal-cost' ||
    normalized === ''
  );
}

/**
 * Replaces column tokens in formula with row values.
 */
export function substituteFormulaTokens(
  formulaStr: string,
  item: Partial<SaleItem> | null | undefined
): { expr: string; variables: { token: string; value: number | string; colId: string }[] } {
  let expr = formulaStr || '';
  const variables: { token: string; value: number | string; colId: string }[] = [];
  const recordedCols = new Set<string>();

  for (const { col, pattern } of TOKEN_REPLACERS) {
    if (pattern.test(expr)) {
      const val = col.getValue(item);
      const repVal = col.type === 'number' ? String(Number(val) || 0) : JSON.stringify(String(val ?? ''));
      expr = expr.replace(pattern, repVal);
      if (!recordedCols.has(col.id)) {
        recordedCols.add(col.id);
        variables.push({ token: col.token, value: val, colId: col.id });
      }
    }
  }

  return { expr, variables };
}

// In-memory compiled expression cache
const COMPILED_FN_CACHE = new Map<string, (...args: unknown[]) => unknown>();
const MAX_CACHE_SIZE = 100;

function getCompiledEvaluator(runnableExpr: string): (...args: unknown[]) => unknown {
  let fn = COMPILED_FN_CACHE.get(runnableExpr);
  if (!fn) {
    if (COMPILED_FN_CACHE.size >= MAX_CACHE_SIZE) {
      COMPILED_FN_CACHE.clear();
    }
    fn = new Function(...STATIC_SCOPE_KEYS, `"use strict"; return (${runnableExpr});`) as (
      ...args: unknown[]
    ) => unknown;
    COMPILED_FN_CACHE.set(runnableExpr, fn);
  }
  return fn;
}

/**
 * Detailed formula evaluator returning rich status, error message, and types.
 */
export function evaluateFormulaDetails(
  formulaStr: string,
  item: Partial<SaleItem> | null | undefined
): FormulaDetails {
  const subtotal = Number(item?.subtotal ?? 0);
  const cost = Number(item?.cost ?? 0);
  const fallback = Number((subtotal - cost).toFixed(2));

  if (!formulaStr || !formulaStr.trim() || isDefaultFormula(formulaStr)) {
    return {
      isValid: true,
      result: fallback,
      numericValue: fallback,
      formattedResult: fallback.toFixed(2),
      type: 'number',
      substitutedExpr: `${subtotal} - ${cost}`,
      variables: [],
    };
  }

  const { expr, variables } = substituteFormulaTokens(formulaStr, item);

  try {
    // Sanitize: do not allow dangerous constructs
    if (RE_DANGEROUS.test(expr)) {
      throw new Error('Unauthorized keyword in formula');
    }

    // Transform if( to _if( since 'if' is a reserved JS keyword
    const runnableExpr = expr.replace(RE_IF_KEYWORD, '_if(');

    const evaluator = getCompiledEvaluator(runnableExpr);
    const rawResult = evaluator(...STATIC_SCOPE_VALUES);

    let type: FormulaDetails['type'] = 'number';
    let numericValue = 0;
    let formattedResult = '';

    if (typeof rawResult === 'boolean') {
      type = 'boolean';
      numericValue = rawResult ? 1 : 0;
      formattedResult = rawResult ? 'true' : 'false';
    } else if (typeof rawResult === 'string') {
      type = 'string';
      numericValue = parseFloat(rawResult) || 0;
      formattedResult = rawResult;
    } else if (typeof rawResult === 'number') {
      type = 'number';
      numericValue = isNaN(rawResult) ? fallback : Number(rawResult.toFixed(2));
      formattedResult = isNaN(rawResult) ? 'NaN' : numericValue.toFixed(2);
    } else if (rawResult === null || rawResult === undefined) {
      type = 'number';
      numericValue = 0;
      formattedResult = '0.00';
    } else {
      type = 'string';
      formattedResult = String(rawResult);
      numericValue = fallback;
    }

    return {
      isValid: !isNaN(numericValue) && formattedResult !== 'NaN',
      result: rawResult,
      numericValue,
      formattedResult,
      type,
      substitutedExpr: expr,
      variables,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid formula expression';
    return {
      isValid: false,
      result: fallback,
      numericValue: fallback,
      formattedResult: '—',
      type: 'error',
      substitutedExpr: expr,
      error: errorMsg,
      variables,
    };
  }
}

/**
 * Fast and robust formula calculation returning a numeric result.
 * Features zero-overhead fast path for default profit formulas.
 */
export function evaluateSalesFormula(
  formulaStr: string,
  item: Partial<SaleItem> | null | undefined
): number {
  if (!formulaStr || isDefaultFormula(formulaStr)) {
    const subtotal = Number(item?.subtotal ?? 0);
    const cost = Number(item?.cost ?? 0);
    return Number((subtotal - cost).toFixed(2));
  }

  const details = evaluateFormulaDetails(formulaStr, item);
  if (details.isValid && !isNaN(details.numericValue)) {
    return details.numericValue;
  }
  const subtotal = Number(item?.subtotal ?? 0);
  const cost = Number(item?.cost ?? 0);
  return Number((subtotal - cost).toFixed(2));
}
