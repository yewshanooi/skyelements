"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import type { FC, FormEvent, ChangeEvent } from 'react';
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
import type { SaleItem, StoreType, OrderStatus, PaymentStatus, Category, PaymentMethod } from '@/types/sales';
import { TagPill } from './TagPill';
import { TableOptionPicker } from './TableOptionPicker';
import { TableDatePicker } from './TableDatePicker';
import { TableLocationPicker } from './TableLocationPicker';
import { normalizeCoordinates } from '@/lib/sales/locationParser';
import { formatDateDisplay } from '@/lib/sales/dateUtils';
import { FormulaModal } from './FormulaModal';
import { evaluateSalesFormula, DEFAULT_FORMULA, STORAGE_KEY_FORMULA } from '@/lib/sales/formulaEngine';
import { useAuth } from '@/lib/sales/AuthContext';
import { uploadInvoiceFile } from '@/services/sales/salesService';
import { deleteInvoiceFileAction } from '@/services/sales/salesActions';
import { useBodyScrollLock } from '@/lib/sales/useBodyScrollLock';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (saleData: Omit<SaleItem, 'id'> | SaleItem) => Promise<void>;
  initialData?: SaleItem | null;
  defaultStore?: StoreType | string;
  onOpenFullMap?: (sale: SaleItem) => void;
}

