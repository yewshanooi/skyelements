import { executeSalesMetricsQuery } from '@/sales/services/salesAnalyticsEngine';
import type { QuerySalesMetricsArgs } from '@/sales/types/ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiToolResult } from './types';
import { isValidUuid } from './context';

// ==============================================================================
// 1. Tool Declaration Definitions for Gemini Function Calling
// ==============================================================================

export const AI_TOOLS = [
  // --- Notes App Tools ---
  {
    name: 'ai_list_notes',
    description:
      'List all notes belonging to the current user. Returns note IDs, titles, whether they are pinned, and last updated dates. Use this whenever the user asks what notes they have, asks to see their notes, or to identify which note to read or edit.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'ai_read_note',
    description:
      'Read the full content and details of a specific note. Accepts either the note ID or a search keyword matching the note title.',
    parameters: {
      type: 'OBJECT',
      properties: {
        note_id: {
          type: 'STRING',
          description: 'The UUID of the note to read if known.',
        },
        search: {
          type: 'STRING',
          description: 'Keyword or title fragment to find and read the note.',
        },
      },
    },
  },
  {
    name: 'ai_create_note',
    description:
      'Create a brand new note in the user\'s Notes app. ALWAYS use this tool when the user asks to save something as a note, create a note, write a note, or record information/summaries for later.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Descriptive title for the note.',
        },
        content: {
          type: 'STRING',
          description: 'Full markdown content of the note.',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'ai_update_note',
    description:
      'Update the title and/or content of an existing note.',
    parameters: {
      type: 'OBJECT',
      properties: {
        note_id: {
          type: 'STRING',
          description: 'The UUID of the note to update.',
        },
        title: {
          type: 'STRING',
          description: 'Optional updated title.',
        },
        content: {
          type: 'STRING',
          description: 'Optional updated markdown content.',
        },
      },
      required: ['note_id'],
    },
  },

  // --- Sales Dashboard Tools ---
  {
    name: 'ai_query_sales_metrics',
    description:
      'Execute deterministic aggregation queries directly against the PostgreSQL sales database. ALWAYS use this tool whenever the user asks for financial totals, revenue, profit, costs, order counts, averages, breakdowns by category/marketplace/customer/status, monthly/daily trends, rankings, or chart visualizations. NEVER guess numbers or calculate them mentally.',
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
            'Target metrics to aggregate. Targets: revenue, cost, profit, units_sold, order_count, aov. Defaults to ["revenue"] if omitted.',
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
            'Group by dimensions: category, marketplace, order_status, payment_status, customer, item, date (YYYY-MM-DD), month (YYYY-MM). Leave empty for overall summary totals.',
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
              description: 'Exact category filter (e.g. "Collectibles")',
            },
            categories: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Multiple categories to filter or compare',
            },
            marketplace: {
              type: 'STRING',
              description: 'Exact marketplace filter (Shopee, Carousell)',
            },
            marketplaces: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Multiple marketplaces to compare',
            },
            order_status: {
              type: 'STRING',
              description: 'Fulfillment status (Processing, Shipped, Delivered)',
            },
            payment_status: {
              type: 'STRING',
              description: 'Payment status (On Hold, Processing, Paid)',
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
          description: 'Sorting rule. Default: metric_desc.',
        },
        limit: {
          type: 'NUMBER',
          description: 'Maximum rows to return (default: 10 for rankings, 50 for trends)',
        },
        chart_title: {
          type: 'STRING',
          description: 'Concise heading for the generated metrics table',
        },
      },
    },
  },
  {
    name: 'ai_search_sales',
    description:
      'Search individual sales order records by customer name, item name, marketplace, or order status. Returns the latest matching orders.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Keyword to search across customer name, item name, or notes.',
        },
        marketplace: {
          type: 'STRING',
          description: 'Optional filter by marketplace (Shopee or Carousell).',
        },
        limit: {
          type: 'NUMBER',
          description: 'Number of orders to retrieve (default: 10, max: 25).',
        },
      },
    },
  },
  {
    name: 'ai_create_sale',
    description:
      'Record a new sales order into the Sales Dashboard database.',
    parameters: {
      type: 'OBJECT',
      properties: {
        item: { type: 'STRING', description: 'Name of the item sold.' },
        quantity: { type: 'NUMBER', description: 'Quantity sold (default 1).' },
        subtotal: { type: 'NUMBER', description: 'Total selling price in MYR.' },
        cost: { type: 'NUMBER', description: 'Total item cost in MYR (default 0).' },
        customer: { type: 'STRING', description: 'Customer name.' },
        marketplace: { type: 'STRING', description: 'Marketplace platform (Shopee, Carousell, etc.).' },
        category: { type: 'STRING', description: 'Item category.' },
        order_status: { type: 'STRING', description: 'Order status (Delivered, Shipped, Processing).' },
        payment_status: { type: 'STRING', description: 'Payment status (Paid, Processing, On Hold).' },
        notes: { type: 'STRING', description: 'Optional order notes.' },
      },
      required: ['item', 'subtotal'],
    },
  },
];

