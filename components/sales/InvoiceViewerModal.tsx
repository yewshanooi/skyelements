"use client";

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { X, FileText, Printer, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import type { SaleItem } from '@/types/sales';
import { getInvoiceSignedUrlAction } from '@/services/sales/salesActions';
import { useBodyScrollLock } from '@/lib/sales/useBodyScrollLock';

interface InvoiceViewerModalProps {
  sale: SaleItem | null;
  onClose: () => void;
}

const escapeHtml = (str?: string | number | null) => {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Print an image document directly via an isolated hidden iframe
 */
const printImageDocument = (url: string, title: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.title = 'Print Frame';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title) || 'Document'}</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            width: 100%;
            height: 100%;
          }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10mm;
          }
          img {
            max-width: 100%;
            max-height: 96vh;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
            margin: 0 auto;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <img id="print-target-image" src="${escapeHtml(url)}" alt="Document" />
      </body>
    </html>
  `);
  doc.close();

  const imgEl = doc.getElementById('print-target-image') as HTMLImageElement | null;
  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Error printing image via iframe:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  };

  if (imgEl) {
    if (imgEl.complete) {
      setTimeout(triggerPrint, 150);
    } else {
      imgEl.onload = () => setTimeout(triggerPrint, 150);
      imgEl.onerror = () => triggerPrint();
    }
  } else {
    triggerPrint();
  }
};

/**
 * Print a PDF document
 */
const printPdfDocument = (url: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.src = url;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Cross-origin PDF print restricted, opening in new tab:', err);
      window.open(url, '_blank');
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  };
};

/**
 * Print digital receipt formatted cleanly on standard paper
 */
const printDigitalReceiptDocument = (sale: SaleItem) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.title = 'Print Receipt';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const safeMarketplace = escapeHtml(sale.marketplace);
  const safeId = escapeHtml(sale.id.slice(0, 8));
  const safePaymentStatus = escapeHtml(sale.payment_status);
  const safeDate = escapeHtml(sale.date);
  const safeCustomer = escapeHtml(sale.customer);
  const safeLocation = sale.location ? escapeHtml(sale.location) : '';
  const safePaymentMethod = escapeHtml(sale.payment_method);
  const safeOrderStatus = escapeHtml(sale.order_status);
  const safeItem = escapeHtml(sale.item);
  const safeCategory = escapeHtml(sale.category);
  const safeQty = escapeHtml(sale.quantity);
  const safeSubtotal = Number(sale.subtotal || 0).toFixed(2);
  const safeCost = Number(sale.cost || 0).toFixed(2);
  const safeSales = Number(sale.sales || 0).toFixed(2);
  const safeNotes = sale.notes ? escapeHtml(sale.notes) : '';

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt_${safeId}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: auto;
            margin: 15mm 20mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body {
            font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            color: #111827;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.5;
          }
          .receipt-container {
            max-width: 650px;
            margin: 0 auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f3f4f6;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .subtitle {
            font-size: 11px;
            color: #6b7280;
            margin-top: 4px;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            background-color: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
          }
          .meta-date {
            font-size: 11px;
            color: #6b7280;
            margin-top: 6px;
            text-align: right;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .field-label {
            color: #6b7280;
            font-size: 11px;
            margin-bottom: 2px;
          }
          .field-value {
            font-weight: 600;
            color: #1f2937;
          }
          .field-subvalue {
            color: #4b5563;
            margin-top: 2px;
            font-size: 11px;
          }
          .text-right {
            text-align: right;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
          }
          th {
            background-color: #f9fafb;
            color: #4b5563;
            font-weight: 600;
            padding: 10px 12px;
            text-align: left;
            border-top: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
            color: #1f2937;
          }
          .text-center {
            text-align: center;
          }
          .font-mono {
            font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .totals {
            margin-top: 12px;
            padding-top: 12px;
            font-size: 12px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            color: #4b5563;
          }
          .totals-final {
            display: flex;
            justify-content: space-between;
            padding-top: 8px;
            margin-top: 8px;
            border-top: 2px solid #e5e7eb;
            font-size: 14px;
            font-weight: 700;
            color: #111827;
          }
          .net-amount {
            color: #059669;
          }
          .notes {
            margin-top: 20px;
            padding: 12px;
            background-color: #fffbeb;
            border: 1px solid #fef3c7;
            border-radius: 6px;
            font-size: 11px;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div>
              <div class="title">${safeMarketplace} OFFICIAL RECEIPT</div>
              <div class="subtitle">Tax Invoice / Order Statement &bull; Ref: #${safeId}</div>
            </div>
            <div>
              <div class="badge">${safePaymentStatus}</div>
              <div class="meta-date">Date: ${safeDate}</div>
            </div>
          </div>

          <div class="grid">
            <div>
              <div class="field-label">Billed To:</div>
              <div class="field-value">${safeCustomer}</div>
              ${safeLocation ? `<div class="field-subvalue">${safeLocation}</div>` : ''}
            </div>
            <div class="text-right">
              <div class="field-label">Payment Method:</div>
              <div class="field-value">${safePaymentMethod}</div>
              <div class="field-label" style="margin-top: 8px;">Order Status:</div>
              <div class="field-value">${safeOrderStatus}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Order Description</th>
                <th class="text-center">Category</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Price (MYR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: 500;">${safeItem}</td>
                <td class="text-center" style="color: #6b7280;">${safeCategory}</td>
                <td class="text-center font-mono">${safeQty}</td>
                <td class="text-right font-mono" style="font-weight: 600;">RM ${safeSubtotal}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span class="font-mono">RM ${safeSubtotal}</span>
            </div>
            <div class="totals-row">
              <span>Platform / Shipping Cost:</span>
              <span class="font-mono">RM ${safeCost}</span>
            </div>
            <div class="totals-final">
              <span>Net Realized Sales:</span>
              <span class="font-mono net-amount">RM ${safeSales}</span>
            </div>
          </div>

          ${
            safeNotes
              ? `<div class="notes"><strong>Notes:</strong> ${safeNotes}</div>`
              : ''
          }
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Error printing digital receipt via iframe:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  }, 250);
};

const InvoiceViewerModalContent: FC<{ sale: SaleItem; onClose: () => void }> = ({ sale, onClose }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(sale.invoice_url || '');
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(Boolean(sale.invoice_url));

  useEffect(() => {
    let ignore = false;
    if (!sale.invoice_url) {
      return;
    }

    getInvoiceSignedUrlAction(sale.invoice_url, 3600)
      .then((url) => {
        if (!ignore) {
          setResolvedUrl(url);
          setIsLoadingUrl(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setIsLoadingUrl(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [sale.invoice_url]);

  const invoiceName = sale.invoice_name || (sale.invoice_url ? 'Attachment Invoice' : `receipt_${sale.id}.pdf`);
  const isPdf = invoiceName.toLowerCase().endsWith('.pdf') || resolvedUrl.toLowerCase().includes('.pdf');

  const pdfViewerUrl = resolvedUrl
    ? `${resolvedUrl}${resolvedUrl.includes('#') ? '&' : '#'}view=FitH&toolbar=1&navpanes=0`
    : '';

  const handlePrint = () => {
    if (isLoadingUrl) return;

    if (sale.invoice_url) {
      if (isPdf) {
        printPdfDocument(resolvedUrl);
      } else {
        printImageDocument(resolvedUrl, invoiceName);
      }
    } else {
      printDigitalReceiptDocument(sale);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 invoice-modal-overlay overscroll-none"
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div className="bg-white dark:bg-[#202020] rounded-xl sm:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[76dvh] sm:max-h-[88vh] invoice-modal-dialog overscroll-contain my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50 invoice-modal-header no-print">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs sm:text-base truncate">
                {invoiceName}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {resolvedUrl && (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 sm:p-2 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={handlePrint}
              disabled={isLoadingUrl}
              className="p-1.5 sm:p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Preview Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 sm:space-y-6 invoice-printable-content">
          {sale.invoice_url ? (
            <div className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-2 min-h-[220px]">
              {isLoadingUrl ? (
                <div className="flex items-center gap-2 text-xs text-neutral-500 py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Loading...</span>
                </div>
              ) : isPdf ? (
                <iframe
                  src={pdfViewerUrl}
                  className="w-full h-[460px] rounded border-0 bg-white"
                  title="PDF Invoice Preview"
                />
              ) : (
                <img
                  src={resolvedUrl}
                  alt="Invoice receipt preview"
                  className="max-h-[420px] object-contain rounded"
                />
              )}
            </div>
          ) : (
            /* Digital Receipt Template */
            <div className="bg-neutral-50 dark:bg-[#1a1a1a] p-4 sm:p-6 rounded-xl border border-neutral-200/80 dark:border-neutral-800 font-sans space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-3 sm:pb-4 gap-2 sm:gap-4">
                <div>
                  <div className="text-base sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span>🛒</span> {sale.marketplace} OFFICIAL RECEIPT
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 sm:mt-1">
                    Tax Invoice / Order Statement
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {sale.payment_status}
                  </span>
                  <div className="text-xs text-neutral-400 mt-1 sm:mt-1.5">Date: {sale.date}</div>
                </div>
              </div>

              {/* Customer & Order Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-neutral-400 block mb-0.5">Billed To:</span>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200">{sale.customer}</p>
                  {sale.location && (
                    <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      {sale.location}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-neutral-400 block mb-0.5">Payment Method:</span>
                  <p className="font-medium text-neutral-700 dark:text-neutral-300">{sale.payment_method}</p>
                  <span className="text-neutral-400 block mt-2 mb-0.5">Order Status:</span>
                  <p className="font-medium text-neutral-700 dark:text-neutral-300">{sale.order_status}</p>
                </div>
              </div>

              {/* Line items table */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400">
                    <tr>
                      <th className="p-3">Order Description</th>
                      <th className="p-3 text-center">Category</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Price (MYR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    <tr>
                      <td className="p-3 font-medium text-neutral-800 dark:text-neutral-200">
                        {sale.item}
                      </td>
                      <td className="p-3 text-center text-neutral-500">{sale.category}</td>
                      <td className="p-3 text-center font-mono font-medium">{sale.quantity}</td>
                      <td className="p-3 text-right font-mono font-medium">
                        RM {sale.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calculation Summary */}
              <div className="space-y-1.5 pt-2 text-xs">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">RM {sale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Platform / Shipping Cost:</span>
                  <span className="font-mono">RM {sale.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-neutral-900 dark:text-neutral-100 border-t border-neutral-200 dark:border-neutral-800 pt-2">
                  <span>Net Realized Sales:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    RM {sale.sales.toFixed(2)}
                  </span>
                </div>
              </div>

              {sale.notes && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-semibold block mb-0.5">Notes:</span>
                  {sale.notes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3 invoice-modal-footer no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const InvoiceViewerModal: FC<InvoiceViewerModalProps> = ({ sale, onClose }) => {
  useBodyScrollLock(Boolean(sale));

  if (!sale) return null;
  return <InvoiceViewerModalContent key={`${sale.id}-${sale.invoice_url || ''}`} sale={sale} onClose={onClose} />;
};


