'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import type { SaleItem } from '@/sales/types';
import { geocodeAddress } from '@/sales/services/geocodeService';
import { normalizeCoordinates } from '@/sales/lib/locationParser';
import { extractStoragePath, mapRowToSaleItem, SALES_SELECT_COLUMNS } from '@/sales/lib/saleMappers';

/**
 * Fetch all sales for the authenticated user from the server
 */
export async function fetchSalesAction(): Promise<SaleItem[]> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from('sales')
    .select(SALES_SELECT_COLUMNS)
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchSalesAction] Error fetching sales:', error);
    return [];
  }

  return (data || []).map(mapRowToSaleItem);
}

/**
 * Helper to resolve geocoded coordinates with fallback and normalization
 */
async function resolveCoordinates(
  location?: string | null,
  lat?: number,
  lng?: number
): Promise<{ lat: number | null; lng: number | null }> {
  let finalLat = lat;
  let finalLng = lng;

  if (location && (finalLat === undefined || finalLng === undefined || isNaN(finalLat) || isNaN(finalLng))) {
    try {
      const coords = await geocodeAddress(location);
      if (coords) {
        finalLat = coords.lat;
        finalLng = coords.lng;
      }
    } catch (err) {
      console.warn('[salesActions] Geocoding fallback error:', err);
    }
  }

  if (finalLat !== undefined && finalLng !== undefined && !isNaN(finalLat) && !isNaN(finalLng)) {
    const norm = normalizeCoordinates(finalLat, finalLng);
    if (norm) {
      return { lat: norm.lat, lng: norm.lng };
    }
    return { lat: finalLat, lng: finalLng };
  }

  return { lat: null, lng: null };
}

/**
 * Validates and sanitizes invoice storage paths and URLs.
 * Prevents javascript: pseudo-protocols and cross-tenant path injection.
 */
function sanitizeInvoiceUrl(url?: string | null, userId?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase().startsWith('javascript:') ||
    trimmed.toLowerCase().startsWith('data:')
  ) {
    return null;
  }

  const storagePath = extractStoragePath(trimmed, 'invoices');
  if (storagePath) {
    if (userId && (!storagePath.startsWith(`${userId}/`) || storagePath.includes('..'))) {
      return null;
    }
    return storagePath;
  }

  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  return null;
}

/**
 * Whitelist of columns permitted in update payloads to prevent mass-assignment attacks.
 */
const ALLOWED_UPDATE_COLUMNS = new Set([
  'quantity',
  'item',
  'category',
  'marketplace',
  'payment_method',
  'customer',
  'date',
  'subtotal',
  'cost',
  'order_status',
  'payment_status',
  'invoice_url',
  'invoice_name',
  'location',
  'latitude',
  'longitude',
  'notes',
]);

/**
 * Helper to remove attached invoice files from private Supabase Storage
 */
async function cleanupInvoiceFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  invoiceUrls: (string | null | undefined)[]
): Promise<void> {
  try {
    const paths = invoiceUrls
      .map((url) => extractStoragePath(url, 'invoices'))
      .filter((p): p is string => Boolean(p && p.startsWith(`${userId}/`) && !p.includes('..')));

    if (paths.length > 0) {
      await supabase.storage.from('invoices').remove(paths);
    }
  } catch (err) {
    console.warn('[salesActions] Could not clean up invoice storage:', err);
  }
}

/**
 * Server Action: Create a new sale
 */
