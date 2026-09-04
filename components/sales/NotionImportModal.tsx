"use client";

import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FC, DragEvent, ChangeEvent } from 'react';
import {
  X,
  Upload,
  FileArchive,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  MapPin,
  Tag,
  Search,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock,
  Layers,
  ChevronRight,
  Info,
  DollarSign,
} from 'lucide-react';
import type { SaleItem } from '@/types/sales';
import { TagPill } from './TagPill';
import { formatDateDisplay } from '@/lib/sales/dateUtils';
import {
  parseNotionFile,
  executeNotionImport,
  type ParsedNotionItem,
  type ImportOptions,
  type ImportProgress,
  type ImportResult,
} from '@/services/sales/notionImportService';
import type JSZip from 'jszip';
import { useBodyScrollLock } from '@/lib/sales/useBodyScrollLock';

interface NotionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onImportComplete: (newSales: SaleItem[]) => void;
}

type ModalStep = 'upload' | 'preview' | 'importing' | 'success';

interface NotionImportModalContentProps {
  onClose: () => void;
  userId?: string;
  onImportComplete: (newSales: SaleItem[]) => void;
}

const NotionImportModalContent: FC<NotionImportModalContentProps> = ({
  onClose,
  userId,
  onImportComplete,
}) => {
  const [step, setStep] = useState<ModalStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed data state
  const [loadedFileName, setLoadedFileName] = useState<string>('');
  const [isZipFile, setIsZipFile] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedNotionItem[]>([]);
  const [zipFilesMap, setZipFilesMap] = useState<Map<string, JSZip.JSZipObject> | undefined>(undefined);
  const [totalInvoicesInZip, setTotalInvoicesInZip] = useState(0);

  // Preview filtering & searching
  const [previewSearch, setPreviewSearch] = useState('');

  // Import options
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    uploadInvoices: true,
    autoGeocode: true,
    autoAddOptions: true,
  });

  // Progress state
  const [progress, setProgress] = useState<ImportProgress>({
    step: 'parsing',
    current: 0,
    total: 0,
    message: '',
    percent: 0,
  });

  // Final result state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const helpPopoverRef = useRef<HTMLDivElement>(null);

  const [helpCoords, setHelpCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    placement?: 'top' | 'bottom';
    isMobile?: boolean;
  } | null>(null);

  const computeHelpPosition = useCallback(() => {
    if (!helpButtonRef.current || typeof window === 'undefined') return;
    if (window.innerWidth < 640) {
      setHelpCoords({ isMobile: true });
      return;
    }
    const rect = helpButtonRef.current.getBoundingClientRect();
    const popoverWidth = 384;
    const popoverHeight = 220;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement: 'bottom' | 'top' = 'bottom';
    if (spaceBelow < Math.min(popoverHeight, 200) && (spaceAbove > spaceBelow || spaceAbove > 180)) {
      placement = 'top';
    }

    let left = rect.left;
    if (left + popoverWidth > viewportWidth - 16) {
      left = viewportWidth - popoverWidth - 16;
    }
    left = Math.max(16, left);

    if (placement === 'top') {
      setHelpCoords({
        bottom: viewportHeight - rect.top + 6,
        left,
        placement: 'top',
        isMobile: false,
      });
    } else {
      setHelpCoords({
        top: rect.bottom + 6,
        left,
        placement: 'bottom',
        isMobile: false,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isHelpOpen) {
      computeHelpPosition();
    }
  }, [isHelpOpen, computeHelpPosition]);

  useEffect(() => {
    if (!isHelpOpen) return;
    const handleResize = () => computeHelpPosition();
    const handleScroll = () => computeHelpPosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isHelpOpen, computeHelpPosition]);

  // Click outside listener for help popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        helpPopoverRef.current &&
        !helpPopoverRef.current.contains(target) &&
        helpButtonRef.current &&
        !helpButtonRef.current.contains(target)
      ) {
        setIsHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'importing') {
        if (isHelpOpen) {
          setIsHelpOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, isHelpOpen, onClose]);

  // Computed summary metrics for preview
  const summaryMetrics = useMemo(() => {
    const totalItems = parsedItems.length;
    const totalRevenue = parsedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalProfit = parsedItems.reduce((sum, item) => sum + (item.sales || 0), 0);
    const itemsWithLocation = parsedItems.filter((i) => i.location).length;

    let minDate = '';
    let maxDate = '';
    const validDates = parsedItems.map((i) => i.date).filter(Boolean).sort();
    if (validDates.length > 0) {
      minDate = validDates[0];
      maxDate = validDates[validDates.length - 1];
    }

    return {
      totalItems,
      totalRevenue,
      totalProfit,
      totalInvoices: totalInvoicesInZip,
      itemsWithLocation,
      minDate,
      maxDate,
    };
  }, [parsedItems, totalInvoicesInZip]);

  // Filtered preview items for table
  const filteredPreviewItems = useMemo(() => {
    if (!previewSearch.trim()) return parsedItems;
    const q = previewSearch.toLowerCase().trim();
    return parsedItems.filter(
      (item) =>
        item.item.toLowerCase().includes(q) ||
        item.customer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.marketplace.toLowerCase().includes(q) ||
        item.payment_method.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.invoice_raw && item.invoice_raw.toLowerCase().includes(q))
    );
  }, [parsedItems, previewSearch]);

  // Process a selected File (.zip or .csv)
  const handleProcessFile = async (file: File) => {
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.zip') && !nameLower.endsWith('.csv')) {
      setErrorMessage('Please select a valid Notion export ZIP archive (.zip) or CSV file (.csv).');
      return;
    }

    setFileLoading(true);
    setErrorMessage(null);

    try {
      const result = await parseNotionFile(file);
      if (!result.items || result.items.length === 0) {
        throw new Error('No valid sales records found in the uploaded file.');
      }

      setLoadedFileName(result.fileName);
      setIsZipFile(result.isZip);
      setParsedItems(result.items);
      setZipFilesMap(result.zipFiles);
      setTotalInvoicesInZip(result.totalInvoicesFound);
      setStep('preview');
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to parse the file. Please verify it is an exported Notion database.';
      setErrorMessage(msg);
    } finally {
      setFileLoading(false);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // Execute Import
  const handleStartImport = async () => {
    if (!userId) {
      setErrorMessage('You must be logged in to import data to your account.');
      return;
    }

    setStep('importing');
    setErrorMessage(null);

    try {
      const result = await executeNotionImport({
        items: parsedItems,
        zipFiles: zipFilesMap,
        userId,
        options: importOptions,
        onProgress: (prog) => {
          setProgress(prog);
        },
      });

      setImportResult(result);
      setStep('success');

      if (result.createdSales && result.createdSales.length > 0) {
        onImportComplete(result.createdSales);
      }
    } catch (err: unknown) {
      console.error('Import execution failed:', err);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during import.';
      setErrorMessage(msg);
      setStep('preview');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 overscroll-none"
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div
        className="bg-white dark:bg-[#202020] w-full max-w-4xl max-h-[76dvh] sm:max-h-[88vh] flex flex-col rounded-xl sm:rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 overflow-hidden transition-all overscroll-contain my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-[#1a1a1a]/50">
          <div className="flex items-center gap-1.5 leading-none">
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 leading-none">
              Import from Notion
            </h2>
            <div className="flex items-center">
              <button
                ref={helpButtonRef}
                type="button"
                onClick={() => setIsHelpOpen(!isHelpOpen)}
                className="flex items-center justify-center p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="How to export from Notion"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={step === 'importing'}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Portal-rendered Notion Export Info Popover */}
        {typeof document !== 'undefined' &&
          isHelpOpen &&
          helpCoords &&
          createPortal(
            helpCoords.isMobile ? (
              <>
                {/* Mobile Backdrop Scrim */}
                <div
                  className="fixed inset-0 bg-black/60 z-[70] overscroll-none touch-none animate-in fade-in duration-150"
                  onClick={() => setIsHelpOpen(false)}
                />

                <div
                  ref={helpPopoverRef}
                  onClick={(e) => e.stopPropagation()}
                  className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[71] max-w-sm mx-auto bg-white dark:bg-[#222222] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-4 space-y-3 text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5 shrink-0">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                      How to export from Notion
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsHelpOpen(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed space-y-2">
                    <p>
                      Open your database page in Notion, click the{' '}
                      <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-semibold border border-neutral-200 dark:border-neutral-700">•••</span>{' '}
                      menu in the top right &rarr; <span className="font-medium text-neutral-800 dark:text-neutral-200">Export</span>.
                    </p>
                    <p>
                      Select <span className="font-semibold text-neutral-900 dark:text-neutral-100">Markdown &amp; CSV</span> with subpages &rarr; click <strong>Export</strong> to download your ZIP file.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div
                ref={helpPopoverRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  zIndex: 70,
                  ...(helpCoords.placement === 'top'
                    ? { bottom: `${helpCoords.bottom}px` }
                    : { top: `${helpCoords.top}px` }),
                  left: `${helpCoords.left}px`,
                }}
                className="w-96 max-w-[calc(100vw-32px)] bg-white dark:bg-[#222222] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-4 space-y-2.5 text-xs animate-in fade-in-50 zoom-in-95 duration-100 select-none"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2 shrink-0">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                    How to export from Notion
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsHelpOpen(false)}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed space-y-2">
                  <p>
                    Open your database page in Notion, click the{' '}
                    <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-semibold border border-neutral-200 dark:border-neutral-700">•••</span>{' '}
                    menu in the top right &rarr; <span className="font-medium text-neutral-800 dark:text-neutral-200">Export</span>.
                  </p>
                  <p>
                    Select <span className="font-semibold text-neutral-900 dark:text-neutral-100">Markdown &amp; CSV</span> with subpages &rarr; click <strong>Export</strong> to download your ZIP file.
                  </p>
                </div>
              </div>
            ),
            document.body
          )}

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1 font-medium">{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {/* STEP 1: Upload / Drop Zone */}
          {step === 'upload' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Drop Target Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl sm:rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.008]'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500/80 bg-neutral-50/40 dark:bg-[#1b1b1b]/40 hover:bg-blue-50/20 dark:hover:bg-[#222222]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {fileLoading ? (
                  <div className="flex flex-col items-center space-y-3 py-4">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      Reading & parsing Notion export files...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#252525] border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                      <FileArchive className="w-7 h-7" />
                    </div>

                    <h3 className="text-sm md:text-base font-semibold text-neutral-800 dark:text-neutral-100">
                      Drop your Notion export <span className="text-blue-600 dark:text-blue-400">.zip</span> or{' '}
                      <span className="text-blue-600 dark:text-blue-400">.csv</span> here
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
                      Supports full Notion database ZIP exports with invoices or direct CSV spreadsheets.
                    </p>

                    <div className="mt-5 flex items-center gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Browse Files</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Supported Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#1b1b1b] border border-neutral-200/70 dark:border-neutral-800 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Save Invoices
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      Automatically uploads attached PDF/image invoices to storage.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#1b1b1b] border border-neutral-200/70 dark:border-neutral-800 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Location Mapping
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      Converts buyer addresses to GPS coordinates for Interactive Map view.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#1b1b1b] border border-neutral-200/70 dark:border-neutral-800 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Tag Management
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      Auto create new tags such as Category or Store with colors.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Configuration */}
          {step === 'preview' && (
            <div className="space-y-5">
              {/* File Info & Metrics Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-neutral-50 dark:bg-[#1a1a1a] rounded-xl border border-neutral-200/80 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    {isZipFile ? <FileArchive className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 max-w-[280px] sm:max-w-md truncate">
                      {loadedFileName}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {isZipFile ? 'ZIP Archive' : 'CSV Spreadsheet'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-2.5 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 bg-white dark:bg-[#252525] border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Choose Another</span>
                </button>
              </div>

              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-[0.7fr_0.7fr_1.3fr_1.3fr] gap-2.5">
                <div className="p-3 bg-neutral-50/80 dark:bg-[#1a1a1a]/80 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 min-w-0">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Orders</span>
                  </div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {summaryMetrics.totalItems}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50/80 dark:bg-[#1a1a1a]/80 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 min-w-0">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Invoices</span>
                  </div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {summaryMetrics.totalInvoices}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50/80 dark:bg-[#1a1a1a]/80 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 min-w-0">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Subtotal</span>
                  </div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1 truncate" title={`RM ${summaryMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                    RM {summaryMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50/80 dark:bg-[#1a1a1a]/80 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 min-w-0">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Date Range</span>
                  </div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1 whitespace-nowrap" title={`${formatDateDisplay(summaryMetrics.minDate)} – ${formatDateDisplay(summaryMetrics.maxDate)}`}>
                    {summaryMetrics.minDate && summaryMetrics.maxDate
                      ? `${formatDateDisplay(summaryMetrics.minDate)} ~ ${formatDateDisplay(summaryMetrics.maxDate)}`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Import Options Checkboxes */}
              <div className="p-3.5 bg-neutral-50/60 dark:bg-[#181818]/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 space-y-2.5">
                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Options
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={importOptions.uploadInvoices}
                      onChange={(e) =>
                        setImportOptions((prev) => ({ ...prev, uploadInvoices: e.target.checked }))
                      }
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Upload attached invoices ({summaryMetrics.totalInvoices})</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={importOptions.autoGeocode}
                      onChange={(e) =>
                        setImportOptions((prev) => ({ ...prev, autoGeocode: e.target.checked }))
                      }
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Auto-geocode locations ({summaryMetrics.itemsWithLocation})</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={importOptions.autoAddOptions}
                      onChange={(e) =>
                        setImportOptions((prev) => ({ ...prev, autoAddOptions: e.target.checked }))
                      }
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Auto-add new categories & tags</span>
                  </label>
                </div>
              </div>

              {/* Search & Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <span>Preview</span>
                    <span className="text-[11px] font-normal text-neutral-500">
                      ({Math.min(filteredPreviewItems.length, 50)} of {parsedItems.length})
                    </span>
                  </div>

                  <div className="relative w-48 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-neutral-100/70 dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                    />
                  </div>
                </div>

                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-x-auto overflow-y-auto max-h-64 scrollbar-thin">
                  <table className="min-w-[1100px] w-full text-left text-xs border-collapse">
                    <thead className="bg-neutral-100/90 dark:bg-[#161616] text-neutral-600 dark:text-neutral-400 sticky top-0 z-10 text-[11px] font-semibold border-b border-neutral-200 dark:border-neutral-800 backdrop-blur-xs">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[200px]">Order</th>
                        <th className="py-2.5 px-2.5 min-w-[120px]">Category</th>
                        <th className="py-2.5 px-2.5 min-w-[100px]">Store</th>
                        <th className="py-2.5 px-2.5 min-w-[130px]">Payment Method</th>
                        <th className="py-2.5 px-2.5 min-w-[110px]">Customer</th>
                        <th className="py-2.5 px-2.5 min-w-[95px]">Date</th>
                        <th className="py-2.5 px-2.5 text-right min-w-[85px]">Subtotal</th>
                        <th className="py-2.5 px-2.5 text-right min-w-[80px]">Cost</th>
                        <th className="py-2.5 px-2.5 text-right min-w-[85px]">Sales</th>
                        <th className="py-2.5 px-2.5 min-w-[100px]">Order Status</th>
                        <th className="py-2.5 px-2.5 min-w-[100px]">Payment Status</th>
                        <th className="py-2.5 px-2.5 min-w-[110px]">Invoice</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                      {filteredPreviewItems.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
                            No matching items found for &ldquo;{previewSearch}&rdquo;
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewItems.slice(0, 50).map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-neutral-50/80 dark:hover:bg-[#252525]/60 transition-colors"
                          >
                            <td className="py-2 px-3 font-medium text-neutral-900 dark:text-neutral-100 max-w-[220px] truncate" title={item.item}>
                              <span className="text-neutral-700 dark:text-neutral-300 mr-1.5 font-mono font-medium">{item.quantity}x</span>
                              {item.item}
                            </td>
                            <td className="py-2 px-2.5">
                              <TagPill text={item.category} type="category" />
                            </td>
                            <td className="py-2 px-2.5">
                              <TagPill text={item.marketplace} type="marketplace" />
                            </td>
                            <td className="py-2 px-2.5">
                              <TagPill text={item.payment_method} type="payment_method" />
                            </td>
                            <td className="py-2 px-2.5 text-neutral-600 dark:text-neutral-400 max-w-[120px] truncate" title={item.customer}>
                              {item.customer}
                            </td>
                            <td className="py-2 px-2.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                              {formatDateDisplay(item.date)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-neutral-800 dark:text-neutral-200 whitespace-nowrap font-medium">
                              RM {item.subtotal.toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-neutral-500 whitespace-nowrap">
                              RM {item.cost.toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-medium">
                              RM {item.sales.toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5">
                              <TagPill text={item.order_status} type="order_status" />
                            </td>
                            <td className="py-2 px-2.5">
                              <TagPill text={item.payment_status} type="payment_status" />
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              {item.invoice_file_exists ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-900/40" title={item.invoice_raw}>
                                  <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                                  <span>Attached</span>
                                </span>
                              ) : item.invoice_raw ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded max-w-[110px] truncate" title={item.invoice_raw}>
                                  <Paperclip className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{item.invoice_raw}</span>
                                </span>
                              ) : (
                                <span className="text-neutral-400 text-[11px]">&mdash;</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400 max-w-[200px] truncate text-[11px]" title={item.location || ''}>
                              {item.location || <span className="text-neutral-400">&mdash;</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {filteredPreviewItems.length > 50 && (
                    <div className="py-2 text-center text-xs text-neutral-400 bg-neutral-50 dark:bg-[#181818] border-t border-neutral-100 dark:border-neutral-800">
                      Showing first 50 rows of {filteredPreviewItems.length} items
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Importing Progress View */}
          {step === 'importing' && (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-lg">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Importing Notion Data...
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 min-h-[18px]">
                  {progress.message || 'Processing records...'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full space-y-1.5">
                <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60">
                  <div
                    className="h-full bg-linear-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span>{progress.percent}% complete</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
              </div>

              {/* Step checklist */}
              <div className="w-full bg-neutral-50 dark:bg-[#181818] p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 text-left text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Parsed {parsedItems.length} records from Notion export</span>
                </div>
                <div className={`flex items-center gap-2 ${
                  progress.step === 'uploading_invoices'
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : progress.percent > 50
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-neutral-400'
                }`}>
                  {progress.percent > 50 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : progress.step === 'uploading_invoices' ? (
                    <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-600" />
                  )}
                  <span>Uploading invoices to Supabase Storage</span>
                </div>
                <div className={`flex items-center gap-2 ${
                  progress.step === 'geocoding'
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : progress.percent > 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-neutral-400'
                }`}>
                  {progress.percent > 80 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : progress.step === 'geocoding' ? (
                    <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-600" />
                  )}
                  <span>Geocoding location addresses</span>
                </div>
                <div className={`flex items-center gap-2 ${
                  progress.step === 'saving'
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : progress.percent === 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-neutral-400'
                }`}>
                  {progress.percent === 100 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : progress.step === 'saving' ? (
                    <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-600" />
                  )}
                  <span>Saving sales records to database</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Success View */}
          {step === 'success' && importResult && (
            <div className="py-6 px-4 flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Import Completed!
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Successfully imported {importResult.totalImported} items into your sales dashboard.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                <div className="p-3 bg-neutral-50 dark:bg-[#1b1b1b] rounded-xl border border-neutral-200/70 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                    Sales Imported
                  </div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {importResult.totalImported}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-[#1b1b1b] rounded-xl border border-neutral-200/70 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                    Invoices Saved
                  </div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {importResult.totalInvoicesUploaded}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-[#1b1b1b] rounded-xl border border-neutral-200/70 dark:border-neutral-800 col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                    Locations Mapped
                  </div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {importResult.totalLocationsGeocoded}
                  </div>
                </div>
              </div>

              {/* Warnings / Minor Errors if any */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="w-full p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 rounded-xl text-left text-xs text-amber-800 dark:text-amber-300">
                  <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{importResult.errors.length} minor warnings during import:</span>
                  </div>
                  <div className="max-h-20 overflow-y-auto space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400/90 font-mono">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx}>&bull; {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions (shown on preview, importing, and success steps) */}
        {step !== 'upload' && (
          <div className="px-6 py-3.5 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-[#1a1a1a]/50 flex items-center justify-between gap-3">
            {step === 'preview' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartImport}
                    className="px-4 py-1.5 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Import {parsedItems.length} Orders</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {step === 'importing' && (
              <div className="w-full flex justify-end">
                <span className="text-xs text-neutral-400 italic">Please do not close this window...</span>
              </div>
            )}

            {step === 'success' && (
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>View Dashboard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const NotionImportModal: FC<NotionImportModalProps> = ({
  isOpen,
  onClose,
  userId,
  onImportComplete,
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <NotionImportModalContent
      onClose={onClose}
      userId={userId}
      onImportComplete={onImportComplete}
    />
  );
};
