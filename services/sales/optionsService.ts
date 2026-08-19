"use client";

import {
  CATEGORIES,
  STORE_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from '@/types/sales';
import { useState, useEffect, useCallback } from 'react';

export type OptionType =
  | 'category'
  | 'marketplace'
  | 'store'
  | 'order_status'
  | 'orderStatus'
  | 'payment_status'
  | 'paymentStatus'
  | 'payment_method'
  | 'paymentMethod';

export type NormalizedOptionType =
  | 'category'
  | 'marketplace'
  | 'order_status'
  | 'payment_status'
  | 'payment_method';

export function normalizeOptionType(type: OptionType): NormalizedOptionType {
  switch (type) {
    case 'store':
      return 'marketplace';
    case 'orderStatus':
      return 'order_status';
    case 'paymentStatus':
      return 'payment_status';
    case 'paymentMethod':
      return 'payment_method';
    default:
      return type;
  }
}

const DEFAULT_OPTIONS: Record<NormalizedOptionType, string[]> = {
  category: [...CATEGORIES],
  marketplace: [...STORE_TYPES],
  order_status: [...ORDER_STATUSES],
  payment_status: [...PAYMENT_STATUSES],
  payment_method: [...PAYMENT_METHODS],
};

const STORAGE_PREFIX = 'sales_dashboard_custom_options_';

function getStorageKey(type: NormalizedOptionType): string {
  return `${STORAGE_PREFIX}${type}_v2`;
}

// In-memory cache
const memoryCache: Partial<Record<NormalizedOptionType, string[]>> = {};

export function getOptions(type: OptionType): string[] {
  const norm = normalizeOptionType(type);
  if (memoryCache[norm]) {
    return [...memoryCache[norm]!];
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(getStorageKey(norm));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure all default options exist in the array (e.g. if newly added in code)
          const defaults = DEFAULT_OPTIONS[norm] || [];
          const merged = [...parsed];
          for (const d of defaults) {
            if (!merged.includes(d)) {
              merged.push(d);
            }
          }
          memoryCache[norm] = merged;
          return [...merged];
        }
      }
    } catch (e) {
      console.warn('Failed to load options from storage:', e);
    }
  }

  const defaults = [...(DEFAULT_OPTIONS[norm] || [])];
  memoryCache[norm] = defaults;
  return defaults;
}

export function setOptions(type: OptionType, options: string[]): string[] {
  const norm = normalizeOptionType(type);
  const cleanOptions = Array.from(new Set(options.map((o) => o.trim()).filter(Boolean)));
  memoryCache[norm] = cleanOptions;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(norm), JSON.stringify(cleanOptions));
      window.dispatchEvent(
        new CustomEvent('custom-options-changed', {
          detail: { type: norm, options: cleanOptions },
        })
      );
    } catch (e) {
      console.warn('Failed to save options to storage:', e);
    }
  }

  return cleanOptions;
}

export function reorderOptions(
  type: OptionType,
  fromIndex: number,
  toIndex: number
): string[] {
  const current = getOptions(type);
  if (
    fromIndex < 0 ||
    fromIndex >= current.length ||
    toIndex < 0 ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return current;
  }

  const next = [...current];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);

  return setOptions(type, next);
}

export const NOTION_COLORS = [
  { id: 'default', label: 'Default', tagClass: 'tag-default', colorHex: '#e3e2e0' },
  { id: 'gray', label: 'Gray', tagClass: 'tag-gray', colorHex: '#9b9a97' },
  { id: 'brown', label: 'Brown', tagClass: 'tag-brown', colorHex: '#d9730d' },
  { id: 'orange', label: 'Orange', tagClass: 'tag-orange', colorHex: '#ff9b57' },
  { id: 'yellow', label: 'Yellow', tagClass: 'tag-yellow', colorHex: '#e3b341' },
  { id: 'green', label: 'Green', tagClass: 'tag-green', colorHex: '#4dab75' },
  { id: 'blue', label: 'Blue', tagClass: 'tag-blue', colorHex: '#529cca' },
  { id: 'purple', label: 'Purple', tagClass: 'tag-purple', colorHex: '#9a6dd7' },
  { id: 'pink', label: 'Pink', tagClass: 'tag-pink', colorHex: '#e255a1' },
  { id: 'red', label: 'Red', tagClass: 'tag-red', colorHex: '#ff7369' },
] as const;

const COLOR_STORAGE_KEY = 'sales_dashboard_custom_colors_v3';
const colorMemoryCache: Record<string, string> = {};

export function getAllOptionColors(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(COLOR_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore parse error */
  }
  return {};
}

export function getOptionColor(optionName: string, type?: OptionType | string): string | undefined {
  const all = getAllOptionColors();
  if (type) {
    const norm = normalizeOptionType(type as OptionType);
    const scopedKey = `${norm}:${optionName}`;
    if (colorMemoryCache[scopedKey]) return colorMemoryCache[scopedKey];
    if (all[scopedKey]) return all[scopedKey];
  }
  if (colorMemoryCache[optionName]) return colorMemoryCache[optionName];
  return all[optionName];
}

