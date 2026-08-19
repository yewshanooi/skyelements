'use server';

import type { SaleItem, ViewMode } from '@/types/sales';
import {
  CATEGORIES,
  STORE_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from '@/types/sales';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  createdSale?: SaleItem;
  updatedSale?: {
    item: SaleItem;
    changes: Record<string, { before: unknown; after: unknown }>;
  };
  pendingDelete?: {
    id: string;
    itemName: string;
    customer: string;
    subtotal: number;
    confirmed?: boolean;
    cancelled?: boolean;
  };
  actionExecuted?: string;
  error?: boolean;
}

export interface AiServerResponse {
  id: string;
  role: 'model';
  text: string;
  timestamp: number;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  createdSalePayload?: Omit<SaleItem, 'id'>;
  updatedSalePayload?: {
    id: string;
    updates: Partial<SaleItem>;
    item: SaleItem;
    changes: Record<string, { before: unknown; after: unknown }>;
  };
  pendingDelete?: {
    id: string;
    itemName: string;
    customer: string;
    subtotal: number;
  };
  switchView?: ViewMode;
  filterQuery?: string;
  actionExecuted?: string;
}

// Tool Declaration Definitions for Gemini
const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: 'create_sale_item',
    description: 'Create a new sale item in the dashboard database.',
    parameters: {
      type: 'OBJECT',
      properties: {
        item: { type: 'STRING', description: 'Name or title of the item/product' },
        quantity: { type: 'NUMBER', description: 'Quantity sold (default 1)' },
        subtotal: { type: 'NUMBER', description: 'Total selling price / revenue in MYR (RM)' },
        cost: { type: 'NUMBER', description: 'Total cost / expense in MYR (RM) (default 0)' },
        customer: { type: 'STRING', description: 'Name of the customer' },
        category: {
          type: 'STRING',
          description: 'Category name (e.g. Trading Card Games, Gift Cards, Collectibles, Miniatures, Books, Electronics, Virtual Items, etc.)',
        },
        marketplace: {
          type: 'STRING',
          description: 'Marketplace platform (e.g. Shopee, Carousell, etc.)',
        },
        payment_method: {
          type: 'STRING',
          description: 'Payment method used (e.g. Online Banking, E-Wallet, Shopee - Online Banking, Shopee - SPayLater, Shopee - Cash on Delivery, etc.)',
        },
        order_status: {
          type: 'STRING',
          description: 'Order fulfillment status: Processing, Shipped, or Delivered',
        },
        payment_status: {
          type: 'STRING',
          description: 'Payment status: On Hold, Processing, or Paid',
        },
        date: {
          type: 'STRING',
          description: 'Sale date in YYYY-MM-DD format (defaults to current date if omitted)',
        },
        location: {
          type: 'STRING',
          description: 'Delivery or customer location/address (e.g. Kuala Lumpur, Penang, Mid Valley, etc.)',
        },
        notes: {
          type: 'STRING',
          description: 'Any additional notes or customer remarks',
        },
      },
      required: ['item', 'subtotal'],
    },
  },
  {
    name: 'update_sale_item',
    description: 'Update any fields of an existing sale item by ID or matching customer/item name.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING', description: 'The exact ID of the sale item to update' },
        search_hint: {
          type: 'STRING',
          description: 'If ID is not known, hint text (customer name or item name) to match the item',
        },
        updates: {
          type: 'OBJECT',
          properties: {
            item: { type: 'STRING' },
            quantity: { type: 'NUMBER' },
            subtotal: { type: 'NUMBER' },
            cost: { type: 'NUMBER' },
            customer: { type: 'STRING' },
            category: { type: 'STRING' },
            marketplace: { type: 'STRING' },
            payment_method: { type: 'STRING' },
            order_status: { type: 'STRING' },
            payment_status: { type: 'STRING' },
            date: { type: 'STRING' },
            location: { type: 'STRING' },
            notes: { type: 'STRING' },
          },
          description: 'Object containing only the fields that should be updated',
        },
      },
      required: ['updates'],
    },
  },
  {
    name: 'request_delete_sale_item',
    description: 'Request deletion of an existing sale item with user confirmation in the chat UI.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING', description: 'The exact ID of the sale item to delete' },
        item_name: { type: 'STRING', description: 'Name of the item for display in the confirmation card' },
        customer: { type: 'STRING', description: 'Customer name for display in the confirmation card' },
        subtotal: { type: 'NUMBER', description: 'Amount in MYR for display' },
        reason: { type: 'STRING', description: 'Reason for deletion' },
      },
      required: ['id'],
    },
  },
  {
    name: 'switch_dashboard_view',
    description: 'Switch the active view tab on the dashboard (table, board, chart, timeline, map).',
    parameters: {
      type: 'OBJECT',
      properties: {
        view: {
          type: 'STRING',
          enum: ['table', 'board', 'chart', 'timeline', 'map'],
          description: 'The target view to switch to',
        },
      },
      required: ['view'],
    },
  },
  {
    name: 'filter_dashboard_search',
    description: 'Filter the dashboard table and views by typing a search keyword in the main search bar.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'The search term to apply (e.g. customer name, category, status)' },
      },
      required: ['query'],
    },
  },
];

