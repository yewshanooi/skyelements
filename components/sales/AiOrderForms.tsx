"use client";

import { useState, useMemo, type FC, type FormEvent } from 'react';
import {
  Plus,
  Pencil,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { SaleItem, StoreType, OrderStatus, PaymentStatus, Category } from '@/types/sales';
import {
  STORE_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  CATEGORIES,
} from '@/types/sales';

interface AiCreateOrderCardProps {
  initialValues?: Partial<SaleItem>;
  onConfirm: (payload: Omit<SaleItem, 'id'>) => Promise<void>;
  onCancel: () => void;
}

export const AiCreateOrderCard: FC<AiCreateOrderCardProps> = ({
  initialValues,
  onConfirm,
  onCancel,
}) => {
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [item, setItem] = useState(initialValues?.item || '');
  const [quantity, setQuantity] = useState(initialValues?.quantity ?? 1);
  const [subtotal, setSubtotal] = useState(initialValues?.subtotal ? String(initialValues.subtotal) : '');
  const [cost, setCost] = useState(initialValues?.cost ? String(initialValues.cost) : '0');
  const [customer, setCustomer] = useState(initialValues?.customer || '');
  const [marketplace, setMarketplace] = useState<StoreType>(
    (initialValues?.marketplace as StoreType) || 'Shopee'
  );
  const [category, setCategory] = useState<Category>(
    (initialValues?.category as Category) || 'Trading Card Games'
  );
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    (initialValues?.order_status as OrderStatus) || 'Processing'
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    (initialValues?.payment_status as PaymentStatus) || 'Processing'
  );
  const [date, setDate] = useState(initialValues?.date || todayIso);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item.trim()) {
      setErrorMsg('Item name is required.');
      return;
    }
    const subtotalNum = Number(subtotal) || 0;
    const costNum = Number(cost) || 0;
    const profitNum = Number((subtotalNum - costNum).toFixed(2));

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onConfirm({
        item: item.trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        subtotal: subtotalNum,
        cost: costNum,
        sales: profitNum,
        customer: customer.trim() || 'Walk-in Customer',
        category,
        marketplace,
        payment_method: marketplace === 'Shopee' ? 'Shopee - Online Banking' : 'Online Banking',
        order_status: orderStatus,
        payment_status: paymentStatus,
        date: date || todayIso,
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create order.');
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-3 sm:p-3.5 bg-neutral-50/90 dark:bg-[#1f1f23] border border-emerald-500/30 dark:border-emerald-500/35 rounded-2xl space-y-2.5 text-xs shadow-xs animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-[12.5px]">
            New Order Form
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1 rounded-md transition-colors cursor-pointer"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg text-red-600 dark:text-red-400 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Item Title */}
      <div>
        <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          Item / Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="e.g. Ultra Prism Booster Box"
          disabled={isSubmitting}
          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50"
        />
      </div>

      {/* Row: Quantity & Price */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={isSubmitting}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50"
          />
        </div>
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Selling Price (RM)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50"
          />
        </div>
      </div>

      {/* Row: Customer & Store */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Customer Name
          </label>
          <input
            type="text"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="e.g. Sarah Tan"
            disabled={isSubmitting}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50"
          />
        </div>
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Marketplace
          </label>
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value as StoreType)}
            disabled={isSubmitting}
            className="w-full px-2 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50 cursor-pointer"
          >
            {STORE_TYPES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row: Category & Date */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            disabled={isSubmitting}
            className="w-full px-2 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50 cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-2 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[11.5px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50 cursor-pointer"
          />
        </div>
      </div>

      {/* Row: Statuses */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Order Status
          </label>
          <select
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
            disabled={isSubmitting}
            className="w-full px-2 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50 cursor-pointer"
          >
            {ORDER_STATUSES.map((os) => (
              <option key={os} value={os}>
                {os}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Payment Status
          </label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
            disabled={isSubmitting}
            className="w-full px-2 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50 cursor-pointer"
          >
            {PAYMENT_STATUSES.map((ps) => (
              <option key={ps} value={ps}>
                {ps}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-2 px-3 bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold flex items-center justify-center cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Confirm</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

interface AiUpdateOrderCardProps {
  sales: SaleItem[];
  initialOrderId?: string;
  searchHint?: string;
  onConfirm: (id: string, updates: Partial<SaleItem>) => Promise<void>;
  onCancel: () => void;
}

export const AiUpdateOrderCard: FC<AiUpdateOrderCardProps> = ({
  sales,
  initialOrderId,
  searchHint,
  onConfirm,
  onCancel,
}) => {
  // Find default order: either initialOrderId, or matched by searchHint, or the latest order
  const defaultSale = useMemo(() => {
    if (initialOrderId) {
      const found = sales.find((s) => s.id === initialOrderId);
      if (found) return found;
    }
    if (searchHint) {
      const hint = searchHint.toLowerCase().trim();
      const match = sales.find(
        (s) =>
          s.customer.toLowerCase().includes(hint) ||
          s.item.toLowerCase().includes(hint)
      );
      if (match) return match;
    }
    return sales[0];
  }, [sales, initialOrderId, searchHint]);

  const [selectedSaleId, setSelectedSaleId] = useState(defaultSale?.id || '');
  const activeSale = useMemo(
    () => sales.find((s) => s.id === selectedSaleId) || defaultSale,
    [sales, selectedSaleId, defaultSale]
  );

  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    (activeSale?.order_status as OrderStatus) || 'Delivered'
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    (activeSale?.payment_status as PaymentStatus) || 'Paid'
  );
  const [subtotal, setSubtotal] = useState(activeSale ? String(activeSale.subtotal) : '');
  const [customer, setCustomer] = useState(activeSale?.customer || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when activeSale changes
  const handleSelectSale = (id: string) => {
    setSelectedSaleId(id);
    const target = sales.find((s) => s.id === id);
    if (target) {
      setOrderStatus((target.order_status as OrderStatus) || 'Processing');
      setPaymentStatus((target.payment_status as PaymentStatus) || 'Processing');
      setSubtotal(String(target.subtotal));
      setCustomer(target.customer);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSale) {
      setErrorMsg('No order selected.');
      return;
    }

    const updates: Partial<SaleItem> = {};
    if (orderStatus !== activeSale.order_status) updates.order_status = orderStatus;
    if (paymentStatus !== activeSale.payment_status) updates.payment_status = paymentStatus;
    if (Number(subtotal) !== activeSale.subtotal) updates.subtotal = Number(subtotal);
    if (customer.trim() !== activeSale.customer) updates.customer = customer.trim();

    if (Object.keys(updates).length === 0) {
      // If no change detected, default to applying the current selected status
      updates.order_status = orderStatus;
      updates.payment_status = paymentStatus;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onConfirm(activeSale.id, updates);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update order.');
      setIsSubmitting(false);
    }
  };

  if (sales.length === 0) {
    return (
      <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-500 space-y-2">
        <p>No orders currently in the database to update.</p>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-neutral-200 dark:bg-neutral-800 rounded-md text-neutral-800 dark:text-neutral-200 font-medium cursor-pointer"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-3 sm:p-3.5 bg-neutral-50/90 dark:bg-[#1f1f23] border border-amber-500/30 dark:border-amber-500/35 rounded-2xl space-y-2.5 text-xs shadow-xs animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-amber-500/15 dark:bg-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Pencil className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-[12.5px]">
            Edit Order Form
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1 rounded-md transition-colors cursor-pointer"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg text-red-600 dark:text-red-400 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Select Order */}
      <div>
        <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          Select Order to Edit
        </label>
        <select
          value={activeSale?.id || ''}
          onChange={(e) => handleSelectSale(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-2 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50 cursor-pointer"
        >
          {sales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.item} — {s.customer} (RM {s.subtotal.toFixed(2)}) [{s.order_status}]
            </option>
          ))}
        </select>
      </div>

      {/* Row: Status updates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Order Status
          </label>
          <select
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
            disabled={isSubmitting}
            className="w-full px-2 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50 cursor-pointer"
          >
            {ORDER_STATUSES.map((os) => (
              <option key={os} value={os}>
                {os}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Payment Status
          </label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
            disabled={isSubmitting}
            className="w-full px-2 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50 cursor-pointer"
          >
            {PAYMENT_STATUSES.map((ps) => (
              <option key={ps} value={ps}>
                {ps}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row: Customer & Price adjustments */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Customer Name
          </label>
          <input
            type="text"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50"
          />
        </div>
        <div>
          <label className="block text-[10.5px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Price (RM)
          </label>
          <input
            type="number"
            step="0.01"
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-[#28282c] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-[12px] text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1.5 focus:ring-[#2383e2]/50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-2 px-3 bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold flex items-center justify-center cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2 px-3 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Confirm</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
