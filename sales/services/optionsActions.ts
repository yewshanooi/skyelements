'use server';

import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_OPTION_COLOR,
  MAX_OPTION_NAME_LENGTH,
  isOptionType,
  isValidOptionColor,
  type OptionType,
  type SalesOption,
} from '@/sales/lib/optionTypes';

type OptionActionResult = { ok: true } | { ok: false; error: string };

const OPTION_COLUMNS = 'id, type, name, color';

interface OptionRow {
  id: string;
  type: string;
  name: string;
  color: string;
}

function mapRow(row: OptionRow): SalesOption {
  return {
    id: row.id,
    type: row.type as OptionType,
    name: row.name,
    color: isValidOptionColor(row.color) ? row.color : DEFAULT_OPTION_COLOR,
  };
}

function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_OPTION_NAME_LENGTH) return null;
  return trimmed;
}

function friendlyError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (message.includes('already exists') || message.includes('duplicate key')) {
    return 'An option with this name already exists.';
  }
  if (message.includes('Option not found')) return 'This option no longer exists.';
  return fallback;
}

async function getUserAndClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

/**
 * Fetches all dropdown options for the signed-in user, oldest first.
 * New users have none: they create options themselves.
 */
export async function fetchOptionsAction(): Promise<SalesOption[]> {
  const ctx = await getUserAndClient();
  if (!ctx) return [];

  const { data, error } = await ctx.supabase
    .from('sales_options')
    .select(OPTION_COLUMNS)
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[fetchOptionsAction] Error fetching options:', error);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function createOptionAction(
  type: OptionType,
  name: string,
  color: string = DEFAULT_OPTION_COLOR
): Promise<OptionActionResult> {
  const ctx = await getUserAndClient();
  if (!ctx) return { ok: false, error: 'You must be signed in.' };
  if (!isOptionType(type)) return { ok: false, error: 'Invalid option type.' };

  const cleaned = cleanName(name);
  if (!cleaned) {
    return { ok: false, error: `Name must be 1-${MAX_OPTION_NAME_LENGTH} characters.` };
  }

  const { error } = await ctx.supabase.from('sales_options').insert({
    user_id: ctx.user.id,
    type,
    name: cleaned,
    color: isValidOptionColor(color) ? color : DEFAULT_OPTION_COLOR,
  });

  if (error) {
    // 23505 = unique_violation (same name already exists for this type)
    if (error.code !== '23505') console.error('[createOptionAction] DB insert error:', error);
    return { ok: false, error: friendlyError(error.message, 'Failed to create option.') };
  }
  return { ok: true };
}

/**
 * Renames an option and every sale row that uses it (atomic, via RPC).
 */
export async function renameOptionAction(
  type: OptionType,
  oldName: string,
  newName: string
): Promise<OptionActionResult> {
  const ctx = await getUserAndClient();
  if (!ctx) return { ok: false, error: 'You must be signed in.' };
  if (!isOptionType(type)) return { ok: false, error: 'Invalid option type.' };

  const cleaned = cleanName(newName);
  if (!cleaned) {
    return { ok: false, error: `Name must be 1-${MAX_OPTION_NAME_LENGTH} characters.` };
  }

  const { error } = await ctx.supabase.rpc('rename_sales_option', {
    p_type: type,
    p_old_name: oldName,
    p_new_name: cleaned,
  });

  if (error) {
    console.error('[renameOptionAction] RPC error:', error);
    return { ok: false, error: friendlyError(error.message, 'Failed to rename option.') };
  }
  return { ok: true };
}

export async function updateOptionColorAction(
  type: OptionType,
  name: string,
  color: string
): Promise<OptionActionResult> {
  const ctx = await getUserAndClient();
  if (!ctx) return { ok: false, error: 'You must be signed in.' };
  if (!isOptionType(type)) return { ok: false, error: 'Invalid option type.' };
  if (!isValidOptionColor(color)) return { ok: false, error: 'Invalid color.' };

  const { error } = await ctx.supabase
    .from('sales_options')
    .update({ color })
    .eq('user_id', ctx.user.id)
    .eq('type', type)
    .eq('name', name);

  if (error) {
    console.error('[updateOptionColorAction] DB update error:', error);
    return { ok: false, error: 'Failed to update color.' };
  }
  return { ok: true };
}

/**
 * Deletes an option from the list. Existing sales keep their text value.
 */
export async function deleteOptionAction(
  type: OptionType,
  name: string
): Promise<OptionActionResult> {
  const ctx = await getUserAndClient();
  if (!ctx) return { ok: false, error: 'You must be signed in.' };
  if (!isOptionType(type)) return { ok: false, error: 'Invalid option type.' };

  const { data, error } = await ctx.supabase
    .from('sales_options')
    .delete()
    .eq('user_id', ctx.user.id)
    .eq('type', type)
    .eq('name', name)
    .select('id');

  if (error) {
    console.error('[deleteOptionAction] DB delete error:', error);
    return { ok: false, error: 'Failed to delete option.' };
  }

  if (!data?.length) {
    // Treat an already-deleted option as success, but don't hide a failed delete.
    const { data: remaining, error: checkError } = await ctx.supabase
      .from('sales_options')
      .select('id')
      .eq('user_id', ctx.user.id)
      .eq('type', type)
      .eq('name', name)
      .maybeSingle();

    if (checkError || remaining) {
      console.error('[deleteOptionAction] Delete matched no rows but option remains:', checkError);
      return { ok: false, error: 'Failed to delete option.' };
    }
  }

  return { ok: true };
}