interface SaleFormData {
  quantity: number | string;
  item: string;
  category: Category | string;
  cost: number | string;
  customer: string;
  date: string;
  invoice_name: string;
  invoice_url?: string;
  location: string;
  marketplace: StoreType | string;
  order_status: OrderStatus | string;
  payment_method: PaymentMethod | string;
  payment_status: PaymentStatus | string;
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
  defaultStore?: StoreType | string
): SaleFormData {
  if (initialData) {
    const coords = normalizeCoordinates(initialData.latitude, initialData.longitude);
    return {
      quantity:
        initialData.quantity !== undefined && initialData.quantity !== null
          ? initialData.quantity
          : '',
      item: initialData.item || '',
      category: initialData.category || '',
      cost:
        initialData.cost !== undefined && initialData.cost !== null
          ? Number(initialData.cost) === 0
            ? ''
            : Number(initialData.cost).toFixed(2)
          : '',
      customer: initialData.customer || '',
      date: initialData.date || new Date().toISOString().split('T')[0],
      invoice_name: initialData.invoice_name || '',
      invoice_url: initialData.invoice_url,
      location: initialData.location || '',
      marketplace: initialData.marketplace || (defaultStore || ''),
      order_status: (initialData.order_status || '') as OrderStatus,
      payment_method: initialData.payment_method || '',
      payment_status: (initialData.payment_status || '') as PaymentStatus,
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
    date: new Date().toISOString().split('T')[0],
    invoice_name: '',
    invoice_url: undefined,
    location: '',
    marketplace: defaultStore || '',
    order_status: '' as OrderStatus,
    payment_method: '',
    payment_status: '' as PaymentStatus,
    sales: 0,
    subtotal: '',
    latitude: undefined,
    longitude: undefined,
    notes: '',
  };
}

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
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const { user } = useAuth();

  const [customFormula, setCustomFormula] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_FORMULA;
    const saved = localStorage.getItem(STORAGE_KEY_FORMULA);
    if (!saved || saved === 'round( # Subtotal (in MYR) - # Cost(s) , 2)') return DEFAULT_FORMULA;
    return saved.replace(/round\(\s+#/g, 'round(#');
  });

  const [formData, setFormData] = useState<SaleFormData>(() =>
    getInitialFormData(initialData, defaultStore)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen to custom formula storage changes
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem(STORAGE_KEY_FORMULA);
      if (saved) {
        setCustomFormula(saved.replace(/round\(\s+#/g, 'round(#'));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Keyboard Escape listener to close popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeOptionPicker) {
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
  }, [activeOptionPicker, isDatePickerOpen, isLocationPickerOpen, isFormulaModalOpen, onClose]);

  const calculatedSales = useMemo(() => {
    return evaluateSalesFormula(
      customFormula,
      toSaleItem(formData, 0, initialData?.id || 'temp')
    );
  }, [customFormula, formData, initialData?.id]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleRemoveInvoice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (formData.invoice_url) {
      await deleteInvoiceFileAction(formData.invoice_url);
    }
    setFormData((prev) => ({
      ...prev,
      invoice_name: '',
      invoice_url: undefined,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.item.trim()) {
      setErrorMsg('Order name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const dataToSave: Omit<SaleItem, 'id'> = {
        ...formData,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 select-none overscroll-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#202020] text-[#37352f] dark:text-[#d4d4d4] rounded-xl sm:rounded-2xl shadow-2xl border border-neutral-200/90 dark:border-neutral-700 w-full max-w-2xl max-h-[75dvh] sm:max-h-[85vh] flex flex-col overflow-hidden select-text overscroll-contain my-auto"
      >
        {/* Top Notion Actions Bar */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between border-b border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-400">
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Notion Page Title (At Top) */}
          <div className="space-y-1">
            <input
              type="text"
              required
              placeholder="Untitled Order"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              className="w-full text-xl sm:text-3xl font-semibold tracking-tight bg-transparent border-none outline-hidden text-neutral-900 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-600 focus:ring-0 p-0 overflow-y-hidden leading-normal"
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
                  className="w-full px-2.5 py-1 text-xs bg-transparent hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 focus:bg-white dark:focus:bg-[#282828] border border-neutral-200/80 dark:border-neutral-700/80 focus:border-blue-500 rounded font-mono text-neutral-900 dark:text-neutral-100 outline-hidden transition-colors"
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
                  className="w-full px-2.5 py-1 text-xs bg-transparent hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 focus:bg-white dark:focus:bg-[#282828] border border-neutral-200/80 dark:border-neutral-700/80 focus:border-blue-500 rounded text-neutral-900 dark:text-neutral-100 outline-hidden transition-colors"
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
                <div
                  onClick={() => {
                    setActiveOptionPicker(null);
                    setIsLocationPickerOpen(false);
                    setIsDatePickerOpen(!isDatePickerOpen);
                  }}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/70 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/70 transition-colors select-none"
                >
                  <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>{formatDateDisplay(formData.date) || 'Select date'}</span>
                </div>
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
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf"
                />

                {isUploadingInvoice ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded">
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Uploading to Supabase Storage...</span>
                  </div>
                ) : formData.invoice_name || formData.invoice_url ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700/70 text-neutral-800 dark:text-neutral-200 group/inv max-w-sm select-none">
                    <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate" title={formData.invoice_name}>
                      {formData.invoice_name || 'receipt.pdf'}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveInvoice}
                      className="p-0.5 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer rounded"
                      title="Remove invoice"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/80 rounded transition-colors cursor-pointer border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-400 select-none"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
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
                <div
                  onClick={() => {
                    setActiveOptionPicker(null);
                    setIsDatePickerOpen(false);
                    setIsLocationPickerOpen(!isLocationPickerOpen);
                  }}
                  className={`cursor-pointer inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors max-w-full select-none ${
                    formData.location
                      ? 'bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/70 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/70'
                      : 'text-neutral-400 dark:text-neutral-500 italic hover:bg-neutral-100 dark:hover:bg-neutral-800/80 border border-transparent'
                  }`}
                >
                  <MapPin
                    className={`w-3.5 h-3.5 shrink-0 ${
                      formData.location ? 'text-red-500' : 'text-neutral-400'
                    }`}
                  />
                  <span className="truncate pr-1" title={formData.location || 'Empty'}>
                    {formData.location || 'Empty'}
                  </span>
                </div>
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
                      const newStore = val;
                      const currentPay = formData.payment_method || '';
                      const updatedPayment =
                        newStore === 'Shopee' && currentPay && !currentPay.startsWith('Shopee')
                          ? 'Shopee - ShopeePay Balance'
                          : newStore === 'Carousell' && currentPay && currentPay.startsWith('Shopee')
                          ? 'Online Banking'
                          : formData.payment_method;
                      setFormData((prev) => ({
                        ...prev,
                        marketplace: newStore as StoreType,
                        payment_method: updatedPayment,
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
                        order_status: val as OrderStatus,
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
                <span>Payment Status</span>
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
                        payment_status: val as PaymentStatus,
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
                  className="w-full px-2.5 py-1 text-xs bg-transparent hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 focus:bg-white dark:focus:bg-[#282828] border border-neutral-200/80 dark:border-neutral-700/80 focus:border-blue-500 rounded font-mono text-neutral-900 dark:text-neutral-100 outline-hidden transition-colors"
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
                  className="w-full px-2.5 py-1 text-xs bg-transparent hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 focus:bg-white dark:focus:bg-[#282828] border border-neutral-200/80 dark:border-neutral-700/80 focus:border-blue-500 rounded font-mono font-medium text-neutral-900 dark:text-neutral-100 outline-hidden transition-colors"
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
              className="w-full p-3 text-xs bg-neutral-50/70 dark:bg-neutral-900/50 hover:bg-neutral-100/70 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-hidden focus:ring-1 focus:ring-blue-500 transition-colors min-h-[80px] resize-y"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 flex items-center justify-end">
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
              {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Order'}
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
            localStorage.setItem(STORAGE_KEY_FORMULA, newFormula);
            window.dispatchEvent(new Event('storage'));
          }}
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
