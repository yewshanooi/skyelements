import type { SupabaseClient } from '@supabase/supabase-js';
import {
  OPTION_TYPES,
  OPTION_TYPE_LABELS,
  DEFAULT_OPTION_COLOR,
  isOptionType,
  isValidOptionColor,
  type OptionType,
  type SalesOption,
} from '@/sales/lib/optionTypes';

/**
 * Server-side helpers that let the AI assistant (and analytics) work with the
 * user's own dropdown options instead of any hard-coded list.
 * Runs with the caller's Supabase client, so RLS limits it to that user.
 */

export type OptionsByType = Record<OptionType, string[]>;

/** Upper bounds keep the system prompt small and bounded. */
const MAX_OPTIONS_PER_TYPE_IN_PROMPT = 60;

export async function loadUserSalesOptions(
  supabase: SupabaseClient,
  userId: string
): Promise<SalesOption[]> {
  try {
    const { data, error } = await supabase
      .from('sales_options')
      .select('id, type, name, color')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .order('name', { ascending: true });

    if (error || !data) {
      if (error) console.error('[optionLookup] Failed to load options:', error);
      return [];
    }

    return data
      .filter((row) => isOptionType(row.type))
      .map((row) => ({
        id: row.id as string,
        type: row.type as OptionType,
        name: row.name as string,
        color: isValidOptionColor(row.color) ? row.color : DEFAULT_OPTION_COLOR,
      }));
  } catch (err) {
    console.error('[optionLookup] Unexpected error loading options:', err);
    return [];
  }
}

export function groupOptionNames(options: SalesOption[]): OptionsByType {
  const grouped = Object.fromEntries(OPTION_TYPES.map((t) => [t, [] as string[]])) as OptionsByType;
  for (const opt of options) grouped[opt.type].push(opt.name);
  return grouped;
}

/**
 * Case-insensitive match of a free-text value against the user's saved options.
 * Returns the saved spelling, or null when the user has no such option.
 */
export function matchOptionName(
  options: SalesOption[],
  type: OptionType,
  raw: string
): string | null {
  const needle = raw.trim().toLowerCase();
  if (!needle) return null;
  const match = options.find((o) => o.type === type && o.name.toLowerCase() === needle);
  return match ? match.name : null;
}

/**
 * Compact, JSON-encoded summary of the user's options for the AI system prompt.
 * Names are user-entered, so they are JSON-escaped and labelled as data.
 */
export function formatOptionsForPrompt(options: SalesOption[]): string {
  const grouped = groupOptionNames(options);
  const payload: Record<string, string[]> = {};
  for (const type of OPTION_TYPES) {
    payload[OPTION_TYPE_LABELS[type]] = grouped[type].slice(0, MAX_OPTIONS_PER_TYPE_IN_PROMPT);
  }
  // Escape "<" so an option name can never close the surrounding <sales_options> tag.
  return JSON.stringify(payload, null, 2).replace(/</g, '\\u003c');
}
