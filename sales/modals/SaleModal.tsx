"use client";

import { useState, useEffect, useMemo } from 'react';
import type { FC, SyntheticEvent } from 'react';
import {
  X,
  MapPin,
  Calendar,
  ShoppingBag,
  CreditCard,
  User,
  FileText,
  DollarSign,
  Truck,
  Upload,
  Tag,
  Building2,
  Binary,
  Coins,
} from 'lucide-react';
import type { SaleItem } from '@/sales/types';
import { TagPill } from '@/sales/views/table/TagPill';
import { TableOptionPicker } from '@/sales/views/table/TableOptionPicker';
import { TableDatePicker } from '@/sales/views/table/TableDatePicker';
import { TableLocationPicker } from '@/sales/views/table/TableLocationPicker';
import { normalizeCoordinates } from '@/sales/lib/locationParser';
import { formatDateDisplay } from '@/sales/lib/dateUtils';
import { FormulaModal } from '@/sales/modals/FormulaModal';
import { InvoiceViewerModal } from '@/sales/modals/InvoiceViewerModal';
import { TableInvoiceDialog } from '@/sales/views/table/TableInvoiceDialog';
import { evaluateSalesFormula } from '@/sales/lib/formulaEngine';
import { useFormulaSetting } from '@/sales/context/SettingsContext';
import { useAuth } from '@/sales/context/AuthContext';
import { uploadInvoiceFile } from '@/sales/services/salesService';
import { deleteInvoiceFileAction } from '@/sales/services/salesActions';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (saleData: Omit<SaleItem, 'id'> | SaleItem) => Promise<void>;
  initialData?: SaleItem | null;
  defaultStore?: string;
  onOpenFullMap?: (sale: SaleItem) => void;
}

interface SaleFormData {
  quantity: number | string;
  item: string;
  category: string;
  cost: number | string;
  customer: string;
  date: string;
  invoice_name?: string | null;
  invoice_url?: string | null;
  location: string;
  marketplace: string;
  order_status: string;
  payment_method: string;
  payment_status: string;
  sales: number;
  subtotal: number | string;
  latitude?: number;
  longitude?: number;
  notes: string;
}

