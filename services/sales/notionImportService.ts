import JSZip from 'jszip';
import type { SaleItem } from '@/types/sales';
import { parseDateString } from '@/lib/sales/dateUtils';
import { extractEmbeddedCoordinates, normalizeCoordinates } from '@/lib/sales/locationParser';
import { geocodeAddress } from '@/services/sales/geocodeService';
import { addOptionsBatch } from '@/services/sales/optionsService';
import { uploadInvoiceFile } from '@/services/sales/salesService';
import { createSalesBatchAction } from '@/services/sales/salesActions';

export interface ParsedNotionItem {
  id: string; // temporary client-side ID for preview
  quantity: number;
  item: string;
  category: string;
  marketplace: string;
  payment_method: string;
  customer: string;
  date: string; // YYYY-MM-DD
  subtotal: number;
  cost: number;
  sales: number;
  order_status: string;
  payment_status: string;
  invoice_raw?: string; // Filename from Notion CSV
  invoice_file_exists: boolean; // Whether corresponding file was found in ZIP
  invoice_matched_file?: string; // Exact path in ZIP
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ImportOptions {
  uploadInvoices: boolean;
  autoGeocode: boolean;
  autoAddOptions: boolean;
}

export interface ImportProgress {
  step: 'parsing' | 'options' | 'uploading_invoices' | 'geocoding' | 'saving' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
  percent: number;
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  totalImported: number;
  totalInvoicesUploaded: number;
  totalLocationsGeocoded: number;
  newCategoriesAdded: string[];
  newMarketplacesAdded: string[];
  newPaymentMethodsAdded: string[];
  createdSales: SaleItem[];
  errors: string[];
}

/**
 * Standard RFC 4180 CSV tokenizer and parser
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

/**
 * Normalizes header string to find matching known column aliases
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Maps CSV column indices to standard Notion sales properties
 */
export function detectNotionColumns(headers: string[]): Record<string, number> {
  const columnMap: Record<string, number> = {};

  const aliases: Record<string, string[]> = {
    quantity: ['quantity', 'qty', 'count', 'amount', 'pcs', 'unit', 'units'],
    item: ['order', 'ordername', 'item', 'itemname', 'name', 'title', 'product', 'productname', 'goods'],
    category: ['category', 'categories', 'type', 'group'],
    marketplace: ['marketplace', 'market', 'store', 'platform', 'channel', 'shop', 'source'],
    payment_method: ['paymentmethod', 'paymenttype', 'payment', 'paymentmode', 'paymethod', 'method'],
    customer: ['customer', 'buyer', 'client', 'customername', 'username', 'user', 'recipient'],
    date: ['date', 'orderdate', 'saledate', 'createddate', 'createdtime', 'transdate', 'purchasedate'],
    subtotal: ['subtotalinmyr', 'subtotalmyr', 'subtotal', 'totalmyr', 'total', 'gross', 'price', 'sellingprice', 'revenue', 'amountmyr'],
    cost: ['costs', 'costinmyr', 'costmyr', 'cost', 'expense', 'expenses', 'cogs', 'modal'],
    sales: ['salesinmyr', 'salesmyr', 'sales', 'profit', 'netprofit', 'netsales', 'net', 'margin', 'untung'],
    order_status: ['orderstatus', 'shippingstatus', 'deliverystatus', 'status', 'fulfillmentstatus'],
    payment_status: ['paymentstatus', 'paidstatus', 'paymentstate', 'paystatus'],
    invoice: ['invoice', 'invoices', 'receipt', 'receipts', 'attachment', 'attachments', 'file', 'files', 'filesmedia', 'doc', 'bill'],
    location: ['location', 'locations', 'address', 'addresses', 'shippingaddress', 'deliveryaddress', 'buyeraddress', 'customeraddress', 'destination', 'place', 'places', 'deliverylocation', 'shippinglocation', 'area', 'city'],
    notes: ['notes', 'note', 'remarks', 'remark', 'description', 'comments', 'comment'],
    latitude: ['latitude', 'lat', 'latdeg', 'latitude_deg', 'y'],
    longitude: ['longitude', 'lng', 'lon', 'long', 'lngdeg', 'longitude_deg', 'x'],
  };

  headers.forEach((header, index) => {
    const norm = normalizeHeader(header);
    for (const [key, aliasList] of Object.entries(aliases)) {
      if (columnMap[key] === undefined && aliasList.includes(norm)) {
        columnMap[key] = index;
        break;
      }
    }
  });

  return columnMap;
}

/**
 * Parses raw cell value as a clean number
 */
function parseNumeric(val?: string, defaultValue = 0): number {
  if (!val) return defaultValue;
  const cleaned = val.replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Extracts invoice file names from Notion export cell
 */
export function extractInvoiceFileNames(rawInvoice?: string): string[] {
  if (!rawInvoice) return [];
  // Notion separates multiple files by comma or semicolon
  return rawInvoice
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Determine MIME type based on file extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Parse CSV text into ParsedNotionItem list
 */
export function parseNotionCsvContent(
  csvText: string,
  zipFilesMap?: Map<string, JSZip.JSZipObject>
): ParsedNotionItem[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new Error('The CSV file does not contain enough data or is empty.');
  }

  const headers = rows[0];
  const colMap = detectNotionColumns(headers);

  // Require at least 'item' or 'customer' or 'date' to be identified
  if (colMap.item === undefined && colMap.customer === undefined && colMap.subtotal === undefined) {
    throw new Error('Could not identify standard Notion database columns (Order, Customer, Subtotal, etc.).');
  }

  const items: ParsedNotionItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const getCell = (key: string): string => {
      const idx = colMap[key];
      return idx !== undefined && idx < row.length ? row[idx].trim() : '';
    };

    const rawItem = getCell('item');
    const rawQuantity = getCell('quantity');
    const rawCategory = getCell('category');
    const rawMarketplace = getCell('marketplace');
    const rawPaymentMethod = getCell('payment_method');
    const rawCustomer = getCell('customer');
    const rawDate = getCell('date');
    const rawSubtotal = getCell('subtotal');
    const rawCost = getCell('cost');
    const rawSales = getCell('sales');
    const rawOrderStatus = getCell('order_status');
    const rawPaymentStatus = getCell('payment_status');
    const rawInvoice = getCell('invoice');
    const rawLocation = getCell('location');
    const rawNotes = getCell('notes');
    const rawLat = getCell('latitude');
    const rawLng = getCell('longitude');

    // Skip completely blank rows
    if (!rawItem && !rawCustomer && !rawSubtotal && !rawDate) continue;

    const quantity = Math.max(1, parseInt(rawQuantity, 10) || 1);
    const subtotal = parseNumeric(rawSubtotal, 0);
    const cost = parseNumeric(rawCost, 0);
    const parsedSales = parseNumeric(rawSales, subtotal - cost);
    const sales = !isNaN(parsedSales) ? Number(parsedSales.toFixed(2)) : Number((subtotal - cost).toFixed(2));

    // Parse date into standard YYYY-MM-DD
    const isoDate = parseDateString(rawDate) || new Date().toISOString().slice(0, 10);

    // Coordinate resolution
    let parsedLat = rawLat ? parseFloat(rawLat) : undefined;
    let parsedLng = rawLng ? parseFloat(rawLng) : undefined;

    if (rawLocation && (parsedLat === undefined || isNaN(parsedLat) || parsedLng === undefined || isNaN(parsedLng))) {
      const embeddedCoords = extractEmbeddedCoordinates(rawLocation);
      if (embeddedCoords) {
        parsedLat = embeddedCoords.lat;
        parsedLng = embeddedCoords.lng;
      }
    }

    const norm = normalizeCoordinates(parsedLat, parsedLng);
    parsedLat = norm ? norm.lat : undefined;
    parsedLng = norm ? norm.lng : undefined;

    // Check attached invoice in ZIP if zipFilesMap is present
    const invoiceFiles = extractInvoiceFileNames(rawInvoice);
    let invoiceFileExists = false;
    let matchedZipPath: string | undefined;

    if (zipFilesMap && invoiceFiles.length > 0) {
      for (const invName of invoiceFiles) {
        const cleanName = invName.toLowerCase();
        const baseName = invName.split('/').pop()?.split('\\').pop()?.toLowerCase() || cleanName;

        // Try exact match or basename match
        if (zipFilesMap.has(cleanName)) {
          invoiceFileExists = true;
          matchedZipPath = cleanName;
          break;
        } else if (zipFilesMap.has(baseName)) {
          invoiceFileExists = true;
          matchedZipPath = baseName;
          break;
        } else {
          // Look for match ignoring path prefixes
          for (const [zipPath] of zipFilesMap) {
            const zipBase = zipPath.split('/').pop()?.split('\\').pop()?.toLowerCase();
            if (zipBase === baseName || decodeURIComponent(zipBase || '') === baseName) {
              invoiceFileExists = true;
              matchedZipPath = zipPath;
              break;
            }
          }
          if (invoiceFileExists) break;
        }
      }
    }

    items.push({
      id: `notion-import-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      quantity,
      item: rawItem || 'Untitled Order',
      category: rawCategory || 'Uncategorized',
      marketplace: rawMarketplace || 'Direct',
      payment_method: rawPaymentMethod || 'Cash',
      customer: rawCustomer || 'Guest',
      date: isoDate,
      subtotal,
      cost,
      sales,
      order_status: rawOrderStatus || 'Delivered',
      payment_status: rawPaymentStatus || 'Paid',
      invoice_raw: rawInvoice || undefined,
      invoice_file_exists: invoiceFileExists,
      invoice_matched_file: matchedZipPath,
      location: rawLocation || undefined,
      latitude: parsedLat,
      longitude: parsedLng,
      notes: rawNotes || undefined,
    });
  }

  return items;
}

/**
 * Inspect and extract contents from a Notion exported ZIP file
 */
export async function parseNotionZip(file: File): Promise<{
  items: ParsedNotionItem[];
  zipFiles: Map<string, JSZip.JSZipObject>;
  csvFileName: string;
  totalInvoicesFound: number;
}> {
  const zip = await JSZip.loadAsync(file);
  const zipFiles = new Map<string, JSZip.JSZipObject>();
  const csvEntries: { name: string; entry: JSZip.JSZipObject }[] = [];

  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      zipFiles.set(relativePath.toLowerCase(), zipEntry);
      const baseName = relativePath.split('/').pop()?.split('\\').pop()?.toLowerCase();
      if (baseName) {
        zipFiles.set(baseName, zipEntry);
      }

      if (relativePath.toLowerCase().endsWith('.csv')) {
        csvEntries.push({ name: relativePath, entry: zipEntry });
      }
    }
  });

  if (csvEntries.length === 0) {
    throw new Error('No CSV file found in the exported ZIP archive. Please ensure you exported the Notion database as CSV/HTML or Markdown & CSV.');
  }

  // If multiple CSVs (e.g. Sales Dashboard ...csv and ..._all.csv), choose the non-_all one or the largest
  let chosenCsv = csvEntries[0];
  const defaultViewCsv = csvEntries.find((c) => !c.name.toLowerCase().includes('_all.csv'));
  if (defaultViewCsv) {
    chosenCsv = defaultViewCsv;
  }

  const csvText = await chosenCsv.entry.async('text');
  const items = parseNotionCsvContent(csvText, zipFiles);

  const totalInvoicesFound = items.filter((item) => item.invoice_file_exists).length;

  return {
    items,
    zipFiles,
    csvFileName: chosenCsv.name,
    totalInvoicesFound,
  };
}

/**
 * Unified file parser handling either .zip or .csv files
 */
export async function parseNotionFile(file: File): Promise<{
  items: ParsedNotionItem[];
  zipFiles?: Map<string, JSZip.JSZipObject>;
  fileName: string;
  isZip: boolean;
  totalInvoicesFound: number;
}> {
  const isZip = file.name.toLowerCase().endsWith('.zip');

  if (isZip) {
    const { items, zipFiles, csvFileName, totalInvoicesFound } = await parseNotionZip(file);
    return {
      items,
      zipFiles,
      fileName: `${file.name} (${csvFileName})`,
      isZip: true,
      totalInvoicesFound,
    };
  }

  // Handle direct .csv file
  const text = await file.text();
  const items = parseNotionCsvContent(text);
  return {
    items,
    fileName: file.name,
    isZip: false,
    totalInvoicesFound: 0,
  };
}

/**
 * Execute full Notion import pipeline:
 * 1. Register new options (categories, stores, payment methods)
 * 2. Upload invoice files to Supabase Storage (if enabled & present)
 * 3. Geocode addresses (if enabled & missing coordinates)
 * 4. Batch insert into Supabase database
 */
export async function executeNotionImport({
  items,
  zipFiles,
  userId,
  options,
  onProgress,
}: {
  items: ParsedNotionItem[];
  zipFiles?: Map<string, JSZip.JSZipObject>;
  userId: string;
  options: ImportOptions;
  onProgress?: (progress: ImportProgress) => void;
}): Promise<ImportResult> {
  const errors: string[] = [];
  const total = items.length;

  if (total === 0) {
    return {
      success: true,
      totalProcessed: 0,
      totalImported: 0,
      totalInvoicesUploaded: 0,
      totalLocationsGeocoded: 0,
      newCategoriesAdded: [],
      newMarketplacesAdded: [],
      newPaymentMethodsAdded: [],
      createdSales: [],
      errors: [],
    };
  }

  // Step 1: Auto-register custom options
  let newCategories: string[] = [];
  let newMarketplaces: string[] = [];
  let newPaymentMethods: string[] = [];

  if (options.autoAddOptions) {
    onProgress?.({
      step: 'options',
      current: 1,
      total: 4,
      message: 'Registering categories, stores, and payment methods...',
      percent: 5,
    });

    const uniqueCategories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
    const uniqueMarketplaces = Array.from(new Set(items.map((i) => i.marketplace).filter(Boolean)));
    const uniquePaymentMethods = Array.from(new Set(items.map((i) => i.payment_method).filter(Boolean)));
    const uniqueOrderStatuses = Array.from(new Set(items.map((i) => i.order_status).filter(Boolean)));
    const uniquePaymentStatuses = Array.from(new Set(items.map((i) => i.payment_status).filter(Boolean)));

    addOptionsBatch('category', uniqueCategories);
    addOptionsBatch('marketplace', uniqueMarketplaces);
    addOptionsBatch('payment_method', uniquePaymentMethods);
    addOptionsBatch('order_status', uniqueOrderStatuses);
    addOptionsBatch('payment_status', uniquePaymentStatuses);

    newCategories = uniqueCategories;
    newMarketplaces = uniqueMarketplaces;
    newPaymentMethods = uniquePaymentMethods;
  }

  // Step 2: Upload Invoices to Supabase Storage
  let totalInvoicesUploaded = 0;
  const preparedSales: Omit<SaleItem, 'id'>[] = items.map((item) => ({
    quantity: item.quantity,
    item: item.item,
    category: item.category,
    marketplace: item.marketplace,
    payment_method: item.payment_method,
    customer: item.customer,
    date: item.date,
    subtotal: item.subtotal,
    cost: item.cost,
    sales: item.sales,
    order_status: item.order_status,
    payment_status: item.payment_status,
    invoice_name: item.invoice_raw,
    location: item.location,
    latitude: item.latitude,
    longitude: item.longitude,
    notes: item.notes,
  }));

  if (options.uploadInvoices && zipFiles) {
    const itemsWithInvoices = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.invoice_file_exists && item.invoice_matched_file);

    const totalInvoices = itemsWithInvoices.length;

    if (totalInvoices > 0) {
      // Concurrency limit of 4 parallel uploads
      const concurrency = 4;
      let uploadedCount = 0;

      for (let i = 0; i < itemsWithInvoices.length; i += concurrency) {
        const batch = itemsWithInvoices.slice(i, i + concurrency);

        await Promise.all(
          batch.map(async ({ item, index }) => {
            try {
              const zipEntry = zipFiles.get(item.invoice_matched_file!);
              if (zipEntry) {
                const blob = await zipEntry.async('blob');
                const cleanFileName = item.invoice_matched_file!.split('/').pop()?.split('\\').pop() || 'invoice.pdf';
                const file = new File([blob], cleanFileName, {
                  type: blob.type || getMimeType(cleanFileName),
                });

                const uploadRes = await uploadInvoiceFile(file, userId);
                preparedSales[index].invoice_url = uploadRes.path; // Store storage path
                preparedSales[index].invoice_name = cleanFileName;
                totalInvoicesUploaded++;
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              console.warn(`Failed to upload invoice for ${item.item}:`, msg);
              errors.push(`Invoice upload for "${item.item}": ${msg}`);
            } finally {
              uploadedCount++;
              const percent = 10 + Math.round((uploadedCount / totalInvoices) * 45);
              onProgress?.({
                step: 'uploading_invoices',
                current: uploadedCount,
                total: totalInvoices,
                message: `Uploading invoice ${uploadedCount} of ${totalInvoices}...`,
                percent,
              });
            }
          })
        );
      }
    }
  }

  // Step 3: Geocode Locations
  let totalLocationsGeocoded = 0;
  if (options.autoGeocode) {
    const itemsToGeocode = preparedSales
      .map((sale, index) => ({ sale, index }))
      .filter(({ sale }) => sale.location && (sale.latitude === undefined || sale.longitude === undefined || isNaN(sale.latitude) || isNaN(sale.longitude)));

    const totalGeocoding = itemsToGeocode.length;

    if (totalGeocoding > 0) {
      let geocodedCount = 0;
      const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

      for (const { sale, index } of itemsToGeocode) {
        if (!sale.location) {
          geocodedCount++;
          continue;
        }

        try {
          const cacheKey = sale.location.trim().toLowerCase();
          let coords: { lat: number; lng: number } | null | undefined = geocodeCache.get(cacheKey);

          if (coords === undefined) {
            coords = await geocodeAddress(sale.location);
            geocodeCache.set(cacheKey, coords);
          }

          if (coords) {
            const norm = normalizeCoordinates(coords.lat, coords.lng);
            preparedSales[index].latitude = norm ? norm.lat : coords.lat;
            preparedSales[index].longitude = norm ? norm.lng : coords.lng;
            totalLocationsGeocoded++;
          }
        } catch (err) {
          console.warn(`Geocoding error for ${sale.location}:`, err);
        } finally {
          geocodedCount++;
          const percent = 55 + Math.round((geocodedCount / totalGeocoding) * 25);
          onProgress?.({
            step: 'geocoding',
            current: geocodedCount,
            total: totalGeocoding,
            message: `Geocoding location ${geocodedCount} of ${totalGeocoding}...`,
            percent,
          });
        }
      }
    }
  }

  // Step 4: Batch Insert into Supabase Database
  onProgress?.({
    step: 'saving',
    current: 0,
    total: preparedSales.length,
    message: `Saving ${preparedSales.length} records to database...`,
    percent: 85,
  });

  let createdSales: SaleItem[];
  try {
    createdSales = await createSalesBatchAction(preparedSales);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error batch inserting sales items:', msg);
    errors.push(`Database save error: ${msg}`);
    throw new Error(`Failed to save imported sales records to database: ${msg}`, { cause: err });
  }

  onProgress?.({
    step: 'complete',
    current: createdSales.length,
    total: createdSales.length,
    message: `Successfully imported ${createdSales.length} items!`,
    percent: 100,
  });

  return {
    success: true,
    totalProcessed: total,
    totalImported: createdSales.length,
    totalInvoicesUploaded,
    totalLocationsGeocoded,
    newCategoriesAdded: newCategories,
    newMarketplacesAdded: newMarketplaces,
    newPaymentMethodsAdded: newPaymentMethods,
    createdSales,
    errors,
  };
}