/**
 * Generate system prompt containing business context, data summary, and available options
 */
function buildSystemInstruction(sales: SaleItem[]): string {
  const categories = CATEGORIES;
  const marketplaces = STORE_TYPES;
  const orderStatuses = ORDER_STATUSES;
  const paymentStatuses = PAYMENT_STATUSES;
  const paymentMethods = PAYMENT_METHODS;

  // Compute live dataset stats
  const totalCount = sales.length;
  const totalRevenue = sales.reduce((acc, s) => acc + (s.subtotal || 0), 0);
  const totalCost = sales.reduce((acc, s) => acc + (s.cost || 0), 0);
  const totalProfit = sales.reduce((acc, s) => acc + (s.sales || 0), 0);

  // Time & Month Ground Truth
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentYearMonth = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const lastMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
  const lastMonthYear = lastMonthDate.getFullYear();
  const lastMonthNum = lastMonthDate.getMonth() + 1;
  const lastMonthYearMonth = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}`;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const currentMonthName = monthNames[currentMonthNum - 1];
  const lastMonthName = monthNames[lastMonthNum - 1];

  // Pre-compute monthly statistics deterministically
  const monthlyStats: Record<
    string,
    {
      label: string;
      count: number;
      revenue: number;
      cost: number;
      profit: number;
      items: Array<{ item: string; customer: string; date: string; subtotal: number; profit: number }>;
    }
  > = {};

  sales.forEach((s) => {
    const ym = s.date && s.date.length >= 7 ? s.date.slice(0, 7) : 'Unknown';
    if (!monthlyStats[ym]) {
      let label = ym;
      if (ym !== 'Unknown') {
        const parts = ym.split('-');
        if (parts.length === 2) {
          const mIdx = parseInt(parts[1], 10) - 1;
          label = `${monthNames[mIdx] || parts[1]} ${parts[0]}`;
        }
      }
      monthlyStats[ym] = {
        label,
        count: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        items: [],
      };
    }
    monthlyStats[ym].count += 1;
    monthlyStats[ym].revenue += s.subtotal || 0;
    monthlyStats[ym].cost += s.cost || 0;
    monthlyStats[ym].profit += s.sales || 0;
    monthlyStats[ym].items.push({
      item: s.item,
      customer: s.customer,
      date: s.date,
      subtotal: s.subtotal,
      profit: s.sales,
    });
  });

  const monthlySummaryLines = Object.entries(monthlyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([ym, stats]) => {
      let tag = '';
      if (ym === currentYearMonth) tag = ' (THIS CURRENT MONTH)';
      else if (ym === lastMonthYearMonth) tag = ' (LAST MONTH)';
      return `- **${ym} (${stats.label})**${tag}: ${stats.count} order(s) | Revenue: RM ${stats.revenue.toFixed(2)} | Cost: RM ${stats.cost.toFixed(2)} | Net Profit: RM ${stats.profit.toFixed(2)}`;
    });

  // Pre-compute customer leaderboards (sorted by total spend)
  const customerStats: Record<string, { count: number; spend: number; profit: number }> = {};
  sales.forEach((s) => {
    const cust = s.customer?.trim() || 'Unknown';
    if (!customerStats[cust]) customerStats[cust] = { count: 0, spend: 0, profit: 0 };
    customerStats[cust].count += 1;
    customerStats[cust].spend += s.subtotal || 0;
    customerStats[cust].profit += s.sales || 0;
  });

  const topCustomersLines = Object.entries(customerStats)
    .sort(([, a], [, b]) => b.spend - a.spend)
    .slice(0, 10)
    .map(
      ([cust, st], idx) =>
        `${idx + 1}. **${cust}**: ${st.count} orders | Total Spend: RM ${st.spend.toFixed(2)} | Profit: RM ${st.profit.toFixed(2)}`
    );

  // Pre-compute category breakdown
  const categoryStats: Record<string, { count: number; qty: number; revenue: number; cost: number; profit: number }> = {};
  sales.forEach((s) => {
    const cat = s.category || 'Uncategorized';
    if (!categoryStats[cat]) categoryStats[cat] = { count: 0, qty: 0, revenue: 0, cost: 0, profit: 0 };
    categoryStats[cat].count += 1;
    categoryStats[cat].qty += s.quantity || 1;
    categoryStats[cat].revenue += s.subtotal || 0;
    categoryStats[cat].cost += s.cost || 0;
    categoryStats[cat].profit += s.sales || 0;
  });

  const categoryLines = Object.entries(categoryStats)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .map(([cat, st]) => {
      const margin = st.revenue > 0 ? ((st.profit / st.revenue) * 100).toFixed(1) : '0';
      return `- **${cat}**: ${st.count} orders (${st.qty} items) | Revenue: RM ${st.revenue.toFixed(2)} | Net Profit: RM ${st.profit.toFixed(2)} (${margin}% margin)`;
    });

  // Pre-compute marketplace statistics
  const marketplaceStats: Record<string, { count: number; revenue: number; profit: number }> = {};
  sales.forEach((s) => {
    const mp = s.marketplace || 'Other';
    if (!marketplaceStats[mp]) marketplaceStats[mp] = { count: 0, revenue: 0, profit: 0 };
    marketplaceStats[mp].count += 1;
    marketplaceStats[mp].revenue += s.subtotal || 0;
    marketplaceStats[mp].profit += s.sales || 0;
  });

  const marketplaceLines = Object.entries(marketplaceStats).map(
    ([mp, st]) =>
      `- ${mp}: ${st.count} orders | Revenue: RM ${st.revenue.toFixed(2)} | Profit: RM ${st.profit.toFixed(2)}`
  );

  // Pre-compute order and payment status aggregates
  const orderStatusStats: Record<string, { count: number; total: number }> = {};
  const paymentStatusStats: Record<string, { count: number; total: number }> = {};
  sales.forEach((s) => {
    const os = s.order_status || 'Unknown';
    const ps = s.payment_status || 'Unknown';
    if (!orderStatusStats[os]) orderStatusStats[os] = { count: 0, total: 0 };
    if (!paymentStatusStats[ps]) paymentStatusStats[ps] = { count: 0, total: 0 };
    orderStatusStats[os].count += 1;
    orderStatusStats[os].total += s.subtotal || 0;
    paymentStatusStats[ps].count += 1;
    paymentStatusStats[ps].total += s.subtotal || 0;
  });

  const orderStatusLines = Object.entries(orderStatusStats).map(
    ([os, st]) => `- ${os}: ${st.count} orders (RM ${st.total.toFixed(2)})`
  );
  const paymentStatusLines = Object.entries(paymentStatusStats).map(
    ([ps, st]) => `- ${ps}: ${st.count} orders (RM ${st.total.toFixed(2)})`
  );

  // Pre-compute top sold items by quantity and revenue
  const itemStats: Record<string, { count: number; qty: number; revenue: number }> = {};
  sales.forEach((s) => {
    const it = s.item?.trim() || 'Unknown';
    if (!itemStats[it]) itemStats[it] = { count: 0, qty: 0, revenue: 0 };
    itemStats[it].count += 1;
    itemStats[it].qty += s.quantity || 1;
    itemStats[it].revenue += s.subtotal || 0;
  });

  const topItemsLines = Object.entries(itemStats)
    .sort(([, a], [, b]) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, 10)
    .map(
      ([it, st], idx) =>
        `${idx + 1}. **${it}**: ${st.qty} items sold (${st.count} orders) | Total: RM ${st.revenue.toFixed(2)}`
    );

  // Compact sales list for direct context querying
  const compactSales = sales.map((s) => ({
    id: s.id,
    item: s.item,
    qty: s.quantity,
    subtotal: s.subtotal,
    cost: s.cost,
    profit: s.sales,
    customer: s.customer,
    category: s.category,
    marketplace: s.marketplace,
    order_status: s.order_status,
    payment_status: s.payment_status,
    payment_method: s.payment_method,
    date: s.date,
    month: s.date && s.date.length >= 7 ? s.date.slice(0, 7) : '',
    location: s.location || '',
  }));

  const avgOrderValue = totalCount > 0 ? (totalRevenue / totalCount).toFixed(2) : '0.00';
  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  return `You are "AI Assistant", an ultra-high-precision analytics and management assistant integrated into a modern Sales Dashboard.

