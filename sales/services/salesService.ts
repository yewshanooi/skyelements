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
import { extractStoragePath, mapRowToSaleItem, SALES_SELECT_COLUMNS } from '@/sales/lib/saleMappers';

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
  SALES_SELECT_COLUMNS,
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_INVOICE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp']);
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

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
  if (!userId || !UUID_REGEX.test(userId)) {
    throw new Error('A valid user authentication ID is required to upload invoices.');
  }

  if (!file) {
    throw new Error('No file provided for upload.');
  }

  if (file.size > MAX_INVOICE_SIZE) {
    throw new Error('Invoice file exceeds maximum permitted size of 20MB.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File extension .${ext} is not allowed. Only PDF, PNG, JPG, and WebP files are supported.`);
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error(`Invalid file content type (${file.type}). Only PDF and image files are allowed.`);
  }

  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'invoice';
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const cleanFileName = `${sanitizedBase}.${ext}`;
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

  // Return canonical private storage path. Ephemeral signed URLs will be generated on-demand when viewed.
  return {
    url: data.path,
    name: cleanFileName,
    path: data.path,
  };
}
