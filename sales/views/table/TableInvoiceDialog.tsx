"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChangeEvent, FC } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import type { SaleItem } from '@/sales/types';

interface TableInvoiceDialogProps {
  sale: SaleItem;
  isUploading: boolean;
  onUploadFile: (file: File) => Promise<void>;
  onViewInvoice: () => void;
  onRemoveInvoice: () => Promise<boolean>;
  onClose: () => void;
}

interface PopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: 'bottom' | 'top';
}

export const TableInvoiceDialog: FC<TableInvoiceDialogProps> = ({
  sale,
  isUploading,
  onUploadFile,
  onViewInvoice,
  onRemoveInvoice,
  onClose,
}) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const computePosition = useCallback(() => {
    const anchor = anchorRef.current?.parentElement || anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gutter = Math.min(12, viewportWidth / 2);
    const maxWidth = Math.max(0, viewportWidth - gutter * 2);
    const popoverWidth = Math.min(dialogRef.current?.offsetWidth || 290, maxWidth);
    const popoverHeight = dialogRef.current?.offsetHeight || 180;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placement: PopoverPosition['placement'] =
      spaceBelow < Math.min(popoverHeight, 220) && (spaceAbove > spaceBelow || spaceAbove > 180)
        ? 'top'
        : 'bottom';

    const left = Math.max(gutter, Math.min(rect.left, viewportWidth - popoverWidth - gutter));
    setPosition(
      placement === 'top'
        ? { bottom: viewportHeight - rect.top + 4, left, width: popoverWidth, placement }
        : { top: rect.bottom + 4, left, width: popoverWidth, placement }
    );
  }, []);

  useLayoutEffect(() => {
    computePosition();
  }, [computePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const anchor = anchorRef.current?.parentElement;
      if (dialogRef.current?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', computePosition, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [computePosition, onClose]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    void onUploadFile(file).finally(() => {
      input.value = '';
    });
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemoveInvoice();
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <span ref={anchorRef} className="contents pointer-events-none" />
      {position && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-label="Manage invoice"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'fixed',
              ...(position.placement === 'top'
                ? { bottom: `${position.bottom}px` }
                : { top: `${position.top}px` }),
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxWidth: `${position.width}px`,
              boxSizing: 'border-box',
              zIndex: 99999,
            }}
            className="min-w-0 pointer-events-auto overflow-hidden p-3 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl space-y-2 animate-in fade-in-50 zoom-in-95 duration-100 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Invoice</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                aria-label="Close invoice dialog"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {sale.invoice_name || sale.invoice_url ? (
              <div className="flex h-8 items-center gap-2 px-2.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewInvoice();
                  }}
                  disabled={!sale.invoice_url}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:cursor-default disabled:hover:text-neutral-600 dark:disabled:hover:text-neutral-400 cursor-pointer"
                  title={sale.invoice_url ? 'View invoice' : undefined}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  <span className="truncate">
                    {sale.invoice_name || 'receipt.pdf'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  disabled={isRemoving}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 cursor-pointer shrink-0"
                  title="Remove invoice"
                  aria-label="Remove invoice"
                >
                  {isRemoving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf"
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full inline-flex h-8 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-60 cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