### CALENDAR & DATE GROUND TRUTH:
- TODAY'S DATE: ${todayStr} (${currentMonthName} ${now.getDate()}, ${currentYear})
- THIS CURRENT MONTH: "${currentMonthName} ${currentYear}" (Key: "${currentYearMonth}")
- LAST MONTH: "${lastMonthName} ${lastMonthYear}" (Key: "${lastMonthYearMonth}")

### PRE-COMPUTED MONTHLY AGGREGATES (GROUND TRUTH):
${monthlySummaryLines.join('\n') || '- No sales records available.'}

### PRE-COMPUTED TOP CUSTOMERS (BY TOTAL SPEND):
${topCustomersLines.join('\n') || '- None'}

### PRE-COMPUTED CATEGORY BREAKDOWN:
${categoryLines.join('\n') || '- None'}

### PRE-COMPUTED MARKETPLACE BREAKDOWN:
${marketplaceLines.join('\n')}

### PRE-COMPUTED FULFILLMENT & PAYMENT STATUS:
*Order Fulfillment:*
${orderStatusLines.join('\n')}
*Payment Status:*
${paymentStatusLines.join('\n')}

### PRE-COMPUTED TOP PRODUCTS:
${topItemsLines.join('\n') || '- None'}

### OVERALL FINANCIAL SUMMARY:
- Total Orders: ${totalCount}
- Total Revenue: RM ${totalRevenue.toFixed(2)}
- Total Cost: RM ${totalCost.toFixed(2)}
- Total Net Profit: RM ${totalProfit.toFixed(2)}
- Average Order Value (AOV): RM ${avgOrderValue}
- Overall Profit Margin: ${overallMargin}%

