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

/**
 * Builds the math & utility function scope for formula evaluation.
 */
function createScope() {
  const round = (val: unknown, decimals: number = 0) => {
    const num = Number(val);
    if (isNaN(num)) return 0;
    const factor = Math.pow(10, Math.max(0, decimals));
    return Math.round((num + Number.EPSILON) * factor) / factor;
  };

  const multiply = (...args: unknown[]) => {
    if (args.length === 0) return 0;
    return args.reduce((acc: number, v: unknown) => acc * Number(v || 0), 1);
  };

  const divide = (a: unknown, b: unknown) => {
    const numA = Number(a || 0);
    const numB = Number(b || 0);
    if (numB === 0) return 0;
    return numA / numB;
  };

  const add = (...args: unknown[]) => {
    return args.reduce((acc: number, v: unknown) => acc + Number(v || 0), 0);
  };

  const subtract = (a: unknown, b: unknown) => {
    return Number(a || 0) - Number(b || 0);
  };

  const min = (...args: unknown[]) => Math.min(...args.map((x) => Number(x || 0)));
  const max = (...args: unknown[]) => Math.max(...args.map((x) => Number(x || 0)));
  const abs = (x: unknown) => Math.abs(Number(x || 0));
  const ceil = (x: unknown) => Math.ceil(Number(x || 0));
  const floor = (x: unknown) => Math.floor(Number(x || 0));
  const sqrt = (x: unknown) => Math.sqrt(Math.max(0, Number(x || 0)));
  const pow = (a: unknown, b: unknown) => Math.pow(Number(a || 0), Number(b || 0));
  const power = pow;
  const ifCondition = (cond: unknown, ifTrue: unknown, ifFalse: unknown) => (cond ? ifTrue : ifFalse);

  return {
    round,
    ROUND: round,
    multiply,
    MULTIPLY: multiply,
    divide,
    DIVIDE: divide,
    add,
    ADD: add,
    subtract,
    SUBTRACT: subtract,
    min,
    MIN: min,
    max,
    MAX: max,
    abs,
    ABS: abs,
    ceil,
    CEIL: ceil,
    floor,
    FLOOR: floor,
    sqrt,
    SQRT: sqrt,
    pow,
    power,
    POW: pow,
    POWER: power,
    _if: ifCondition,
    _IF: ifCondition,
    iff: ifCondition,
    IFF: ifCondition,
  };
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

  // Specific high-priority replacements with flexible spacing
  const subtotalVal = Number(item?.subtotal ?? 0);
  const costVal = Number(item?.cost ?? 0);
  const quantityVal = Number(item?.quantity ?? 1);
  const salesVal = Number(item?.sales ?? Number((subtotalVal - costVal).toFixed(2)));

  // Replace explicit # tokens first
  // 1. # Subtotal (in MYR)
  if (/#\s*Subtotal\s*\(\s*in\s*MYR\s*\)/i.test(expr)) {
    expr = expr.replace(/#\s*Subtotal\s*\(\s*in\s*MYR\s*\)/gi, String(subtotalVal));
    variables.push({ token: '# Subtotal (in MYR)', value: subtotalVal, colId: 'subtotal' });
  }
  // 2. # Cost(s)
  if (/#\s*Cost\s*\(\s*s\s*\)/i.test(expr)) {
    expr = expr.replace(/#\s*Cost\s*\(\s*s\s*\)/gi, String(costVal));
    variables.push({ token: '# Cost(s)', value: costVal, colId: 'cost' });
  }
  // 3. # Sales (in MYR)
  if (/#\s*Sales\s*\(\s*in\s*MYR\s*\)/i.test(expr)) {
    expr = expr.replace(/#\s*Sales\s*\(\s*in\s*MYR\s*\)/gi, String(salesVal));
    variables.push({ token: '# Sales (in MYR)', value: salesVal, colId: 'sales' });
  }

  // 4. # Subtotal
  if (/#\s*Subtotal\b/i.test(expr)) {
    expr = expr.replace(/#\s*Subtotal\b/gi, String(subtotalVal));
    variables.push({ token: '# Subtotal', value: subtotalVal, colId: 'subtotal' });
  }
  // 5. # Cost
  if (/#\s*Cost\b/i.test(expr)) {
    expr = expr.replace(/#\s*Cost\b/gi, String(costVal));
    variables.push({ token: '# Cost', value: costVal, colId: 'cost' });
  }
  // 6. # Quantity
  if (/#\s*Quantity\b/i.test(expr)) {
    expr = expr.replace(/#\s*Quantity\b/gi, String(quantityVal));
    variables.push({ token: '# Quantity', value: quantityVal, colId: 'quantity' });
  }
  // 7. # Sales
  if (/#\s*Sales\b/i.test(expr)) {
    expr = expr.replace(/#\s*Sales\b/gi, String(salesVal));
    variables.push({ token: '# Sales', value: salesVal, colId: 'sales' });
  }

  // Other columns replacement
  for (const col of FORMULA_COLUMNS) {
    if (['subtotal', 'cost', 'quantity', 'sales'].includes(col.id)) continue;
    const val = col.getValue(item);
    const repVal = col.type === 'number' ? String(Number(val) || 0) : JSON.stringify(String(val ?? ''));

    // Try # Token
    const hashPattern = new RegExp(`#\\s*${escapeRegex(col.name.replace(/#/g, '').trim())}\\b`, 'gi');
    if (hashPattern.test(expr)) {
      expr = expr.replace(hashPattern, repVal);
      variables.push({ token: col.token, value: val, colId: col.id });
    }
  }

  // Also replace bare subtotal/cost/quantity if they appear standalone without # (case-insensitive)
  expr = expr
    .replace(/\bSubtotal\s*\(\s*in\s*MYR\s*\)/gi, String(subtotalVal))
    .replace(/\bCost\s*\(\s*s\s*\)/gi, String(costVal))
    .replace(/\bSales\s*\(\s*in\s*MYR\s*\)/gi, String(salesVal))
    .replace(/\bSubtotal\b/gi, String(subtotalVal))
    .replace(/\bCost\b/gi, String(costVal))
    .replace(/\bQuantity\b/gi, String(quantityVal));

  return { expr, variables };
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

  if (!formulaStr || !formulaStr.trim()) {
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
    const scope = createScope();
    const keys = Object.keys(scope);
    const values = Object.values(scope);

    // Sanitize: do not allow dangerous constructs
    if (/(window|document|localStorage|sessionStorage|fetch|eval|Function|process|global|import|require)/i.test(expr)) {
      throw new Error('Unauthorized keyword in formula');
    }

    // Transform if( to _if( since 'if' is a reserved JS keyword
    const runnableExpr = expr.replace(/\bif\s*\(/gi, '_if(');

    const evaluator = new Function(...keys, `"use strict"; return (${runnableExpr});`);
    const rawResult = evaluator(...values);

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
 */
export function evaluateSalesFormula(
  formulaStr: string,
  item: Partial<SaleItem> | null | undefined
): number {
  const details = evaluateFormulaDetails(formulaStr, item);
  if (details.isValid && !isNaN(details.numericValue)) {
    return details.numericValue;
  }
  const subtotal = Number(item?.subtotal ?? 0);
  const cost = Number(item?.cost ?? 0);
  return Number((subtotal - cost).toFixed(2));
}
