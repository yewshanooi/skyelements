'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import type { SaleItem } from '@/types/sales';
import { geocodeAddress } from '@/services/sales/geocodeService';
import { normalizeCoordinates } from '@/lib/sales/locationParser';
import { extractStoragePath, mapRowToSaleItem } from '@/lib/sales/saleMappers';

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
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) {
    console.error('[fetchSalesAction] Error fetching sales:', error);
    return [];
  }

  return (data || []).map(mapRowToSaleItem);
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

  let lat = sale.latitude;
  let lng = sale.longitude;

  // Auto-geocode on server if location is provided and coordinates are missing
  if (sale.location && (!lat || !lng || isNaN(lat) || isNaN(lng))) {
    try {
      const coords = await geocodeAddress(sale.location);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    } catch (err) {
      console.warn('[createSaleAction] Geocoding fallback error:', err);
    }
  }

  if (lat !== undefined && lng !== undefined) {
    const norm = normalizeCoordinates(lat, lng);
    if (norm) {
      lat = norm.lat;
      lng = norm.lng;
    }
  }

  const calculatedSales = Number((sale.subtotal - sale.cost).toFixed(2));

  const { data, error } = await supabase
    .from('sales')
    .insert({
      user_id: user.id,
      quantity: sale.quantity || 1,
      item: sale.item,
      category: sale.category || 'Uncategorized',
      marketplace: sale.marketplace || 'Direct',
      payment_method: sale.payment_method || 'Cash',
      customer: sale.customer || 'Guest',
      date: sale.date,
      subtotal: Number(sale.subtotal) || 0,
      cost: Number(sale.cost) || 0,
      sales: !isNaN(Number(sale.sales)) ? Number(sale.sales) : calculatedSales,
      order_status: sale.order_status || 'Processing',
      payment_status: sale.payment_status || 'Processing',
      invoice_url: sale.invoice_url || null,
      invoice_name: sale.invoice_name || null,
      location: sale.location || null,
      latitude: lat ?? null,
      longitude: lng ?? null,
      notes: sale.notes || null,
    })
    .select()
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

  // If location changed and no coordinates provided, auto-geocode on server
  let lat = updates.latitude;
  let lng = updates.longitude;
  if (updates.location && (lat === undefined || lng === undefined)) {
    try {
      const coords = await geocodeAddress(updates.location);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    } catch (err) {
      console.warn('[updateSaleAction] Geocoding error:', err);
    }
  }

  if (lat !== undefined && lng !== undefined) {
    const norm = normalizeCoordinates(lat, lng);
    if (norm) {
      lat = norm.lat;
      lng = norm.lng;
    }
  }

  const dbPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id' || key === 'sales' || key === 'created_at' || key === 'user_id') continue;
    dbPayload[key] = value === undefined ? null : value;
  }

  if (lat !== undefined) dbPayload.latitude = lat;
  if (lng !== undefined) dbPayload.longitude = lng;

  const { data, error } = await supabase
    .from('sales')
    .update(dbPayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
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
  try {
    const { data: sale } = await supabase
      .from('sales')
      .select('invoice_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (sale?.invoice_url) {
      const path = extractStoragePath(sale.invoice_url, 'invoices');
      if (path) {
        await supabase.storage.from('invoices').remove([path]);
      }
    }
  } catch (err) {
    console.warn('[deleteSaleAction] Could not clean up invoice storage:', err);
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
  try {
    const { data: sales } = await supabase
      .from('sales')
      .select('invoice_url')
      .in('id', ids)
      .eq('user_id', user.id);

    if (sales && sales.length > 0) {
      const paths = sales
        .map((s) => extractStoragePath(s.invoice_url, 'invoices'))
        .filter((p): p is string => Boolean(p));

      if (paths.length > 0) {
        await supabase.storage.from('invoices').remove(paths);
      }
    }
  } catch (err) {
    console.warn('[batchDeleteSalesAction] Could not clean up invoice storage:', err);
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
 * Server Action: Batch insert sales records (e.g. from Notion import)
 */
export async function createSalesBatchAction(
  salesItems: Omit<SaleItem, 'id'>[]
): Promise<SaleItem[]> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to import sales records.');
  }

  if (!salesItems || salesItems.length === 0) {
    return [];
  }

  const rowsToInsert = salesItems.map((sale) => {
    const norm = normalizeCoordinates(sale.latitude, sale.longitude);
    return {
      user_id: user.id,
      quantity: sale.quantity || 1,
      item: sale.item,
      category: sale.category || 'Uncategorized',
      marketplace: sale.marketplace || 'Direct',
      payment_method: sale.payment_method || 'Cash',
      customer: sale.customer || 'Guest',
      date: sale.date,
      subtotal: Number(sale.subtotal) || 0,
      cost: Number(sale.cost) || 0,
      order_status: sale.order_status || 'Processing',
      payment_status: sale.payment_status || 'Processing',
      invoice_url: sale.invoice_url || null,
      invoice_name: sale.invoice_name || null,
      location: sale.location || null,
      latitude: norm ? norm.lat : (sale.latitude ?? null),
      longitude: norm ? norm.lng : (sale.longitude ?? null),
      notes: sale.notes || null,
    };
  });

  const chunkSize = 50;
  const insertedSales: SaleItem[] = [];

  for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
    const chunk = rowsToInsert.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('sales')
      .insert(chunk)
      .select();

    if (error) {
      console.error('[createSalesBatchAction] DB batch insert error:', error);
      throw new Error(`Failed to batch create sales: ${error.message}`);
    }

    if (data) {
      for (const row of data) {
        insertedSales.push(mapRowToSaleItem(row));
      }
    }
  }

  revalidatePath('/sales');
  revalidatePath('/sales/[view]', 'page');
  return insertedSales;
}

/**
 * Server Action: Obtain a fresh, secure signed URL for a private invoice file
 */
export async function getInvoiceSignedUrlAction(
  filePathOrUrl: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!filePathOrUrl || filePathOrUrl.startsWith('data:') || filePathOrUrl.startsWith('blob:')) {
    return filePathOrUrl;
  }

  const path = extractStoragePath(filePathOrUrl, 'invoices');
  if (!path) return filePathOrUrl;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from('invoices')
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return filePathOrUrl;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[getInvoiceSignedUrlAction] Error generating signed URL:', err);
    return filePathOrUrl;
  }
}

/**
 * Server Action: Remove an invoice file from Supabase Storage bucket 'invoices'
 */
export async function deleteInvoiceFileAction(
  filePathOrUrl?: string | null
): Promise<boolean> {
  if (!filePathOrUrl) return false;

  const path = extractStoragePath(filePathOrUrl, 'invoices');
  if (!path) return false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from('invoices')
      .remove([path]);

    if (error) {
      console.error('[deleteInvoiceFileAction] Storage removal error:', error);
      return false;
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

  const paths = filePathsOrUrls
    .map((p) => extractStoragePath(p, 'invoices'))
    .filter((p): p is string => Boolean(p));

  if (paths.length === 0) return false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
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
