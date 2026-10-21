'use server';

import { createClient } from '@/lib/supabase/server';
import { sanitizeSettingsPatch, type SalesSettings } from '@/sales/lib/salesSettings';

/**
 * Loads the signed-in user's dashboard settings (empty object for new users).
 */
export async function fetchSettingsAction(): Promise<SalesSettings> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return {};

  const { data, error } = await supabase
    .from('sales_settings')
    .select('settings')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[fetchSettingsAction] Error fetching settings:', error);
    return {};
  }
  return sanitizeSettingsPatch(data?.settings);
}

/**
 * Merges the given top-level keys into the user's settings (atomic, via RPC).
 */
export async function patchSettingsAction(
  patch: SalesSettings
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: 'You must be signed in.' };

  const clean = sanitizeSettingsPatch(patch);
  if (Object.keys(clean).length === 0) return { ok: true };

  const { error } = await supabase.rpc('patch_sales_settings', { p_patch: clean });
  if (error) {
    console.error('[patchSettingsAction] RPC error:', error);
    return { ok: false, error: 'Failed to save settings.' };
  }
  return { ok: true };
}