// ==============================================================================
// 2. Deterministic Tool Execution Engine
// ==============================================================================

function getNoteContentForAi(content: unknown): string {
  if (typeof content !== 'string') return '';

  try {
    const parsed = JSON.parse(content) as {
      root?: { type?: string; children?: unknown[] };
    };
    if (parsed?.root?.type !== 'root' || !Array.isArray(parsed.root.children)) {
      return content;
    }

    const readNode = (node: unknown): string => {
      if (!node || typeof node !== 'object') return '';
      const value = node as { text?: unknown; type?: string; children?: unknown[] };
      if (typeof value.text === 'string') return value.text;
      if (!Array.isArray(value.children)) return '';

      const separator = value.type === 'root' ? '\n\n' : '';
      return value.children.map(readNode).filter(Boolean).join(separator);
    };

    return readNode(parsed.root);
  } catch {
    return content;
  }
}

export async function executeAiTool(
  toolName: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<AiToolResult> {
  try {
    switch (toolName) {
      // --- Notes Handlers ---
      case 'ai_list_notes': {
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, is_pinned, created_at, updated_at')
          .eq('user_id', userId)
          .order('is_pinned', { ascending: false })
          .order('updated_at', { ascending: false })
          .limit(30);

        if (error) {
          return { toolName, output: { error: `Database error: ${error.message}` } };
        }

        const notes = data ?? [];
        return {
          toolName,
          output: {
            total_notes: notes.length,
            notes: notes.map((n) => ({
              id: n.id,
              title: n.title || 'Untitled',
              is_pinned: n.is_pinned,
              updated_at: n.updated_at,
            })),
          },
          card: {
            type: 'notes_list',
            title: `Your Notes (${notes.length})`,
            data: notes,
          },
        };
      }

      case 'ai_read_note': {
        const noteId = typeof args.note_id === 'string' ? args.note_id.trim() : '';
        const search = typeof args.search === 'string' ? args.search.trim().slice(0, 100) : '';

        let query = supabase.from('notes').select('id, title, content, updated_at').eq('user_id', userId);

        if (noteId) {
          if (!isValidUuid(noteId)) {
            return { toolName, output: { error: 'Invalid note ID format.' } };
          }
          query = query.eq('id', noteId);
        } else if (search) {
          query = query.ilike('title', `%${search}%`);
        } else {
          return { toolName, output: { error: 'Please provide either note_id or search query.' } };
        }

        const { data, error } = await query.limit(1).maybeSingle();

        if (error) {
          return { toolName, output: { error: error.message } };
        }
        if (!data) {
          return { toolName, output: { message: 'No matching note found.' } };
        }

        return {
          toolName,
          output: {
            id: data.id,
            title: data.title,
            content: getNoteContentForAi(data.content),
            updated_at: data.updated_at,
          },
        };
      }

      case 'ai_create_note': {
        const title = typeof args.title === 'string' && args.title.trim()
          ? args.title.trim().slice(0, 255)
          : 'Untitled';
        const content = typeof args.content === 'string' ? args.content.slice(0, 50000) : '';

        const { data, error } = await supabase
          .from('notes')
          .insert({
            user_id: userId,
            title,
            content,
          })
          .select()
          .single();

        if (error) {
          return { toolName, output: { error: `Failed to create note: ${error.message}` } };
        }

        return {
          toolName,
          output: {
            success: true,
            id: data.id,
            title: data.title,
            message: `Note "${data.title}" was created successfully in your Notes app.`,
          },
          card: {
            type: 'note_created',
            title: `Note Created: ${data.title}`,
            data,
          },
        };
      }

      case 'ai_update_note': {
        const noteId = typeof args.note_id === 'string' ? args.note_id.trim() : '';
        if (!noteId || !isValidUuid(noteId)) {
          return { toolName, output: { error: 'A valid note_id is required' } };
        }

        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (typeof args.title === 'string' && args.title.trim()) {
          updates.title = args.title.trim().slice(0, 255);
        }
        if (typeof args.content === 'string') {
          updates.content = args.content.slice(0, 50000);
        }

        const { data, error } = await supabase
          .from('notes')
          .update(updates)
          .eq('id', noteId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          return { toolName, output: { error: `Failed to update note: ${error.message}` } };
        }

        return {
          toolName,
          output: {
            success: true,
            note: data,
            message: `Note "${data.title}" was updated successfully.`,
          },
        };
      }

      // --- Sales Handlers ---
      case 'ai_query_sales_metrics': {
        const metricsArgs = args as unknown as QuerySalesMetricsArgs;
        const result = await executeSalesMetricsQuery(metricsArgs);
        const heading = result.chartSpec?.title || 'Sales Analytics Report';

        return {
          toolName,
          output: {
            heading,
            rows_count: result.data.length,
            data: result.data,
            source: result.source,
          },
        };
      }

      case 'ai_search_sales': {
        const rawQuery = typeof args.query === 'string' ? args.query : '';
        const rawMarketplace = typeof args.marketplace === 'string' ? args.marketplace : '';
        const limitNum = typeof args.limit === 'number' ? Math.min(Math.max(1, Math.round(args.limit)), 25) : 10;

        // Sanitize search inputs to strip PostgREST filter delimiter characters [(),"%\\;] to prevent filter injection
        const sanitizedQuery = rawQuery.replace(/[(),"%\\;]/g, ' ').trim().slice(0, 100);
        const sanitizedMarketplace = rawMarketplace.replace(/[(),"%\\;]/g, ' ').trim().slice(0, 100);

        let query = supabase
          .from('sales')
          .select('id, item, quantity, subtotal, cost, sales, customer, marketplace, category, order_status, payment_status, date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(limitNum);

        if (sanitizedQuery) {
          query = query.or(`customer.ilike.%${sanitizedQuery}%,item.ilike.%${sanitizedQuery}%,notes.ilike.%${sanitizedQuery}%`);
        }
        if (sanitizedMarketplace) {
          query = query.ilike('marketplace', `%${sanitizedMarketplace}%`);
        }

        const { data, error } = await query;
        if (error) {
          return { toolName, output: { error: `Failed to search orders: ${error.message}` } };
        }

        const orders = data ?? [];
        return {
          toolName,
          output: {
            count: orders.length,
            orders,
          },
        };
      }

      case 'ai_create_sale': {
        const item = String(args.item || 'Item').trim().slice(0, 200) || 'Item';
        const quantity = Math.max(1, Math.min(1000000, Math.round(Number(args.quantity) || 1)));
        const rawSubtotal = Number(args.subtotal) || 0;
        const subtotal = Math.max(0, Math.min(10000000, Number.isFinite(rawSubtotal) ? rawSubtotal : 0));
        const rawCost = Number(args.cost) || 0;
        const cost = Math.max(0, Math.min(10000000, Number.isFinite(rawCost) ? rawCost : 0));
        const customer = String(args.customer || '').trim().slice(0, 200);
        const marketplace = String(args.marketplace || 'Shopee').trim().slice(0, 100) || 'Shopee';
        const category = String(args.category || 'General').trim().slice(0, 100) || 'General';
        const order_status = String(args.order_status || 'Delivered').trim().slice(0, 50) || 'Delivered';
        const payment_status = String(args.payment_status || 'Paid').trim().slice(0, 50) || 'Paid';
        const notes = String(args.notes || '').trim().slice(0, 2000);

        const { data, error } = await supabase
          .from('sales')
          .insert({
            user_id: userId,
            item,
            quantity,
            subtotal,
            cost,
            customer,
            marketplace,
            category,
            order_status,
            payment_status,
            notes,
            date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (error) {
          return { toolName, output: { error: `Failed to record sale: ${error.message}` } };
        }

        return {
          toolName,
          output: {
            success: true,
            id: data.id,
            message: `Recorded sale for "${item}" (RM ${subtotal.toFixed(2)}) on ${marketplace}.`,
          },
          card: {
            type: 'sale_created',
            title: `Sale Recorded: ${item}`,
            data,
          },
        };
      }

      default:
        return { toolName, output: { error: `Unrecognized AI tool: ${toolName}` } };
    }
  } catch (err: any) {
    console.error(`[AI Tools] Error executing ${toolName}:`, err);
    return { toolName, output: { error: err?.message || 'Tool execution encountered an unexpected error.' } };
  }
}
