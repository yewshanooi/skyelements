'use server';

import type { SaleItem } from '@/types/sales';
import {
  CATEGORIES,
  STORE_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from '@/types/sales';
import { executeSalesMetricsQuery } from './salesAnalyticsEngine';
import type {
  ChartSpec,
  QuerySalesMetricsArgs,
  ChatMessage,
  AiServerResponse,
  PendingCreateForm,
  PendingUpdateForm,
} from '@/types/salesAi';


// Tool Declaration Definitions for Gemini Function-Calling Registry
const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: 'query_sales_metrics',
    description:
      'Execute deterministic server-side aggregation queries directly against the PostgreSQL sales database. ALWAYS use this tool whenever the user asks for financial totals, revenue, profit, costs, order counts, averages, breakdowns by category/marketplace/customer/status, monthly/daily trends, rankings, or chart visualizations. NEVER guess numbers or calculate them mentally.',
    parameters: {
      type: 'OBJECT',
      properties: {
        metrics: {
          type: 'ARRAY',
          items: {
            type: 'STRING',
            enum: ['revenue', 'cost', 'profit', 'units_sold', 'order_count', 'aov'],
          },
          description:
            'Aggregation targets: Select 1 or at most 2 metrics to keep tables clean and legible (e.g. ["revenue"] or ["revenue", "profit"]). Targets: revenue, cost, profit, units_sold, order_count, aov. Defaults to ["revenue"] if omitted.',
        },
        dimensions: {
          type: 'ARRAY',
          items: {
            type: 'STRING',
            enum: [
              'category',
              'marketplace',
              'order_status',
              'payment_status',
              'customer',
              'item',
              'date',
              'month',
            ],
          },
          description:
            'Group by dimensions: category, marketplace, order_status, payment_status, customer, item, date (YYYY-MM-DD), and month (YYYY-MM). Leave empty for overall summary totals.',
        },
        filters: {
          type: 'OBJECT',
          properties: {
            start_date: {
              type: 'STRING',
              description: 'Filter sales on or after this date (YYYY-MM-DD format)',
            },
            end_date: {
              type: 'STRING',
              description: 'Filter sales on or before this date (YYYY-MM-DD format)',
            },
            category: {
              type: 'STRING',
              description: 'Exact category filter',
            },
            marketplace: {
              type: 'STRING',
              description: 'Exact marketplace filter (e.g. Shopee, Carousell)',
            },
            order_status: {
              type: 'STRING',
              description: 'Fulfillment status filter (Processing, Shipped, Delivered)',
            },
            payment_status: {
              type: 'STRING',
              description: 'Payment status filter (On Hold, Processing, Paid)',
            },
            customer: {
              type: 'STRING',
              description: 'Customer name filter (case-insensitive substring)',
            },
          },
          description: 'Predicate filters to constrain the query dataset',
        },
        order_by: {
          type: 'STRING',
          enum: ['metric_desc', 'metric_asc', 'dimension_asc', 'dimension_desc'],
          description:
            'Sorting rule: metric_desc (highest metric first, default), metric_asc (lowest metric first), dimension_asc (alphabetical/chronological), dimension_desc.',
        },
        limit: {
          type: 'NUMBER',
          description: 'Maximum rows to return (1 to 50, default: 10 for rankings, 50 for trends)',
        },
        chart_title: {
          type: 'STRING',
          description: 'Concise, informative heading for the generated metrics table',
        },
      },
    },
  },
  {
    name: 'open_create_sale_form',
    description:
      'Open an interactive order creation form card in the chat dialog box allowing the user to enter their own details and click confirm. ALWAYS call this tool when the user asks to create a new order, add an order, record a sale, or fill up an order form.',
    parameters: {
      type: 'OBJECT',
      properties: {
        item: { type: 'STRING', description: 'Optional initial item name' },
        quantity: { type: 'NUMBER', description: 'Optional initial quantity' },
        subtotal: { type: 'NUMBER', description: 'Optional initial selling price in MYR' },
        customer: { type: 'STRING', description: 'Optional initial customer name' },
        marketplace: { type: 'STRING', description: 'Optional initial marketplace (Shopee or Carousell)' },
      },
    },
  },
  {
    name: 'open_update_sale_form',
    description:
      'Open an interactive order edit form card in the chat dialog box allowing the user to select an existing order, edit fields, and click confirm. ALWAYS call this tool when the user asks to edit, update, modify, or change an order or status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        order_id: { type: 'STRING', description: 'Optional ID of the order to edit' },
        search_hint: { type: 'STRING', description: 'Optional customer name or item name to pre-select' },
      },
    },
  },
  {
    name: 'request_delete_sale_item',
    description: 'Request deletion of an existing sale item with user confirmation card in the chat UI.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING', description: 'The exact ID of the sale item to delete' },
        item_name: { type: 'STRING', description: 'Name of the item for display in the confirmation card' },
        customer: { type: 'STRING', description: 'Customer name for display' },
        subtotal: { type: 'NUMBER', description: 'Amount in MYR for display' },
        reason: { type: 'STRING', description: 'Reason for deletion' },
      },
      required: ['id'],
    },
  },
];

