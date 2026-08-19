import type { SaleItem } from '@/types/sales';
import { normalizeCoordinates } from '@/lib/sales/locationParser';

/**
 * Helper to reliably parse the Supabase Storage object path from any format:
 * - Direct object path: `<userId>/<timestamp>_<filename>`
 * - Bucket-prefixed path: `invoices/<userId>/<timestamp>_<filename>`
 * - Full signed URL: `https://.../storage/v1/object/sign/invoices/<userId>/<timestamp>_<filename>?token=...`
 * - Public/authenticated URL: `https://.../storage/v1/object/public/invoices/...`
 */
export function extractStoragePath(filePathOrUrl?: string | null, bucket = 'invoices'): string | null {
  if (!filePathOrUrl || filePathOrUrl.startsWith('data:') || filePathOrUrl.startsWith('blob:')) {
    return null;
  }

  let path = filePathOrUrl.trim().split('?')[0].split('#')[0];

  const bucketMarker = `/${bucket}/`;
  if (path.includes(bucketMarker)) {
    path = path.substring(path.indexOf(bucketMarker) + bucketMarker.length);
  } else if (path.startsWith(`${bucket}/`)) {
    path = path.substring(bucket.length + 1);
  } else if (path.startsWith(`/${bucket}/`)) {
    path = path.substring(bucket.length + 2);
  }

  path = path.replace(/^\/+/, '');

  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep path as is
  }

  return path || null;
}

/**
 * Maps a Supabase DB row to the frontend SaleItem model
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRowToSaleItem(row: any): SaleItem {
  const subtotal = Number(row.subtotal) || 0;
  const cost = Number(row.cost) || 0;
  const sales = !isNaN(Number(row.sales)) ? Number(row.sales) : Number((subtotal - cost).toFixed(2));

  const rawLat = row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : undefined;
  const rawLng = row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : undefined;
  const norm = normalizeCoordinates(rawLat, rawLng);

  return {
    id: row.id,
    user_id: row.user_id,
    quantity: Number(row.quantity) || 1,
    item: row.item,
    category: row.category,
    marketplace: row.marketplace,
    payment_method: row.payment_method,
    customer: row.customer,
    date: row.date,
    subtotal,
    cost,
    sales,
    order_status: row.order_status,
    payment_status: row.payment_status,
    invoice_url: row.invoice_url || undefined,
    invoice_name: row.invoice_name || undefined,
    location: row.location || undefined,
    latitude: norm ? norm.lat : undefined,
    longitude: norm ? norm.lng : undefined,
    notes: row.notes || undefined,
    created_at: row.created_at,
  };
}