### AVAILABLE SYSTEM OPTIONS:
- Categories: ${categories.join(', ')}
- Marketplaces: ${marketplaces.join(', ')}
- Order Statuses: ${orderStatuses.join(', ')}
- Payment Statuses: ${paymentStatuses.join(', ')}
- Payment Methods: ${paymentMethods.join(', ')}

### ALL RAW SALES RECORDS (${compactSales.length} orders):
\`\`\`json
${JSON.stringify(compactSales)}
\`\`\`

### STRICT ACCURACY DIRECTIVES:
1. **DETERMINISTIC CITATION:** For all summary, monthly, customer, category, and status questions, you MUST directly cite the exact pre-computed numbers above. Do not perform mental estimations or guess.
2. **MONTH FILTERING:** Only include orders whose 'date' string strictly starts with the requested month's prefix (e.g. July 2026 is "2026-07-XX", June 2026 is "2026-06-XX").
3. **ZERO HALLUCINATION:** If asked about a customer, product, or date range that has 0 sales or does not exist, state clearly that no records were found.
4. **TOOL USAGE:** Use \`create_sale_item\`, \`update_sale_item\`, \`request_delete_sale_item\`, \`switch_dashboard_view\`, or \`filter_dashboard_search\` as appropriate when executing actions.
5. **CURRENCY FORMAT:** Always format currency as "RM X.XX".`;
}

// Smart fuzzy matching for updates and deletes
function findBestMatchingSale(sales: SaleItem[], targetId?: string, searchHint?: string): SaleItem | undefined {
  if (targetId) {
    const exact = sales.find((s) => s.id === targetId);
    if (exact) return exact;
  }
  if (!searchHint) return undefined;

  const hint = searchHint.toLowerCase().trim();
  if (!hint) return undefined;

  // 1. Direct match on ID, customer, item or location
  const directMatches = sales.filter(
    (s) =>
      s.id.toLowerCase() === hint ||
      s.customer?.toLowerCase() === hint ||
      s.item?.toLowerCase() === hint ||
      s.item?.toLowerCase().includes(hint) ||
      s.customer?.toLowerCase().includes(hint) ||
      (s.location && s.location.toLowerCase().includes(hint))
  );

  if (directMatches.length > 0) {
    return directMatches.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  }

  // 2. Token match
  const tokens = hint.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length > 0) {
    let bestMatch: SaleItem | undefined;
    let highestScore = 0;

    for (const s of sales) {
      let score = 0;
      const haystack = `${s.item} ${s.customer} ${s.category} ${s.marketplace}`.toLowerCase();
      for (const token of tokens) {
        if (haystack.includes(token)) score += 1;
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = s;
      }
    }

    if (highestScore > 0) return bestMatch;
  }

  return undefined;
}