function parseFormQuantity(val: number | string): number {
  const parsed = parseInt(String(val), 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

function parseFormAmount(val: number | string): number {
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

function toSaleItem(formData: SaleFormData, calculatedSales: number, id: string): SaleItem {
  return {
    ...formData,
    quantity: parseFormQuantity(formData.quantity),
    cost: parseFormAmount(formData.cost),
    subtotal: parseFormAmount(formData.subtotal),
    sales: calculatedSales,
    id,
  } as SaleItem;
}


function getInitialFormData(
  initialData?: SaleItem | null,
  defaultStore?: string
): SaleFormData {
  if (initialData) {
    const coords = normalizeCoordinates(initialData.latitude, initialData.longitude);
    return {
      quantity: initialData.quantity > 0 ? initialData.quantity : '',
      item: initialData.item || '',
      category: initialData.category || '',
      cost:
        initialData.cost !== undefined && initialData.cost !== null
          ? Number(initialData.cost) === 0
            ? ''
            : Number(initialData.cost).toFixed(2)
          : '',
      customer: initialData.customer || '',
      date: initialData.date || '',
      invoice_name: initialData.invoice_name || null,
      invoice_url: initialData.invoice_url || null,
      location: initialData.location || '',
      marketplace: initialData.marketplace || (defaultStore || ''),
      order_status: initialData.order_status || '',
      payment_method: initialData.payment_method || '',
      payment_status: initialData.payment_status || '',
      sales: initialData.sales ?? 0,
      subtotal:
        initialData.subtotal !== undefined && initialData.subtotal !== null
          ? Number(initialData.subtotal) === 0
            ? ''
            : Number(initialData.subtotal).toFixed(2)
          : '',
      latitude: coords?.lat ?? undefined,
      longitude: coords?.lng ?? undefined,
      notes: initialData.notes || '',
    };
  }

  return {
    quantity: '',
    item: '',
    category: '',
    cost: '',
    customer: '',
    date: '',
    invoice_name: null,
    invoice_url: null,
    location: '',
    marketplace: '',
    order_status: '',
    payment_method: '',
    payment_status: '',
    sales: 0,
    subtotal: '',
    latitude: undefined,
    longitude: undefined,
    notes: '',
  };
}

const MODAL_ACTION_CONTROL_CLASS =
  'inline-flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-800';

const MODAL_ACTION_ICON_CLASS = 'w-3.5 h-3.5 shrink-0 text-neutral-400';
const MODAL_INPUT_CONTROL_CLASS =
  'h-8 w-full min-w-0 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 text-xs text-neutral-900 outline-hidden transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100';

const SaleModalContent: FC<Omit<SaleModalProps, 'isOpen'>> = ({
  onClose,
  onSave,
  initialData,
  defaultStore,
  onOpenFullMap,
}) => {
  const [activeOptionPicker, setActiveOptionPicker] = useState<
    'category' | 'marketplace' | 'order_status' | 'payment_method' | 'payment_status' | null
  >(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const { user } = useAuth();

  const [customFormula, setCustomFormula] = useFormulaSetting();

  const [formData, setFormData] = useState<SaleFormData>(() =>
    getInitialFormData(initialData, defaultStore)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keyboard Escape listener to close popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isInvoiceViewerOpen) {
          setIsInvoiceViewerOpen(false);
        } else if (isInvoiceDialogOpen) {
          setIsInvoiceDialogOpen(false);
        } else if (activeOptionPicker) {
          setActiveOptionPicker(null);
        } else if (isDatePickerOpen) {
          setIsDatePickerOpen(false);
        } else if (isLocationPickerOpen) {
          setIsLocationPickerOpen(false);
        } else if (isFormulaModalOpen) {
          setIsFormulaModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOptionPicker, isDatePickerOpen, isLocationPickerOpen, isFormulaModalOpen, isInvoiceDialogOpen, isInvoiceViewerOpen, onClose]);

  const calculatedSales = useMemo(() => {
    return evaluateSalesFormula(
      customFormula,
      toSaleItem(formData, 0, initialData?.id || 'temp')
    );
  }, [customFormula, formData, initialData?.id]);

  const handleFileUpload = async (file: File) => {

    if (!user?.id) {
      setErrorMsg('Please sign in to upload invoices to Supabase Storage.');
      return;
    }

    setIsUploadingInvoice(true);
    setErrorMsg('');
    try {
      // If replacing an existing invoice, clean up previous file from storage
      if (formData.invoice_url) {
        await deleteInvoiceFileAction(formData.invoice_url);
      }
      const { url, name } = await uploadInvoiceFile(file, user.id);
      setFormData((prev) => ({
        ...prev,
        invoice_name: name,
        invoice_url: url,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload invoice to Supabase Storage';
      setErrorMsg(msg);
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  const handleRemoveInvoice = async (e?: React.MouseEvent): Promise<boolean> => {
    e?.stopPropagation();
    try {
      if (formData.invoice_url || initialData?.id) {
        await deleteInvoiceFileAction(formData.invoice_url, initialData?.id);
      }
      setFormData((prev) => ({
        ...prev,
        invoice_name: '',
        invoice_url: null,
      }));
      return true;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove invoice.');
      return false;
    }
  };

  const handleSubmit = async (e?: SyntheticEvent) => {
    if (e) e.preventDefault();

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const dataToSave: Omit<SaleItem, 'id'> = {
        ...formData,
        invoice_name: formData.invoice_name || null,
        invoice_url: formData.invoice_url || null,
        quantity: parseFormQuantity(formData.quantity),
        cost: parseFormAmount(formData.cost),
        subtotal: parseFormAmount(formData.subtotal),
        sales: calculatedSales,
      };
      if (initialData?.id) {
        await onSave({
          ...dataToSave,
          id: initialData.id,
        });
      } else {
        await onSave(dataToSave);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 select-none overscroll-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#202020] text-neutral-800 dark:text-neutral-200 rounded-2xl shadow-2xl border border-neutral-200/90 dark:border-neutral-700 w-full max-w-2xl max-h-[76dvh] sm:max-h-[85vh] flex flex-col overflow-hidden select-text overscroll-contain my-auto"
      >
        {/* Top Notion Actions Bar */}
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between border-b border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-400">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            <span>{initialData ? 'Edit Order' : 'New Order'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Notion Page Title (At Top) */}
          <div className="space-y-1">
            <input
              type="text"

              placeholder="Untitled Order"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              className="w-full text-xl sm:text-2xl font-semibold tracking-tight bg-transparent border-none outline-hidden text-neutral-900 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-600 focus:ring-0 p-0 overflow-y-hidden leading-tight"
            />
          </div>

          {/* Notion Properties List */}
          <div className="space-y-1.5 pt-2 text-xs">
            {/* 1. Category */}
            <div className={`flex items-center min-h-[34px] py-0.5 ${activeOptionPicker === 'category' ? 'relative z-30' : 'relative'}`}>
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <Tag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Category</span>
              </div>
              <div
                onClick={() => {
                  setIsDatePickerOpen(false);
                  setIsLocationPickerOpen(false);
                  setActiveOptionPicker(activeOptionPicker === 'category' ? null : 'category');
                }}
                className="flex-1 relative cursor-pointer min-w-0 flex items-center"
              >
                {formData.category ? (
                  <TagPill text={formData.category} type="category" className="hover:opacity-85 transition-opacity" />
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-neutral-400 dark:text-neutral-500 italic hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors pr-1.5">
                    Empty
                  </span>
                )}
                {activeOptionPicker === 'category' && (
                  <TableOptionPicker
                    type="category"
                    currentValue={formData.category}
                    onSelect={(val) => {
                      setFormData((prev) => ({ ...prev, category: val }));
                      setActiveOptionPicker(null);
                    }}
                    onClose={() => setActiveOptionPicker(null)}
                  />
                )}
              </div>
            </div>

            {/* 2. Cost(s) */}
            <div className="flex items-center min-h-[34px] py-0.5 relative">
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <DollarSign className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Cost(s)</span>
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
                  onBlur={() => {
                    if (formData.cost !== '' && !isNaN(Number(formData.cost))) {
                      setFormData((prev) => ({
                        ...prev,
                        cost: Number(formData.cost).toFixed(2),
                      }));
                    }
                  }}
                  className={`${MODAL_INPUT_CONTROL_CLASS} font-mono`}
                />
              </div>
            </div>

            {/* 3. Customer */}
            <div className="flex items-center min-h-[34px] py-0.5 relative">
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Customer</span>
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customer: e.target.value }))}
                  className={MODAL_INPUT_CONTROL_CLASS}
                />
              </div>
            </div>

            {/* 4. Date */}
            <div className={`flex items-center min-h-[34px] py-0.5 ${isDatePickerOpen ? 'relative z-30' : 'relative'}`}>
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Date</span>
              </div>
              <div className="flex-1 relative min-w-0 flex items-center">
                <button
                  type="button"
                  aria-expanded={isDatePickerOpen}
                  onClick={() => {
                    setActiveOptionPicker(null);
                    setIsLocationPickerOpen(false);
                    setIsDatePickerOpen(!isDatePickerOpen);
                  }}
                  className={`${MODAL_ACTION_CONTROL_CLASS} cursor-pointer`}
                >
                  <Calendar className={MODAL_ACTION_ICON_CLASS} />
                  <span className={formData.date ? 'truncate' : 'truncate text-neutral-400 dark:text-neutral-500'}>
                    {formatDateDisplay(formData.date) || 'Select date'}
                  </span>
                </button>
                {isDatePickerOpen && (
                  <TableDatePicker
                    currentDate={formData.date}
                    onSelectDate={(newDate) => {
                      setFormData((prev) => ({ ...prev, date: newDate }));
                      setIsDatePickerOpen(false);
                    }}
                    onClose={() => setIsDatePickerOpen(false)}
                  />
                )}
              </div>
            </div>

            {/* 5. Invoice */}
            <div className="flex items-center min-h-[34px] py-0.5 relative">
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Invoice</span>
              </div>
              <div className="flex-1 flex items-center min-w-0">
                {isUploadingInvoice ? (
                  <div className={`${MODAL_ACTION_CONTROL_CLASS} cursor-wait`} role="status">
                    <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="truncate text-neutral-500 dark:text-neutral-400">Uploading...</span>
                  </div>
                ) : formData.invoice_name || formData.invoice_url ? (
                  <button
                    type="button"
                    onClick={() => setIsInvoiceDialogOpen(true)}
                    aria-label={`Manage invoice ${formData.invoice_name || 'receipt.pdf'}`}
                    className={`${MODAL_ACTION_CONTROL_CLASS} cursor-pointer`}
                  >
                    <FileText className={MODAL_ACTION_ICON_CLASS} />
                    <span className="truncate" title={formData.invoice_name || undefined}>
                      {formData.invoice_name || 'receipt.pdf'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsInvoiceDialogOpen(true)}
                    className={`${MODAL_ACTION_CONTROL_CLASS} cursor-pointer`}
                  >
                    <Upload className={MODAL_ACTION_ICON_CLASS} />
                    <span className="text-neutral-400 dark:text-neutral-500">Upload invoice</span>
                  </button>
                )}
                {isInvoiceDialogOpen && (
                  <TableInvoiceDialog
                    sale={toSaleItem(formData, calculatedSales, initialData?.id || 'temp')}
                    isUploading={isUploadingInvoice}
                    onUploadFile={handleFileUpload}
                    onViewInvoice={() => setIsInvoiceViewerOpen(true)}
                    onRemoveInvoice={handleRemoveInvoice}
                    onClose={() => setIsInvoiceDialogOpen(false)}
                  />
                )}
              </div>
            </div>

            {/* 6. Location (Notion Location Picker) */}
            <div className={`flex items-center min-h-[34px] py-0.5 ${isLocationPickerOpen ? 'relative z-30' : 'relative'}`}>
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Location</span>
              </div>
              <div className="flex-1 relative min-w-0 flex items-center">
                <button
                  type="button"
                  aria-expanded={isLocationPickerOpen}
                  onClick={() => {
                    setActiveOptionPicker(null);
                    setIsDatePickerOpen(false);
                    setIsLocationPickerOpen(!isLocationPickerOpen);
                  }}
                  className={`${MODAL_ACTION_CONTROL_CLASS} cursor-pointer`}
                >
                  <MapPin className={`${MODAL_ACTION_ICON_CLASS} ${formData.location ? 'text-red-500' : ''}`} />
                  <span
                    className={`truncate ${formData.location ? '' : 'text-neutral-400 dark:text-neutral-500'}`}
                    title={formData.location || 'Add location'}
                  >
                    {formData.location || 'Add location'}
                  </span>
                </button>
                {isLocationPickerOpen && (
                  <TableLocationPicker
                    sale={toSaleItem(formData, calculatedSales, initialData?.id || 'temp')}
                    onSaveLocation={(loc, lat, lng) => {
                      const norm = normalizeCoordinates(lat, lng);
                      setFormData((prev) => ({
                        ...prev,
                        location: loc,
                        latitude: norm ? norm.lat : undefined,
                        longitude: norm ? norm.lng : undefined,
                      }));
                      setIsLocationPickerOpen(false);
                    }}
                    onOpenFullMap={
                      onOpenFullMap
                        ? () => {
                          const norm = normalizeCoordinates(formData.latitude, formData.longitude);
                          onOpenFullMap(
                            toSaleItem(
                              {
                                ...formData,
                                latitude: norm?.lat ?? formData.latitude,
                                longitude: norm?.lng ?? formData.longitude,
                              },
                              calculatedSales,
                              initialData?.id || 'temp'
                            )
                          );
                          onClose();
                        }
                        : undefined
                    }
                    onClose={() => setIsLocationPickerOpen(false)}
                  />
                )}
              </div>
            </div>

            {/* 7. Store */}
            <div className={`flex items-center min-h-[34px] py-0.5 ${activeOptionPicker === 'marketplace' ? 'relative z-30' : 'relative'}`}>
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <ShoppingBag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Store</span>
              </div>
              <div
                onClick={() => {
                  setIsDatePickerOpen(false);
                  setIsLocationPickerOpen(false);
                  setActiveOptionPicker(
                    activeOptionPicker === 'marketplace' ? null : 'marketplace'
                  );
                }}
                className="flex-1 relative cursor-pointer min-w-0 flex items-center"
              >
                {formData.marketplace ? (
                  <TagPill text={formData.marketplace} type="marketplace" className="hover:opacity-85 transition-opacity" />
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-neutral-400 dark:text-neutral-500 italic hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors pr-1.5">
                    Empty
                  </span>
                )}
                {activeOptionPicker === 'marketplace' && (
                  <TableOptionPicker
                    type="marketplace"
                    currentValue={formData.marketplace}
                    onSelect={(val) => {
                      setFormData((prev) => ({
                        ...prev,
                        marketplace: val,
                      }));
                      setActiveOptionPicker(null);
                    }}
                    onClose={() => setActiveOptionPicker(null)}
                  />
                )}
              </div>
            </div>

            {/* 8. Order Status */}
            <div className={`flex items-center min-h-[34px] py-0.5 ${activeOptionPicker === 'order_status' ? 'relative z-30' : 'relative'}`}>
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <Truck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Order Status</span>
              </div>
              <div
                onClick={() => {
                  setIsDatePickerOpen(false);
                  setIsLocationPickerOpen(false);
                  setActiveOptionPicker(
                    activeOptionPicker === 'order_status' ? null : 'order_status'
                  );
                }}
                className="flex-1 relative cursor-pointer min-w-0 flex items-center"
              >
                {formData.order_status ? (
                  <TagPill text={formData.order_status} type="order_status" className="hover:opacity-85 transition-opacity" />
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-neutral-400 dark:text-neutral-500 italic hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors pr-1.5">
                    Empty
                  </span>
                )}
                {activeOptionPicker === 'order_status' && (
                  <TableOptionPicker
                    type="order_status"
                    currentValue={formData.order_status}
                    onSelect={(val) => {
                      setFormData((prev) => ({
                        ...prev,
                        order_status: val,
                      }));
                      setActiveOptionPicker(null);
                    }}
                    onClose={() => setActiveOptionPicker(null)}
                  />
                )}
              </div>
            </div>

            {/* 9. Payment Method */}
            <div className={`flex items-center min-h-[34px] py-0.5 ${activeOptionPicker === 'payment_method' ? 'relative z-30' : 'relative'}`}>
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <CreditCard className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Payment Method</span>
              </div>
              <div
                onClick={() => {
                  setIsDatePickerOpen(false);
                  setIsLocationPickerOpen(false);
                  setActiveOptionPicker(
                    activeOptionPicker === 'payment_method' ? null : 'payment_method'
                  );
                }}
                className="flex-1 relative cursor-pointer min-w-0 flex items-center"
              >
                {formData.payment_method ? (
                  <TagPill text={formData.payment_method} type="payment_method" className="hover:opacity-85 transition-opacity" />
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-neutral-400 dark:text-neutral-500 italic hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors pr-1.5">
                    Empty
                  </span>
                )}
                {activeOptionPicker === 'payment_method' && (
                  <TableOptionPicker
                    type="payment_method"
                    currentValue={formData.payment_method}
                    onSelect={(val) => {
                      setFormData((prev) => ({
                        ...prev,
                        payment_method: val,
                      }));
                      setActiveOptionPicker(null);
                    }}
                    onClose={() => setActiveOptionPicker(null)}
                  />
                )}
              </div>
            </div>

            {/* 10. Payment Status */}
            <div className={`flex items-center min-h-[34px] py-0.5 ${activeOptionPicker === 'payment_status' ? 'relative z-30' : 'relative'}`}>
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Payment<span className="hidden sm:inline"> </span><span className="block sm:inline">Status</span></span>
              </div>
              <div
                onClick={() => {
                  setIsDatePickerOpen(false);
                  setIsLocationPickerOpen(false);
                  setActiveOptionPicker(
                    activeOptionPicker === 'payment_status' ? null : 'payment_status'
                  );
                }}
                className="flex-1 relative cursor-pointer min-w-0 flex items-center"
              >
                {formData.payment_status ? (
                  <TagPill text={formData.payment_status} type="payment_status" className="hover:opacity-85 transition-opacity" />
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-neutral-400 dark:text-neutral-500 italic hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors pr-1.5">
                    Empty
                  </span>
                )}
                {activeOptionPicker === 'payment_status' && (
                  <TableOptionPicker
                    type="payment_status"
                    currentValue={formData.payment_status}
                    onSelect={(val) => {
                      setFormData((prev) => ({
                        ...prev,
                        payment_status: val,
                      }));
                      setActiveOptionPicker(null);
                    }}
                    onClose={() => setActiveOptionPicker(null)}
                  />
                )}
              </div>
            </div>

            {/* 11. Quantity */}
            <div className="flex items-center min-h-[34px] py-0.5 relative">
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <Binary className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Quantity</span>
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                  className={`${MODAL_INPUT_CONTROL_CLASS} font-mono`}
                />
              </div>
            </div>

            {/* 12. Sales (in MYR) - Formula Driven without comment */}
            <div className="flex items-center min-h-[34px] py-0.5 relative">
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <Coins className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Sales (in MYR)</span>
              </div>
              <div className="flex-1 flex items-center min-w-0">
                <div
                  onClick={() => setIsFormulaModalOpen(true)}
                  className="cursor-pointer inline-flex items-center px-2 py-0.5 rounded font-mono font-semibold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 transition-colors"
                  title="Click to edit formula for Sales"
                >
                  {(typeof calculatedSales === 'number' && !isNaN(calculatedSales) ? calculatedSales : 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* 13. Subtotal (in MYR) */}
            <div className="flex items-center min-h-[34px] py-0.5 relative">
              <div className="w-28 sm:w-44 shrink-0 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <DollarSign className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Subtotal (in MYR)</span>
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.subtotal}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subtotal: e.target.value }))}
                  onBlur={() => {
                    if (formData.subtotal !== '' && !isNaN(Number(formData.subtotal))) {
                      setFormData((prev) => ({
                        ...prev,
                        subtotal: Number(formData.subtotal).toFixed(2),
                      }));
                    }
                  }}
                  className={`${MODAL_INPUT_CONTROL_CLASS} font-mono font-medium`}
                />
              </div>
            </div>
          </div>

          {/* Notion Content Area Divider & Notes */}
          <div className="pt-4 border-t border-neutral-200/70 dark:border-neutral-800 space-y-2">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
              Notes
            </label>
            <textarea
              rows={3}
              placeholder="Add some notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full min-h-[80px] resize-y rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-900 outline-hidden transition-colors placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a6ebd] disabled:opacity-50 rounded-lg shadow-2xs hover:shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Formula Modal overlay */}
      {isFormulaModalOpen && (
        <FormulaModal
          isOpen={isFormulaModalOpen}
          onClose={() => setIsFormulaModalOpen(false)}
          sales={[toSaleItem(formData, calculatedSales, initialData?.id || 'current_item')]}
          currentFormula={customFormula}
          onSaveFormula={(newFormula) => {
            setCustomFormula(newFormula);
          }}
        />
      )}

      {/* Invoice Viewer Modal overlay */}
      {isInvoiceViewerOpen && (
        <InvoiceViewerModal
          sale={toSaleItem(formData, calculatedSales, initialData?.id || 'temp')}
          onClose={() => setIsInvoiceViewerOpen(false)}
        />
      )}
    </div>
  );
};

export const SaleModal: FC<SaleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultStore,
  onOpenFullMap,
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <SaleModalContent
      key={initialData?.id || 'new'}
      onClose={onClose}
      onSave={onSave}
      initialData={initialData}
      defaultStore={defaultStore}
      onOpenFullMap={onOpenFullMap}
    />
  );
};
