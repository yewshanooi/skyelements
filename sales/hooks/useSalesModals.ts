import { useCallback, useEffect, useState } from 'react';
import type { SaleItem, StoreType } from '@/sales/types';

export function useSalesModals() {
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleItem | null>(null);
  const [defaultStoreForNewSale, setDefaultStoreForNewSale] = useState<StoreType | string | undefined>();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [invoiceSale, setInvoiceSale] = useState<SaleItem | null>(null);
  const [selectedMapSale, setSelectedMapSale] = useState<SaleItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleOpenAuth = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  return {
    isSaleModalOpen, setIsSaleModalOpen,
    editingSale, setEditingSale, defaultStoreForNewSale, setDefaultStoreForNewSale,
    isAuthModalOpen, setIsAuthModalOpen, authModalMode, invoiceSale, setInvoiceSale,
    selectedMapSale, setSelectedMapSale, selectedIds, setSelectedIds,
    handleOpenAuth,
  };
}
