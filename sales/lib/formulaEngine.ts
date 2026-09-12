import type { SaleItem } from '@/sales/types';

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
    getValue: (item) => Number(item?.quantity ?? 0),
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
  if: (cond: unknown, ifTrue: unknown, ifFalse: unknown) => (cond ? ifTrue : ifFalse),
  _if: (cond: unknown, ifTrue: unknown, ifFalse: unknown) => (cond ? ifTrue : ifFalse),
  iff: (cond: unknown, ifTrue: unknown, ifFalse: unknown) => (cond ? ifTrue : ifFalse),
};

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

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'IDENT'
  | 'OP'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'QUESTION'
  | 'COLON'
  | 'EOF';

interface Token {
  type: TokenType;
  value: unknown;
  pos: number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = expr.length;

  while (i < len) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < len && /[0-9]/.test(expr[i + 1]))) {
      const start = i;
      while (i < len && /[0-9]/.test(expr[i])) i++;
      if (i < len && expr[i] === '.') {
        i++;
        while (i < len && /[0-9]/.test(expr[i])) i++;
      }
      if (i < len && (expr[i] === 'e' || expr[i] === 'E')) {
        i++;
        if (i < len && (expr[i] === '+' || expr[i] === '-')) i++;
        while (i < len && /[0-9]/.test(expr[i])) i++;
      }
      const numStr = expr.slice(start, i);
      tokens.push({ type: 'NUMBER', value: Number(numStr), pos: start });
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      let str = '';
      let closed = false;
      while (i < len) {
        if (expr[i] === '\\' && i + 1 < len) {
          str += expr[i + 1];
          i += 2;
        } else if (expr[i] === quote) {
          closed = true;
          i++;
          break;
        } else {
          str += expr[i];
          i++;
        }
      }
      if (!closed) {
        throw new Error(`Unterminated string literal starting at position ${start}`);
      }
      tokens.push({ type: 'STRING', value: str, pos: start });
      continue;
    }

    if (i + 2 < len) {
      const tri = expr.slice(i, i + 3);
      if (tri === '===' || tri === '!==') {
        tokens.push({ type: 'OP', value: tri, pos: i });
        i += 3;
        continue;
      }
    }

    if (i + 1 < len) {
      const duo = expr.slice(i, i + 2);
      if (
        duo === '==' ||
        duo === '!=' ||
        duo === '<=' ||
        duo === '>=' ||
        duo === '&&' ||
        duo === '||'
      ) {
        tokens.push({ type: 'OP', value: duo, pos: i });
        i += 2;
        continue;
      }
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i++ });
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i++ });
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i++ });
      continue;
    }
    if (ch === '?') {
      tokens.push({ type: 'QUESTION', value: '?', pos: i++ });
      continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'COLON', value: ':', pos: i++ });
      continue;
    }
    if (
      ch === '+' ||
      ch === '-' ||
      ch === '*' ||
      ch === '/' ||
      ch === '%' ||
      ch === '<' ||
      ch === '>' ||
      ch === '!'
    ) {
      tokens.push({ type: 'OP', value: ch, pos: i++ });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) i++;
      const ident = expr.slice(start, i);
      const lower = ident.toLowerCase();
      if (lower === 'true') {
        tokens.push({ type: 'BOOLEAN', value: true, pos: start });
      } else if (lower === 'false') {
        tokens.push({ type: 'BOOLEAN', value: false, pos: start });
      } else if (lower === 'null') {
        tokens.push({ type: 'NULL', value: null, pos: start });
      } else {
        tokens.push({ type: 'IDENT', value: ident, pos: start });
      }
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }

  tokens.push({ type: 'EOF', value: '', pos: len });
  return tokens;
}

