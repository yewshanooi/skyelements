export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured.');
  return url;
}

export function getSupabasePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key?.startsWith('sb_publishable_')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must contain a Supabase sb_publishable_ key.');
  }
  return key;
}