export async function createSaleAction(sale: Omit<SaleItem, 'id'>): Promise<SaleItem> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to create sales records.');
  }

  const rawItem = String(sale.item || '').trim();
  if (!rawItem) {
    throw new Error('Order item name is required.');
  }

  const { lat, lng } = await resolveCoordinates(sale.location, sale.latitude, sale.longitude);

  const { data, error } = await supabase
    .from('sales')
    .insert({
      user_id: user.id,
      quantity: sale.quantity !== undefined && sale.quantity !== null && !isNaN(Number(sale.quantity)) ? Math.max(0, Math.round(Number(sale.quantity))) : 0,
      item: rawItem.slice(0, 500),
      category: String(sale.category || '').slice(0, 100),
      marketplace: String(sale.marketplace || '').slice(0, 100),
      payment_method: String(sale.payment_method || '').slice(0, 100),
      customer: String(sale.customer || '').slice(0, 500),
      date: sale.date || new Date().toISOString().split('T')[0],
      subtotal: Math.max(0, Number(sale.subtotal) || 0),
      cost: Math.max(0, Number(sale.cost) || 0),
      order_status: String(sale.order_status || '').slice(0, 100),
      payment_status: String(sale.payment_status || '').slice(0, 100),
      invoice_url: sanitizeInvoiceUrl(sale.invoice_url, user.id),
      invoice_name: sale.invoice_name ? String(sale.invoice_name).slice(0, 255) : null,
      location: sale.location ? String(sale.location).slice(0, 1000) : null,
      latitude: lat,
      longitude: lng,
      notes: sale.notes ? String(sale.notes).slice(0, 5000) : null,
    })
    .select(SALES_SELECT_COLUMNS)
    .single();

  if (error) {
    console.error('[createSaleAction] DB insert error:', error);
    throw new Error(`Failed to create sale: ${error.message}`);
  }

  revalidatePath('/sales');
  revalidatePath('/sales/[view]', 'page');
  return mapRowToSaleItem(data);
}

/**
 * Server Action: Update an existing sale
 */
export async function updateSaleAction(
  id: string,
  updates: Partial<SaleItem>
): Promise<SaleItem> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to update sales records.');
  }

  const dbPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!ALLOWED_UPDATE_COLUMNS.has(key)) continue;
    dbPayload[key] = value === undefined ? null : value;
  }

  if (typeof dbPayload.item === 'string') {
    dbPayload.item = dbPayload.item.trim().slice(0, 500);
    if (!dbPayload.item) {
      throw new Error('Order item name cannot be empty.');
    }
  }
  if (typeof dbPayload.notes === 'string') {
    dbPayload.notes = dbPayload.notes.slice(0, 5000);
  }
  if (typeof dbPayload.location === 'string') {
    dbPayload.location = dbPayload.location.slice(0, 1000);
  }

  if (updates.location !== undefined || updates.latitude !== undefined || updates.longitude !== undefined) {
    const { lat, lng } = await resolveCoordinates(
      updates.location,
      updates.latitude,
      updates.longitude
    );
    if (lat !== null || updates.latitude !== undefined) dbPayload.latitude = lat;
    if (lng !== null || updates.longitude !== undefined) dbPayload.longitude = lng;
  }

  // Explicitly ensure invoice removal or sanitized update is honored
  if ('invoice_url' in updates) {
    dbPayload.invoice_url = sanitizeInvoiceUrl(updates.invoice_url, user.id);
  }
  if ('invoice_name' in updates) {
    dbPayload.invoice_name = updates.invoice_name ? String(updates.invoice_name).slice(0, 255) : null;
  }

  const { data, error } = await supabase
    .from('sales')
    .update(dbPayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(SALES_SELECT_COLUMNS)
    .single();

  if (error) {
    console.error('[updateSaleAction] DB update error:', error);
    throw new Error(`Failed to update sale: ${error.message}`);
  }

  revalidatePath('/sales');
  revalidatePath('/sales/[view]', 'page');
  return mapRowToSaleItem(data);
}

/**
 * Server Action: Delete a sale and clean up invoice file from private storage
 */
export async function deleteSaleAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to delete sales records.');
  }

  // 1. Fetch sale to check for attached invoice
  const { data: sale } = await supabase
    .from('sales')
    .select('invoice_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (sale?.invoice_url) {
    await cleanupInvoiceFiles(supabase, user.id, [sale.invoice_url]);
  }

  // 2. Delete sale record
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[deleteSaleAction] DB delete error:', error);
    throw new Error(`Failed to delete sale: ${error.message}`);
  }

  revalidatePath('/sales');
  revalidatePath('/sales/[view]', 'page');
}

/**
 * Server Action: Batch delete sales and clean up attached invoice files
 */