class ExpressionParser {
  private tokens: Token[];
  private cursor = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.cursor] || { type: 'EOF', value: '', pos: -1 };
  }

  private next(): Token {
    const t = this.peek();
    this.cursor++;
    return t;
  }

  private match(type: TokenType, value?: string): boolean {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    this.cursor++;
    return true;
  }

  private expect(type: TokenType, value?: string): Token {
    const t = this.peek();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      const expected = value ? `'${value}'` : type;
      throw new Error(`Expected ${expected} but got '${t.value}' at position ${t.pos}`);
    }
    return this.next();
  }

  public parse(): unknown {
    const res = this.parseTernary();
    if (this.peek().type !== 'EOF') {
      const t = this.peek();
      throw new Error(`Unexpected token '${t.value}' at position ${t.pos}`);
    }
    return res;
  }

  private parseTernary(): unknown {
    const cond = this.parseLogicalOr();
    if (this.match('QUESTION')) {
      const trueBranch = this.parseTernary();
      this.expect('COLON');
      const falseBranch = this.parseTernary();
      return cond ? trueBranch : falseBranch;
    }
    return cond;
  }

  private parseLogicalOr(): unknown {
    let left = this.parseLogicalAnd();
    while (this.match('OP', '||')) {
      const right = this.parseLogicalAnd();
      left = Boolean(left || right);
    }
    return left;
  }

  private parseLogicalAnd(): unknown {
    let left = this.parseEquality();
    while (this.match('OP', '&&')) {
      const right = this.parseEquality();
      left = Boolean(left && right);
    }
    return left;
  }

  private parseEquality(): unknown {
    let left = this.parseRelational();
    while (true) {
      const t = this.peek();
      if (
        t.type === 'OP' &&
        (t.value === '==' || t.value === '!=' || t.value === '===' || t.value === '!==')
      ) {
        this.next();
        const right = this.parseRelational();
        if (t.value === '==' || t.value === '===') {
          // eslint-disable-next-line eqeqeq
          left = left == right;
        } else {
          // eslint-disable-next-line eqeqeq
          left = left != right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  private parseRelational(): unknown {
    let left = this.parseAdditive();
    while (true) {
      const t = this.peek();
      if (
        t.type === 'OP' &&
        (t.value === '<' || t.value === '<=' || t.value === '>' || t.value === '>=')
      ) {
        this.next();
        const right = this.parseAdditive();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (t.value === '<') left = (left as any) < (right as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else if (t.value === '<=') left = (left as any) <= (right as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else if (t.value === '>') left = (left as any) > (right as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else if (t.value === '>=') left = (left as any) >= (right as any);
      } else {
        break;
      }
    }
    return left;
  }

  private parseAdditive(): unknown {
    let left = this.parseMultiplicative();
    while (true) {
      const t = this.peek();
      if (t.type === 'OP' && (t.value === '+' || t.value === '-')) {
        this.next();
        const right = this.parseMultiplicative();
        if (t.value === '+') {
          if (typeof left === 'string' || typeof right === 'string') {
            left = String(left) + String(right);
          } else {
            left = Number(left || 0) + Number(right || 0);
          }
        } else {
          left = Number(left || 0) - Number(right || 0);
        }
      } else {
        break;
      }
    }
    return left;
  }

  private parseMultiplicative(): unknown {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t.type === 'OP' && (t.value === '*' || t.value === '/' || t.value === '%')) {
        this.next();
        const right = this.parseUnary();
        if (t.value === '*') {
          left = Number(left || 0) * Number(right || 0);
        } else if (t.value === '/') {
          const denom = Number(right || 0);
          left = denom === 0 ? 0 : Number(left || 0) / denom;
        } else {
          const denom = Number(right || 0);
          left = denom === 0 ? 0 : Number(left || 0) % denom;
        }
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): unknown {
    const t = this.peek();
    if (t.type === 'OP') {
      if (t.value === '+') {
        this.next();
        return +Number(this.parseUnary() || 0);
      }
      if (t.value === '-') {
        this.next();
        return -Number(this.parseUnary() || 0);
      }
      if (t.value === '!') {
        this.next();
        return !this.parseUnary();
      }
    }
    return this.parsePrimary();
  }

  private parsePrimary(): unknown {
    const t = this.peek();

    if (t.type === 'NUMBER' || t.type === 'STRING' || t.type === 'BOOLEAN') {
      this.next();
      return t.value;
    }

    if (t.type === 'NULL') {
      this.next();
      return null;
    }

    if (t.type === 'LPAREN') {
      this.next();
      const val = this.parseTernary();
      this.expect('RPAREN');
      return val;
    }

    if (t.type === 'IDENT') {
      const identToken = this.next();
      const ident = String(identToken.value);
      const lower = ident.toLowerCase();

      if (this.match('LPAREN')) {
        const fn = MATH_FUNCS[lower];
        if (!fn) {
          throw new Error(`Unsupported function '${ident}' at position ${identToken.pos}`);
        }
        const args: unknown[] = [];
        if (!this.match('RPAREN')) {
          while (true) {
            args.push(this.parseTernary());
            if (this.match('COMMA')) {
              continue;
            }
            this.expect('RPAREN');
            break;
          }
        }
        return fn(...args);
      }

      throw new Error(
        `Unexpected identifier '${ident}' at position ${identToken.pos}. Variables must be defined as column tokens.`
      );
    }

    throw new Error(`Unexpected token '${t.value || t.type}' at position ${t.pos}`);
  }
}

/**
 * Safe Abstract Syntax Evaluator for Mathematical and Logical Expressions.
 * Completely eliminates the use of `eval()` and `new Function()`.
 */
export function evaluateSafeExpression(expr: string): unknown {
  const tokens = tokenize(expr);
  const parser = new ExpressionParser(tokens);
  return parser.parse();
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
    const rawResult = evaluateSafeExpression(expr);

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