/**
 * Builds a lean, token-efficient system instruction without raw dataset bloat.
 * Follows Execution Lifecycle Step 1 & Technical Constraints:
 * - Table schema metadata & allowed enum values
 * - Calendar anchor & current date context
 * - Strict Zero LLM Math directives
 */
function buildSystemInstruction(): string {
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

  const todayFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(currentMonthNum).padStart(2, '0')}/${currentYear}`;
  const currentMonthFormatted = `${String(currentMonthNum).padStart(2, '0')}/${currentYear}`;
  const lastMonthFormatted = `${String(lastMonthNum).padStart(2, '0')}/${lastMonthYear}`;

  return `You are an ultra-high-precision analytics and operations assistant integrated into the Sales Dashboard.

### CALENDAR ANCHOR:
- TODAY'S DATE: ${todayFormatted} (ISO: "${todayStr}")
- CURRENT MONTH: ${currentMonthFormatted} ("${currentMonthName} ${currentYear}", ISO: "${currentYearMonth}")
- LAST MONTH: ${lastMonthFormatted} ("${lastMonthName} ${lastMonthYear}", ISO: "${lastMonthYearMonth}")

### CENTRAL DATABASE SCHEMA (\`sales\` Table):
- \`id\` (UUID): Unique primary key
- \`date\` (DATE): YYYY-MM-DD
- \`item\` (TEXT): Product or service title
- \`quantity\` (INTEGER): Number of units
- \`subtotal\` (NUMERIC): Selling price / revenue in MYR
- \`cost\` (NUMERIC): Total cost / expenses in MYR
- \`sales\` (NUMERIC): Net profit generated always as (subtotal - cost)
- \`category\` (TEXT): Allowed: ${CATEGORIES.join(', ')}
- \`marketplace\` (TEXT): Allowed: ${STORE_TYPES.join(', ')}
- \`payment_method\` (TEXT): Allowed: ${PAYMENT_METHODS.join(', ')}
- \`order_status\` (TEXT): Allowed: ${ORDER_STATUSES.join(', ')}
- \`payment_status\` (TEXT): Allowed: ${PAYMENT_STATUSES.join(', ')}
- \`customer\` (TEXT): Customer name
- \`location\` (TEXT): Delivery address / city

### CRITICAL OPERATIONAL DIRECTIVES:
1. **ZERO LLM MATH (NON-NEGOTIABLE):** 
   You MUST NEVER calculate, sum, subtract, average, or guess numerical values yourself.
   Whenever a user asks for revenue, profit, costs, order counts, averages, performance, summaries, monthly/daily trends, category breakdowns, customer rankings, or charts, you MUST call the \`query_sales_metrics\` function.
2. **STRICT POSTGRESQL AGGREGATION:**
   The central PostgreSQL database is the sole source of mathematical truth. When \`query_sales_metrics\` returns aggregated results, you must cite those exact database figures.
3. **DETERMINISTIC METRICS TABLE & NO DUPLICATE MARKDOWN:**
   When invoking \`query_sales_metrics\`, provide a clean, informative \`chart_title\` (e.g. "Top 5 Customers by Total Spend", "Monthly Revenue & Profit Breakdown").
   ALWAYS select at most 1 or 2 metrics (e.g. \`["revenue", "profit"]\` or \`["revenue"]\`). NEVER request 3 or more metrics simultaneously.
   CRITICAL: NEVER format data rows as a markdown table in your text response. A dedicated data table card is already automatically rendered for the user. In your text response, provide ONLY a 1-2 sentence executive summary or commentary highlighting the top numbers.
4. **CURRENCY FORMATTING:**
   Always format currency as "RM X.XX" (e.g. RM 1,450.00).
5. **DATE FORMATTING (MANDATORY):**
   Always format dates presented to the user in "DD/MM/YYYY" format (e.g. "03/09/2026").
   For monthly breakdowns, period labels, and trends, format as "MM/YYYY" (e.g. "09/2026").
   You may use "DD/MM" for compact item listings within the same year.
   (Note: For database query filters and create/update item actions, continue passing standard ISO "YYYY-MM-DD" internally).
6. **DASHBOARD ACTIONS & USER ORDER CRUD FORMS:**
   - Use \`open_create_sale_form\` whenever the user asks to create a new order, add an order, record a sale, or fill up an order form. This displays an interactive form card directly inside the chat dialog box where the user can enter their own details and click confirm.
   - Use \`open_update_sale_form\` whenever the user asks to edit, update, or modify an existing order. This displays an interactive edit form card in the chat dialog box allowing the user to select an order, adjust status or prices, and click confirm.
   - Use \`request_delete_sale_item\` when the user asks to remove an order.`;
}