export async function batchDeleteSalesAction(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to delete sales records.');
  }

  // 1. Fetch sales to find attached invoices
  const { data: sales } = await supabase
    .from('sales')
    .select('invoice_url')
    .in('id', ids)
    .eq('user_id', user.id);

  if (sales && sales.length > 0) {
    await cleanupInvoiceFiles(supabase, user.id, sales.map((s) => s.invoice_url));
  }

  // 2. Delete records
  const { error } = await supabase
    .from('sales')
    .delete()
    .in('id', ids)
    .eq('user_id', user.id);

  if (error) {
    console.error('[batchDeleteSalesAction] DB delete error:', error);
    throw new Error(`Failed to delete sales: ${error.message}`);
  }

  revalidatePath('/sales');
  revalidatePath('/sales/[view]', 'page');
}


/**
 * Server Action: Obtain a fresh, secure signed URL for a private invoice file
 */
export async function getInvoiceSignedUrlAction(
  filePathOrUrl: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return '';
  }

  if (!filePathOrUrl || typeof filePathOrUrl !== 'string') {
    return '';
  }

  if (filePathOrUrl.startsWith('blob:')) {
    return filePathOrUrl;
  }

  const path = extractStoragePath(filePathOrUrl, 'invoices');
  if (!path) return '';

  // Enforce tenant boundary: storage path must begin with authenticated user's ID
  if (!path.startsWith(`${user.id}/`) || path.includes('..')) {
    console.warn(`[getInvoiceSignedUrlAction] Unauthorized access attempt for path: ${path}`);
    return '';
  }

  try {
    const validExpiry = Math.min(Math.max(expiresInSeconds, 60), 86400);
    const { data, error } = await supabase.storage
      .from('invoices')
      .createSignedUrl(path, validExpiry);

    if (error || !data?.signedUrl) {
      return '';
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[getInvoiceSignedUrlAction] Error generating signed URL:', err);
    return '';
  }
}

/**
 * Server Action: Remove an invoice file from Supabase Storage bucket 'invoices'
 */
export async function deleteInvoiceFileAction(
  filePathOrUrl?: string | null,
  saleId?: string | null
): Promise<boolean> {
  if (!filePathOrUrl && !saleId) return false;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to manage invoices.');
  }

  try {
    // 1. Remove from storage bucket if file path/URL exists
    if (filePathOrUrl) {
      const path = extractStoragePath(filePathOrUrl, 'invoices');
      if (path) {
        // Enforce user ownership and disallow traversal
        if (!path.startsWith(`${user.id}/`) || path.includes('..')) {
          console.warn(`[deleteInvoiceFileAction] Unauthorized delete path attempt: ${path}`);
          return false;
        }

        const { error } = await supabase.storage
          .from('invoices')
          .remove([path]);

        if (error) {
          console.error('[deleteInvoiceFileAction] Storage removal error:', error);
        }
      }
    }

    // 2. If saleId is provided, clear the invoice columns in the database row
    if (saleId) {
      const { error: dbError } = await supabase
        .from('sales')
        .update({ invoice_url: null, invoice_name: null })
        .eq('id', saleId)
        .eq('user_id', user.id);

      if (dbError) {
        console.error('[deleteInvoiceFileAction] DB invoice reset error:', dbError);
      }
      revalidatePath('/sales');
      revalidatePath('/sales/[view]', 'page');
    }

    return true;
  } catch (err) {
    console.error('[deleteInvoiceFileAction] Unexpected error removing invoice:', err);
    return false;
  }
}

/**
 * Server Action: Batch remove multiple invoice files from Supabase Storage bucket 'invoices'
 */
export async function deleteInvoiceFilesAction(
  filePathsOrUrls: (string | undefined | null)[]
): Promise<boolean> {
  if (!filePathsOrUrls || filePathsOrUrls.length === 0) return false;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to manage invoices.');
  }

  const paths = filePathsOrUrls
    .map((p) => extractStoragePath(p, 'invoices'))
    .filter((p): p is string => Boolean(p && p.startsWith(`${user.id}/`) && !p.includes('..')));

  if (paths.length === 0) return false;

  try {
    const { error } = await supabase.storage
      .from('invoices')
      .remove(paths);

    if (error) {
      console.error('[deleteInvoiceFilesAction] Batch removal error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[deleteInvoiceFilesAction] Unexpected error batch removing invoices:', err);
    return false;
  }
}
