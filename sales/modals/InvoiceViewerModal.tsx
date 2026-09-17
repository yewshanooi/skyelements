"use client";

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { X, FileText, Printer, ExternalLink, Loader2 } from 'lucide-react';
import type { SaleItem } from '@/sales/types';
import { getInvoiceSignedUrlAction } from '@/sales/services/salesActions';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

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
 * Validates that a URL strictly uses safe web schemes (https, http, or blob).
 * Prevents javascript: pseudo-protocols and data: HTML injection.
 */
const isSafeUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('blob:')
  );
};

/**
 * Print an image document directly via an isolated hidden iframe
 */
const printImageDocument = (url: string, title: string) => {
  if (!isSafeUrl(url)) {
    console.warn('Blocked printing from unsafe image URL');
    return;
  }
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
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
  doc.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title) || 'Document'}</title><style>@page{size:auto;margin:0;}*,*::before,*::after{box-sizing:border-box;}html,body{margin:0;padding:0;background:#fff;width:100%;height:100%;}body{display:flex;align-items:center;justify-content:center;padding:10mm;}img{max-width:100%;max-height:96vh;object-fit:contain;display:block;margin:0 auto;}</style></head><body><img id="p" src="${escapeHtml(url)}" alt="Document" /></body></html>`);
  doc.close();

  const imgEl = doc.getElementById('p') as HTMLImageElement | null;
  const cleanup = () => {
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  };

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Error printing image via iframe:', e);
      window.print();
    } finally {
      cleanup();
    }
  };

  if (imgEl) {
    if (imgEl.complete) {
      setTimeout(triggerPrint, 100);
    } else {
      imgEl.onload = () => setTimeout(triggerPrint, 100);
      imgEl.onerror = () => triggerPrint();
    }
  } else {
    triggerPrint();
  }
};

export const InvoiceViewerModal: FC<InvoiceViewerModalProps> = ({ sale, onClose }) => {
  useBodyScrollLock(Boolean(sale));

  const invoiceUrl = sale?.invoice_url || '';
  const [resolvedUrl, setResolvedUrl] = useState<string>(invoiceUrl);
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(Boolean(invoiceUrl));

  useEffect(() => {
    if (!invoiceUrl) {
      setResolvedUrl('');
      setIsLoadingUrl(false);
      return;
    }

    let ignore = false;
    setIsLoadingUrl(true);
    getInvoiceSignedUrlAction(invoiceUrl, 3600)
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
  }, [invoiceUrl]);

  if (!sale) return null;

  const invoiceName = sale.invoice_name || (sale.invoice_url ? 'Attachment Invoice' : 'Invoice');
  const isPdf = invoiceName.toLowerCase().endsWith('.pdf') || resolvedUrl.toLowerCase().includes('.pdf');
  const safeResolvedUrl = isSafeUrl(resolvedUrl) ? resolvedUrl : null;
  const pdfViewerUrl = safeResolvedUrl
    ? `${safeResolvedUrl}${safeResolvedUrl.includes('#') ? '&' : '#'}view=FitH&toolbar=1&navpanes=0`
    : '';

  const handlePrint = () => {
    if (isLoadingUrl || isPdf || !safeResolvedUrl) return;
    printImageDocument(safeResolvedUrl, invoiceName);
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
            {safeResolvedUrl && (
              <a
                href={safeResolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {!isPdf && safeResolvedUrl && (
              <button
                onClick={handlePrint}
                disabled={isLoadingUrl}
                className="p-1.5 sm:p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Print Image"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
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
                safeResolvedUrl ? (
                  <iframe
                    src={pdfViewerUrl}
                    className="w-full h-[460px] rounded border-0 bg-white"
                    title="PDF Invoice Preview"
                  />
                ) : (
                  <div className="text-xs text-neutral-500 py-12">Invalid or unsafe PDF URL</div>
                )
              ) : safeResolvedUrl ? (
                <img
                  src={safeResolvedUrl}
                  alt="Invoice receipt preview"
                  className="max-h-[420px] object-contain rounded"
                />
              ) : (
                <div className="text-xs text-neutral-500 py-12">Invalid or unsafe image URL</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500 dark:text-neutral-400">
              <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-2" />
              <p className="text-sm font-medium">No invoice file attached</p>
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