export function setOptionColor(optionName: string, tagClass: string, type?: OptionType | string): void {
  const all = getAllOptionColors();
  if (type) {
    const norm = normalizeOptionType(type as OptionType);
    const scopedKey = `${norm}:${optionName}`;
    all[scopedKey] = tagClass;
    colorMemoryCache[scopedKey] = tagClass;
  }
  all[optionName] = tagClass;
  colorMemoryCache[optionName] = tagClass;
  if (typeof window !== 'undefined') {
    localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(
      new CustomEvent('custom-colors-changed', {
        detail: { optionName, tagClass, type, allColors: all },
      })
    );
  }
}

export const DEFAULT_TYPE_OPTION_COLORS: Record<NormalizedOptionType, Record<string, string>> = {
  payment_status: {
    'On Hold': 'tag-red',
    Processing: 'tag-yellow',
    Paid: 'tag-green',
  },
  order_status: {
    Processing: 'tag-red',
    Shipped: 'tag-yellow',
    Delivered: 'tag-green',
  },
  marketplace: {
    Shopee: 'tag-orange',
    Carousell: 'tag-red',
  },
  payment_method: {
    'Online Banking': 'tag-yellow',
    'E-Wallet': 'tag-blue',
    'E-Wallet - Business': 'tag-blue',
    'Shopee - ShopeePay Balance': 'tag-orange',
    'Shopee - Online Banking': 'tag-orange',
    'Shopee - Apple Pay': 'tag-orange',
    'Shopee - Credit / Debit Card': 'tag-orange',
    'Shopee - Cash Payment at Physical Stores': 'tag-orange',
    'Shopee - Cash on Delivery': 'tag-orange',
    'Shopee - SPayLater': 'tag-orange',
  },
  category: {
    'Trading Card Games': 'tag-gray',
    'Gift Cards': 'tag-gray',
    'Collectibles': 'tag-gray',
    'Virtual Items': 'tag-gray',
    'Virtual Services': 'tag-gray',
    'Miniatures': 'tag-gray',
    'Books': 'tag-gray',
    'Electronics': 'tag-gray',
  },
};

export const DEFAULT_OPTION_COLORS: Record<string, string> = {
  Shopee: 'tag-orange',
  Carousell: 'tag-red',
  'Online Banking': 'tag-yellow',
  'E-Wallet': 'tag-blue',
  'E-Wallet - Business': 'tag-blue',
  'Shopee - ShopeePay Balance': 'tag-orange',
  'Shopee - Online Banking': 'tag-orange',
  'Shopee - Apple Pay': 'tag-orange',
  'Shopee - Credit / Debit Card': 'tag-orange',
  'Shopee - Cash Payment at Physical Stores': 'tag-orange',
  'Shopee - Cash on Delivery': 'tag-orange',
  'Shopee - SPayLater': 'tag-orange',
  'Trading Card Games': 'tag-gray',
  'Gift Cards': 'tag-gray',
  'Collectibles': 'tag-gray',
  'Virtual Items': 'tag-gray',
  'Virtual Services': 'tag-gray',
  'Miniatures': 'tag-gray',
  'Books': 'tag-gray',
  'Electronics': 'tag-gray',
  'On Hold': 'tag-red',
  Processing: 'tag-yellow',
  Paid: 'tag-green',
  Shipped: 'tag-yellow',
  Delivered: 'tag-green',
};

export function resolveOptionTagClass(optionName: string, type?: OptionType | string): string {
  if (!optionName) return 'tag-default';

  if (type) {
    const norm = normalizeOptionType(type as OptionType);
    const scopedKey = `${norm}:${optionName}`;
    const all = getAllOptionColors();

    // 1. Check explicitly scoped custom color
    if (colorMemoryCache[scopedKey]) return colorMemoryCache[scopedKey];
    if (all[scopedKey]) return all[scopedKey];

    // 2. Check type-specific defaults
    if (DEFAULT_TYPE_OPTION_COLORS[norm]?.[optionName]) {
      return DEFAULT_TYPE_OPTION_COLORS[norm][optionName];
    }

    if (norm === 'category') {
      return 'tag-gray';
    }

    // 3. Smart pattern matching for payment methods / marketplace
    if (norm === 'payment_method' || norm === 'marketplace') {
      const lower = optionName.toLowerCase();
      if (lower.startsWith('shopee')) return 'tag-orange';
      if (lower.startsWith('carousell')) return 'tag-red';
      if (lower.includes('e-wallet') || lower.includes('wallet')) return 'tag-blue';
      if (lower.includes('bank') || lower.includes('transfer')) return 'tag-yellow';
      if (lower.includes('cash') || lower.includes('cod')) return 'tag-orange';
      if (lower.includes('card') || lower.includes('pay')) return 'tag-purple';
    }
  }

  // 4. Check general custom color
  const custom = getOptionColor(optionName);
  if (custom) return custom;

  // 5. Check global default color
  if (DEFAULT_OPTION_COLORS[optionName]) return DEFAULT_OPTION_COLORS[optionName];

  // 6. Smart general brand matching
  const lowerOpt = optionName.toLowerCase();
  if (lowerOpt.startsWith('shopee')) return 'tag-orange';
  if (lowerOpt.startsWith('carousell')) return 'tag-red';
  if (lowerOpt.includes('e-wallet') || lowerOpt.includes('wallet')) return 'tag-blue';
  if (lowerOpt.includes('bank')) return 'tag-yellow';

  // 7. Fallback deterministic color
  const colors = ['tag-blue', 'tag-purple', 'tag-green', 'tag-orange', 'tag-pink', 'tag-yellow', 'tag-brown', 'tag-gray'];
  let hash = 0;
  for (let i = 0; i < optionName.length; i++) {
    hash = optionName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function renameOption(
  type: OptionType,
  oldName: string,
  newName: string
): string[] {
  const norm = normalizeOptionType(type);
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return getOptions(type);

  const current = getOptions(type);
  const index = current.indexOf(oldName);
  if (index === -1) return current;

  const next = [...current];
  next[index] = trimmed;

  // Migrate color
  const allColors = getAllOptionColors();
  if (allColors[oldName]) {
    allColors[trimmed] = allColors[oldName];
    delete allColors[oldName];
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(allColors));
    }
  }

  setOptions(type, next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('custom-option-renamed', {
        detail: { type: norm, oldName, newName: trimmed },
      })
    );
  }

  return next;
}

