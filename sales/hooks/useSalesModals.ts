import { useCallback, useEffect, useState } from 'react';
import type { SaleItem, StoreType } from '@/sales/types';

export function useSalesModals() {
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleItem | null>(null);
  const [defaultStoreForNewSale, setDefaultStoreForNewSale] = useState<StoreType | string | undefined>();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [invoiceSale, setInvoiceSale] = useState<SaleItem | null>(null);
  const [selectedMapSale, setSelectedMapSale] = useState<SaleItem | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('sales_ai_drawer_open') === 'true') setIsAiOpen(true);
    } catch {}
  }, []);

  const handleToggleAi = useCallback(() => {
    setIsAiOpen((current) => {
      const next = !current;
      try { sessionStorage.setItem('sales_ai_drawer_open', String(next)); } catch {}
      return next;
    });
  }, []);

  const handleCloseAi = useCallback(() => {
    setIsAiOpen(false);
    try { sessionStorage.setItem('sales_ai_drawer_open', 'false'); } catch {}
  }, []);

  const handleOpenAuth = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  return {
    isSaleModalOpen, setIsSaleModalOpen, isImportModalOpen, setIsImportModalOpen,
    editingSale, setEditingSale, defaultStoreForNewSale, setDefaultStoreForNewSale,
    isAuthModalOpen, setIsAuthModalOpen, authModalMode, invoiceSale, setInvoiceSale,
    selectedMapSale, setSelectedMapSale, isAiOpen, selectedIds, setSelectedIds,
    handleToggleAi, handleCloseAi, handleOpenAuth,
  };
}