// Fetch with automatic retry and exponential backoff for transient failures
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, options);
      if (resp.ok || resp.status === 400 || resp.status === 401 || resp.status === 403 || resp.status === 404) {
        return resp;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      return resp;
    } catch (err: unknown) {
      lastError = err;
      if (options.signal?.aborted) {
        throw err;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

/**
 * Server Action: Send a message to Google AI Studio Gemini API with multi-turn tool calling
 * Completely executed on the server using server-side GOOGLE_API_KEY.
 */
export async function sendSalesAiMessage(
  history: ChatMessage[],
  newMessage: string,
  sales: SaleItem[]
): Promise<AiServerResponse> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Google AI Studio API Key is not configured on the server. Please set GOOGLE_API_KEY in your environment variables (.env.local).'
    );
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const systemInstruction = buildSystemInstruction(sales);

  // Prepare Gemini conversation payload (pruned to last 8 turns for speed and token efficiency)
  const contents: Array<{
    role: 'user' | 'model';
    parts: Array<Record<string, unknown>>;
  }> = [];

  const recentHistory = history.slice(-8);
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: msg.text }],
      });
    } else if (msg.role === 'model' && msg.text) {
      contents.push({
        role: 'model',
        parts: [{ text: msg.text }],
      });
    }
  }

  // Add current new user message
  contents.push({
    role: 'user',
    parts: [{ text: newMessage }],
  });

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    tools: [
      {
        functionDeclarations: GEMINI_FUNCTION_DECLARATIONS,
      },
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 2048,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message = errorJson?.error?.message || `Gemini API error: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const result = await response.json();
  const candidate = result.candidates?.[0];
  if (!candidate || !candidate.content) {
    return {
      id: `msg-${Date.now()}`,
      role: 'model',
      text: 'I received an empty response from the AI model. Please try asking again.',
      timestamp: Date.now(),
    };
  }

  const parts = candidate.content.parts || [];
  const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let modelText = '';

  for (const part of parts) {
    if (part.text) {
      modelText += part.text;
    }
    if (part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name,
        args: (part.functionCall.args || {}) as Record<string, unknown>,
      });
    }
  }

  // Handle Tool Calls if Gemini invoked any
  if (functionCalls.length > 0) {
    let createdSalePayload: Omit<SaleItem, 'id'> | undefined;
    let updatedSalePayload: {
      id: string;
      updates: Partial<SaleItem>;
      item: SaleItem;
      changes: Record<string, { before: unknown; after: unknown }>;
    } | undefined;
    let pendingDeleteResult: {
      id: string;
      itemName: string;
      customer: string;
      subtotal: number;
    } | undefined;
    let switchViewTarget: ViewMode | undefined;
    let filterQueryTarget: string | undefined;
    let actionExecutedDescription = '';

    const functionResponses: Array<{
      functionResponse: {
        name: string;
        response: Record<string, unknown>;
      };
    }> = [];

    for (const call of functionCalls) {
      const { name, args } = call;

      if (name === 'create_sale_item') {
        const item = String(args.item || 'New Item');
        const quantity = Number(args.quantity) || 1;
        const subtotal = Number(args.subtotal) || 0;
        const cost = Number(args.cost) || 0;
        const salesProfit = Number((subtotal - cost).toFixed(2));
        const customer = String(args.customer || 'Customer');
        const category = String(args.category || 'Trading Card Games');
        const marketplace = String(args.marketplace || 'Shopee');
        const payment_method = String(args.payment_method || 'Online Banking');
        const order_status = String(args.order_status || 'Processing');
        const payment_status = String(args.payment_status || 'Paid');
        const date = String(args.date || new Date().toISOString().split('T')[0]);
        const location = args.location ? String(args.location) : undefined;
        const notes = args.notes ? String(args.notes) : undefined;

        createdSalePayload = {
          item,
          quantity,
          subtotal,
          cost,
          sales: salesProfit,
          customer,
          category,
          marketplace,
          payment_method,
          order_status,
          payment_status,
          date,
          location,
          notes,
        };

        actionExecutedDescription = `Created new item: "${item}" for ${customer} (RM ${subtotal})`;

        functionResponses.push({
          functionResponse: {
            name,
            response: {
              success: true,
              item,
              customer,
              subtotal,
              profit: salesProfit,
            },
          },
        });
      } else if (name === 'update_sale_item') {
        const targetId = args.id ? String(args.id) : undefined;
        const searchHint = args.search_hint ? String(args.search_hint) : undefined;
        const updates = (args.updates || {}) as Partial<SaleItem>;

        const existing = findBestMatchingSale(sales, targetId, searchHint);

        if (existing) {
          const changes: Record<string, { before: unknown; after: unknown }> = {};
          for (const [k, v] of Object.entries(updates)) {
            const key = k as keyof SaleItem;
            changes[k] = { before: existing[key], after: v };
          }

          const updatedItem: SaleItem = { ...existing, ...updates };

          updatedSalePayload = {
            id: existing.id,
            updates,
            item: updatedItem,
            changes,
          };
          actionExecutedDescription = `Updated "${updatedItem.item}" (${Object.keys(updates).join(', ')})`;

          functionResponses.push({
            functionResponse: {
              name,
              response: {
                success: true,
                id: existing.id,
                item: updatedItem.item,
                updated_fields: updates,
              },
            },
          });
        } else {
          functionResponses.push({
            functionResponse: {
              name,
              response: {
                success: false,
                error: `Could not find an item matching "${targetId || searchHint}". Please provide more details or the item ID.`,
              },
            },
          });
        }
      } else if (name === 'request_delete_sale_item') {
        const id = String(args.id || '');
        const searchHint = String(args.item_name || args.customer || '');
        const target = findBestMatchingSale(sales, id, searchHint);

        const targetId = target ? target.id : id;
        const itemName = target ? target.item : String(args.item_name || 'Item');
        const customer = target ? target.customer : String(args.customer || 'Customer');
        const subtotal = target ? target.subtotal : Number(args.subtotal) || 0;

        pendingDeleteResult = {
          id: targetId,
          itemName,
          customer,
          subtotal,
        };
        actionExecutedDescription = `Requested deletion confirmation for "${itemName}"`;

        functionResponses.push({
          functionResponse: {
            name,
            response: {
              status: 'confirmation_required',
              message: 'Confirmation card has been displayed to user in the chat UI. Waiting for user click.',
            },
          },
        });
      } else if (name === 'switch_dashboard_view') {
        const view = String(args.view || 'table') as ViewMode;
        switchViewTarget = view;
        actionExecutedDescription = `Switched view to ${view}`;

        functionResponses.push({
          functionResponse: {
            name,
            response: { success: true, view },
          },
        });
      } else if (name === 'filter_dashboard_search') {
        const query = String(args.query || '');
        filterQueryTarget = query;
        actionExecutedDescription = `Filtered dashboard by "${query}"`;

        functionResponses.push({
          functionResponse: {
            name,
            response: { success: true, query },
          },
        });
      }
    }

    // Send function responses back to Gemini on server to get final conversational summary
    const followupContents = [
      ...contents,
      candidate.content,
      {
        role: 'user' as const,
        parts: functionResponses,
      },
    ];

    try {
      const followupResp = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: followupContents,
          generationConfig: { temperature: 0.0, maxOutputTokens: 1024 },
        }),
      });

      if (followupResp.ok) {
        const followupData = await followupResp.json();
        const followupText = followupData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (followupText) {
          modelText = followupText;
        }
      }
    } catch (err) {
      console.warn('Failed to get followup summary from Gemini:', err);
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'model',
      text: modelText || actionExecutedDescription || 'Action completed successfully.',
      timestamp: Date.now(),
      toolCalls: functionCalls,
      createdSalePayload,
      updatedSalePayload,
      pendingDelete: pendingDeleteResult,
      switchView: switchViewTarget,
      filterQuery: filterQueryTarget,
      actionExecuted: actionExecutedDescription,
    };
  }

  return {
    id: `msg-${Date.now()}`,
    role: 'model',
    text: modelText,
    timestamp: Date.now(),
  };
}
