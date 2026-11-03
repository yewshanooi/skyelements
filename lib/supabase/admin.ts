import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from './config';

export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey?.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_SECRET_KEY must contain a Supabase sb_secret_ key.');
  }

  return createSupabaseClient(getSupabaseUrl(), secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