export function addOption(type: OptionType, newOption: string): string[] {
  const trimmed = newOption.trim();
  if (!trimmed) return getOptions(type);

  const current = getOptions(type);
  if (current.some((opt) => opt.toLowerCase() === trimmed.toLowerCase())) {
    return current;
  }

  const next = [...current, trimmed];
  return setOptions(type, next);
}

export function addOptionsBatch(type: OptionType, newOptions: string[]): string[] {
  const current = getOptions(type);
  const currentLower = new Set(current.map((opt) => opt.toLowerCase()));
  const additions: string[] = [];

  for (const opt of newOptions) {
    const trimmed = opt.trim();
    if (trimmed && !currentLower.has(trimmed.toLowerCase())) {
      currentLower.add(trimmed.toLowerCase());
      additions.push(trimmed);
    }
  }

  if (additions.length === 0) return current;
  const next = [...current, ...additions];
  return setOptions(type, next);
}

export function removeOption(type: OptionType, optionToRemove: string): string[] {
  const current = getOptions(type);
  const next = current.filter((opt) => opt !== optionToRemove);

  // Clean up color mapping
  const allColors = getAllOptionColors();
  if (allColors[optionToRemove]) {
    delete allColors[optionToRemove];
    delete colorMemoryCache[optionToRemove];
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(allColors));
    }
  }

  return setOptions(type, next);
}

export function resetOptions(type: OptionType): string[] {
  const norm = normalizeOptionType(type);
  const defaults = [...(DEFAULT_OPTIONS[norm] || [])];
  return setOptions(type, defaults);
}

export function subscribeToOptions(
  callback: (type?: NormalizedOptionType) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ type?: NormalizedOptionType }>;
    callback(customEvent.detail?.type);
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(STORAGE_PREFIX)) {
      // Invalidate memory cache
      for (const k of Object.keys(memoryCache)) {
        delete memoryCache[k as NormalizedOptionType];
      }
      callback();
    }
  };

  window.addEventListener('custom-options-changed', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('custom-options-changed', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

export function useOptions(type: OptionType) {
  const norm = normalizeOptionType(type);
  const [options, setOptionsState] = useState<string[]>(() => getOptions(norm));

  const [prevNorm, setPrevNorm] = useState(norm);
  if (prevNorm !== norm) {
    setPrevNorm(norm);
    setOptionsState(getOptions(norm));
  }

  useEffect(() => {
    const unsubscribe = subscribeToOptions((updatedType) => {
      if (!updatedType || updatedType === norm) {
        setOptionsState(getOptions(norm));
      }
    });

    return unsubscribe;
  }, [norm]);

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updated = reorderOptions(norm, fromIndex, toIndex);
      setOptionsState(updated);
      return updated;
    },
    [norm]
  );

  const add = useCallback(
    (newOpt: string) => {
      const updated = addOption(norm, newOpt);
      setOptionsState(updated);
      return updated;
    },
    [norm]
  );

  const remove = useCallback(
    (optToRemove: string) => {
      const updated = removeOption(norm, optToRemove);
      setOptionsState(updated);
      return updated;
    },
    [norm]
  );

  const rename = useCallback(
    (oldName: string, newName: string) => {
      const updated = renameOption(norm, oldName, newName);
      setOptionsState(updated);
      return updated;
    },
    [norm]
  );

  const setColor = useCallback(
    (opt: string, tagClass: string) => {
      setOptionColor(opt, tagClass, norm);
    },
    [norm]
  );

  const reset = useCallback(() => {
    const updated = resetOptions(norm);
    setOptionsState(updated);
    return updated;
  }, [norm]);

  return {
    options,
    reorderOptions: reorder,
    addOption: add,
    removeOption: remove,
    renameOption: rename,
    setOptionColor: setColor,
    resetOptions: reset,
  };
}