// Helper: Smart fuzzy matching for updates and deletes
function findBestMatchingSale(sales: SaleItem[], targetId?: string, searchHint?: string): SaleItem | undefined {
  if (targetId) {
    const exact = sales.find((s) => s.id === targetId);
    if (exact) return exact;
  }
  if (!searchHint) return undefined;

  const hint = searchHint.toLowerCase().trim();
  if (!hint) return undefined;

  // Support matching the most recent / latest order when requested
  if (hint.includes('latest') || hint.includes('recent') || hint.includes('last') || hint === 'newest') {
    if (sales.length > 0) {
      return [...sales].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    }
  }

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

// Fetch with automatic retry and exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, options);
      if (
        resp.ok ||
        resp.status === 400 ||
        resp.status === 401 ||
        resp.status === 403 ||
        resp.status === 404
      ) {
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
 * Server Action: Send a message to Google AI Studio Gemini API
 * Powered by Deterministic Semantic Function-Calling Pipeline
 */
export async function sendSalesAiMessage(
  history: ChatMessage[],
  newMessage: string,
  sales: SaleItem[] = []
): Promise<AiServerResponse> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Google AI Studio API Key is not configured on the server. Please set GOOGLE_API_KEY in your environment variables (.env.local).'
    );
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const systemInstruction = buildSystemInstruction();

  // Prepare Gemini conversation payload (pruned to recent turns for efficiency)
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

  // Handle Tool Calls if Gemini requested any
  if (functionCalls.length > 0) {
    let resolvedChartSpec: ChartSpec | undefined;
    let pendingDeleteResult: {
      id: string;
      itemName: string;
      customer: string;
      subtotal: number;
    } | undefined;
    let pendingCreateFormResult: PendingCreateForm | undefined;
    let pendingUpdateFormResult: PendingUpdateForm | undefined;
    let actionExecutedDescription = '';

    const functionResponses: Array<{
      functionResponse: {
        name: string;
        response: Record<string, unknown>;
      };
    }> = [];

    for (const call of functionCalls) {
      const { name, args } = call;

      if (name === 'query_sales_metrics') {
        // Execute Deterministic Semantic Function-Calling against PostgreSQL
        try {
          const queryResult = await executeSalesMetricsQuery(
            args as unknown as QuerySalesMetricsArgs,
            sales
          );

          resolvedChartSpec = queryResult.chartSpec;
          actionExecutedDescription = `Generated analytics for ${resolvedChartSpec.title}`;

          functionResponses.push({
            functionResponse: {
              name,
              response: {
                status: 'success',
                row_count: queryResult.rowCount,
                records: queryResult.data,
                chart_spec: {
                  type: queryResult.chartSpec.type,
                  title: queryResult.chartSpec.title,
                  xAxisKey: queryResult.chartSpec.xAxisKey,
                  dataKeys: queryResult.chartSpec.dataKeys,
                },
                source: queryResult.source,
              },
            },
          });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Database aggregation query failed';
          functionResponses.push({
            functionResponse: {
              name,
              response: {
                status: 'error',
                error: errMsg,
              },
            },
          });
        }
      } else if (name === 'open_create_sale_form') {
        const item = args.item ? String(args.item) : undefined;
        const quantity = args.quantity !== undefined && !isNaN(Number(args.quantity)) ? Number(args.quantity) : undefined;
        const subtotal = args.subtotal !== undefined && !isNaN(Number(args.subtotal)) ? Number(args.subtotal) : undefined;
        const customer = args.customer ? String(args.customer) : undefined;
        const marketplace = args.marketplace ? String(args.marketplace) : undefined;

        pendingCreateFormResult = {
          initialValues: {
            item,
            quantity,
            subtotal,
            customer,
            marketplace,
          },
        };
        actionExecutedDescription = 'Opened interactive order creation form';

        functionResponses.push({
          functionResponse: {
            name,
            response: {
              status: 'form_displayed',
              message: 'Interactive order creation form is now displayed in the dialog for the user to fill and confirm.',
            },
          },
        });
      } else if (name === 'open_update_sale_form') {
        const orderId = args.order_id ? String(args.order_id) : undefined;
        const searchHint = args.search_hint ? String(args.search_hint) : undefined;

        pendingUpdateFormResult = {
          orderId,
          searchHint,
        };
        actionExecutedDescription = 'Opened interactive order update form';

        functionResponses.push({
          functionResponse: {
            name,
            response: {
              status: 'form_displayed',
              message: 'Interactive order update form is now displayed in the dialog for the user to select and confirm.',
            },
          },
        });
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
              message: 'Confirmation card has been displayed to user in the chat UI.',
            },
          },
        });
      }
    }

    // Follow-up completion: Inject exact aggregate results back into LLM stream
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

    // Defense-in-depth: If structured chartSpec/table is attached, strip any redundant markdown tables from model text
    if (resolvedChartSpec && modelText) {
      modelText = modelText
        .split('\n')
        .filter((line) => {
          const t = line.trim();
          return !(t.startsWith('|') && t.endsWith('|'));
        })
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'model',
      text: modelText || actionExecutedDescription || 'Action completed successfully.',
      timestamp: Date.now(),
      toolCalls: functionCalls,
      chartSpec: resolvedChartSpec,
      pendingDelete: pendingDeleteResult,
      pendingCreateForm: pendingCreateFormResult,
      pendingUpdateForm: pendingUpdateFormResult,
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
