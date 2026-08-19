import { createClient } from '@/utils/supabase/client';
import {
  fetchSalesAction,
  createSaleAction,
  updateSaleAction,
  deleteSaleAction,
  batchDeleteSalesAction,
  createSalesBatchAction,
  getInvoiceSignedUrlAction,
  deleteInvoiceFileAction,
  deleteInvoiceFilesAction,
} from './salesActions';
import { extractStoragePath, mapRowToSaleItem } from '@/lib/sales/saleMappers';

// Re-export Server Actions & helpers
export {
  fetchSalesAction,
  createSaleAction,
  updateSaleAction,
  deleteSaleAction,
  batchDeleteSalesAction,
  createSalesBatchAction,
  getInvoiceSignedUrlAction,
  deleteInvoiceFileAction,
  deleteInvoiceFilesAction,
  extractStoragePath,
  mapRowToSaleItem,
};

/**
 * Upload an invoice file directly to Supabase Storage private bucket 'invoices' from browser
 * Path structure: <userId>/<timestamp>_<filename>
 */
export async function uploadInvoiceFile(
  file: File,
  userId: string
): Promise<{ url: string; name: string; path: string }> {
  const supabase = createClient();
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }
  if (!userId) {
    throw new Error('User authentication is required to upload invoices.');
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${Date.now()}_${cleanFileName}`;

  const { data, error } = await supabase.storage
    .from('invoices')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading invoice to Supabase Storage:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Generate a secure signed URL for private bucket
  const { data: signedData } = await supabase.storage
    .from('invoices')
    .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7-day initial signed URL

  return {
    url: signedData?.signedUrl || data.path,
    name: file.name,
    path: data.path,
  };
}
