/**
 * Shared (server + client safe) definitions for per-user Sales Dashboard settings.
 * These are persisted in `public.sales_settings` so they follow the user across devices.
 * Do NOT add "use client" / "use server" here.
 */

export interface SalesSettings {
  /** Custom "Sales" (profit) formula. */
  formula?: string;
  /** Table column widths, keyed by column id. */
  tableColumnWidths?: Record<string, number>;
  /** Chart view widget layout. */
  chartLayout?: Record<string, unknown>;
  /** Chart view overview KPI card layout. */
  overviewKpiLayout?: Record<string, unknown>;
  /** Chart view sub-control selections (granularity, chart type, ...). */
  chartSubcontrols?: Record<string, unknown>;
}

export type SalesSettingKey = keyof SalesSettings;

const MAX_FORMULA_LENGTH = 2000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns only the known, well-shaped keys of an untrusted settings object.
 */
export function sanitizeSettingsPatch(input: unknown): SalesSettings {
  const out: SalesSettings = {};
  if (!isPlainObject(input)) return out;

  if (typeof input.formula === 'string' && input.formula.length <= MAX_FORMULA_LENGTH) {
    out.formula = input.formula;
  }
  if (isPlainObject(input.tableColumnWidths)) {
    const widths: Record<string, number> = {};
    for (const [key, value] of Object.entries(input.tableColumnWidths)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 5000) {
        widths[key] = Math.round(value);
      }
    }
    out.tableColumnWidths = widths;
  }
  if (isPlainObject(input.chartLayout)) out.chartLayout = input.chartLayout;
  if (isPlainObject(input.overviewKpiLayout)) out.overviewKpiLayout = input.overviewKpiLayout;
  if (isPlainObject(input.chartSubcontrols)) out.chartSubcontrols = input.chartSubcontrols;

  return out;
}
