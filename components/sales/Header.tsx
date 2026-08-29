"use client";

import { useState, useRef, useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import {
  Table2,
  PieChart as PieIcon,
  Calendar,
  MapPin,
  LayoutGrid,
  Plus,
  Moon,
  Sun,
  LogIn,
  LogOut,
  Download,
  Upload,
  Search,
  X,
  Trash2,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';
import type { ViewMode, StoreType } from '@/types/sales';
import { useAuth } from '@/lib/sales/AuthContext';
import { useTheme } from '@/lib/sales/useTheme';

interface HeaderProps {
  activeView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onOpenAuth: () => void;
  onExportCsv: () => void;
  onOpenImport?: () => void;
  onOpenNewSale?: (defaultStore?: StoreType | string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  salesCount?: number;
  filteredCount?: number;
  selectedIdsCount?: number;
  onBatchDelete?: () => void;
  onDeselectAll?: () => void;
  onToggleAi?: () => void;
  isAiOpen?: boolean;
}

export const Header: FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onOpenAuth,
  onExportCsv,
  onOpenImport,
  onOpenNewSale,
  searchQuery = '',
  onSearchChange,
  salesCount = 0,
  filteredCount,
  selectedIdsCount = 0,
  onBatchDelete,
  onDeselectAll,
  onToggleAi,
  isAiOpen = false,
}) => {
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  // Mobile state for More (...) dropdown menu & floating Search popover
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // Close more menu & mobile search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setIsMobileSearchOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
        setIsMobileSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const views: { id: ViewMode; label: string; icon: ReactNode }[] = [
    { id: 'table', label: 'Table', icon: <Table2 className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" /> },
    { id: 'board', label: 'Board', icon: <LayoutGrid className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" /> },
    { id: 'chart', label: 'Chart', icon: <PieIcon className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" /> },
    { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" /> },
    { id: 'map', label: 'Map', icon: <MapPin className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" /> },
  ];

  const currentViewLabel = views.find((v) => v.id === activeView)?.label || 'Table';

  return (
    <>
      {/* =========================================================================
          1. MOBILE TOP HEADER (Apple Music UI: Title on Left, (...) Menu on Right)
         ========================================================================= */}
      <div className="block md:hidden border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-[#191919]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          {/* Top Left: Large Apple-style Page Title (e.g. Table, Board, Chart, Map) */}
          <div className="flex items-center min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans truncate">
              {currentViewLabel}
            </h1>
          </div>

          {/* Top Right: (...) More Options Button with Dropdown (Ask AI, Import, Export, Logout, Theme) */}
          <div className="relative shrink-0 flex items-center gap-1.5" ref={moreMenuRef}>
            {/* If items are selected on mobile, provide quick delete/deselect buttons matching web version */}
            {selectedIdsCount > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {onDeselectAll && (
                  <button
                    type="button"
                    onClick={onDeselectAll}
                    className="px-2.5 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-xs font-medium transition-colors cursor-pointer animate-in fade-in zoom-in-95 duration-150 shrink-0"
                  >
                    Deselect
                  </button>
                )}
                {onBatchDelete && (
                  <button
                    type="button"
                    onClick={onBatchDelete}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 shrink-0"
                    title={`Delete ${selectedIdsCount} selected order${selectedIdsCount > 1 ? 's' : ''}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="bg-red-700/90 px-1.5 py-0.5 rounded text-[10px] font-mono leading-none">
                      {selectedIdsCount}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* The (...) Menu Button */}
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              aria-label="More options"
              title="More options"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>

            {/* Apple Music Style Dropdown Popover */}
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-11 w-56 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-neutral-200/90 dark:border-neutral-700/80 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* 1. New Order Button (Top) */}
                {onOpenNewSale && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNewSale();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#2383e2] dark:text-[#388bfd] transition-colors text-left cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Order</span>
                    </button>
                    <div className="h-px bg-neutral-200/80 dark:bg-neutral-800 my-1" />
                  </>
                )}

                {/* 2. AI Assistant, Import, Export Section */}
                {/* Ask AI Assistant */}
                {onToggleAi && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleAi();
                      setIsMoreMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors text-left cursor-pointer ${
                      isAiOpen
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    <Sparkles className={`w-4 h-4 ${isAiOpen ? 'text-purple-600 dark:text-purple-400' : 'text-purple-600 dark:text-purple-400'}`} />
                    <span className="flex-1">Ask AI</span>
                    {isAiOpen && (
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-semibold">
                        Active
                      </span>
                    )}
                  </button>
                )}

                {/* Import Notion */}
                {user && onOpenImport && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenImport();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                    <span>Import from Notion</span>
                  </button>
                )}

                {/* Export CSV */}
                <button
                  type="button"
                  onClick={() => {
                    onExportCsv();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors text-left cursor-pointer"
                >
                  <Download className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                  <span>Export as CSV</span>
                </button>

                <div className="h-px bg-neutral-200/80 dark:bg-neutral-800 my-1" />

                {/* 3. Appearance / Theme Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {isDarkMode ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-500" />
                    )}
                    <span>Theme</span>
                  </div>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal">
                    {isDarkMode ? 'Dark' : 'Light'}
                  </span>
                </button>

                <div className="h-px bg-neutral-200/80 dark:bg-neutral-800 my-1" />

                {/* 4. Logout / Sign In (Bottom) */}
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="truncate">Sign Out ({user.email?.split('@')[0]})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAuth();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. DESKTOP HEADER (Preserved for md+ desktop screens)
         ========================================================================= */}
      <div className="hidden md:block border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
        {/* Top Utility Bar */}
        <div className="px-6 py-2.5 border-b border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between gap-4 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center justify-between gap-2 flex-1">
            {/* Left: Brand Title */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg select-none leading-none">📋</span>
              <h1 className="text-base md:text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate m-0 font-sans">
                Sales Dashboard
              </h1>
            </div>
          </div>

          {/* Center / Search Bar */}
          <div className="flex justify-center flex-1">
            <div className="relative flex items-center w-full max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-neutral-100/80 dark:bg-[#202020] hover:bg-neutral-100 dark:hover:bg-[#252525] focus:bg-white dark:focus:bg-[#202020] border border-neutral-200/80 dark:border-neutral-700/80 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 shadow-2xs transition-all h-7"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange && onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Right Actions */}
          <div className="flex items-center gap-2 justify-end flex-1">
            {/* Ask AI Assistant Button */}
            {onToggleAi && (
              <button
                type="button"
                onClick={onToggleAi}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isAiOpen
                    ? 'bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d28d9] hover:to-[#4f46e5] text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200/70 dark:border-neutral-700/70'
                }`}
                title="AI Assistant (Ctrl+J)"
              >
                <Sparkles className={`w-3 h-3 ${isAiOpen ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                <span>Ask AI</span>
              </button>
            )}

            {/* Import Notion Button */}
            {user && onOpenImport && (
              <button
                type="button"
                onClick={onOpenImport}
                className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200/70 dark:border-neutral-700/70 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Import from Notion"
              >
                <Upload className="w-3 h-3" />
                <span>Import</span>
              </button>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={onExportCsv}
              className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200/70 dark:border-neutral-700/70 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Export as CSV"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>

            {/* User Auth Profile Button */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-neutral-200 dark:border-neutral-700">
                <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 max-w-[120px] truncate">
                  {user.email?.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="p-1 text-neutral-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )}

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              <Sun className="w-3.5 h-3.5 hidden dark:block" />
              <Moon className="w-3.5 h-3.5 block dark:hidden" />
            </button>
          </div>
        </div>

        {/* Notion-style View Tabs & Action Controls */}
        <div className="px-6 py-2.5 flex items-center justify-between gap-2 overflow-hidden">
          {/* Left: View Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar touch-scroll-x py-0.5 min-w-0 flex-initial">
            {views.map((v) => {
              const isActive = activeView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => onSelectView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                  }`}
                >
                  {v.icon}
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Orders Count, Deselect All, Delete Selection, and Notion Blue New Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Order Count */}
            {salesCount > 0 && selectedIdsCount === 0 && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium px-1 truncate">
                {activeView !== 'timeline' && filteredCount !== undefined && filteredCount !== salesCount
                  ? `${filteredCount}/${salesCount}`
                  : `${salesCount} orders`}
              </span>
            )}

            {/* Deselect All Button */}
            {selectedIdsCount > 0 && onDeselectAll && (
              <button
                type="button"
                onClick={onDeselectAll}
                className="px-2.5 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-xs font-medium transition-colors cursor-pointer animate-in fade-in zoom-in-95 duration-150 shrink-0"
              >
                Deselect
              </button>
            )}

            {/* Delete Button */}
            {selectedIdsCount > 0 && onBatchDelete && (
              <button
                type="button"
                onClick={onBatchDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 shrink-0"
                title={`Delete ${selectedIdsCount} selected order${selectedIdsCount > 1 ? 's' : ''}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
                <span className="bg-red-700/90 px-1.5 py-0.5 rounded text-[10px] font-mono leading-none">
                  {selectedIdsCount}
                </span>
              </button>
            )}

            {/* Notion Blue [New] Button */}
            {onOpenNewSale && (
              <button
                type="button"
                onClick={() => onOpenNewSale()}
                className="px-3 py-1.5 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. FLOATING BOTTOM BAR (Apple Music UI: Navigation Capsule + Search Bubble)
         ========================================================================= */}
      <div className="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 flex items-center justify-center gap-2.5 px-3 pointer-events-none select-none md:hidden">
        {/* Navigation Capsule Pill */}
        <nav
          className="pointer-events-auto flex items-center gap-0.5 p-1 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border border-neutral-200/90 dark:border-neutral-800/90 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          aria-label="Sales View Navigation"
        >
          {views.map((v) => {
            const isActive = activeView === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectView(v.id)}
                className={`flex flex-col items-center justify-center min-w-[52px] sm:min-w-[60px] px-2 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-neutral-200/90 dark:bg-neutral-700/80 text-[#2383e2] dark:text-[#388bfd] font-semibold shadow-2xs scale-100'
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
                title={v.label}
              >
                {v.icon}
                <span className="text-[10px] leading-tight mt-0.5 tracking-tight font-medium">
                  {v.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Floating Search Bubble (Next to Navigation Capsule on the same row) */}
        <div className="relative pointer-events-auto" ref={mobileSearchRef}>
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen((prev) => !prev)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] border ${
              isMobileSearchOpen || (searchQuery && searchQuery.length > 0)
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-md scale-105'
                : 'bg-white/95 dark:bg-[#1c1c1e]/95 text-neutral-700 dark:text-neutral-300 border-neutral-200/90 dark:border-neutral-800/90 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95'
            }`}
            aria-label="Search Dashboard"
            title="Search Dashboard"
          >
            <Search className="w-5 h-5" />
            {searchQuery && searchQuery.length > 0 && !isMobileSearchOpen && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#2383e2] rounded-full ring-2 ring-white dark:ring-[#1c1c1e]" />
            )}
          </button>

          {/* Floating Search Sheet Popover above the bottom bar */}
          {isMobileSearchOpen && (
            <div className="fixed bottom-20 inset-x-3 sm:inset-x-auto sm:w-96 mx-auto bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border border-neutral-200/90 dark:border-neutral-700/80 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-xs bg-neutral-100 dark:bg-[#252525] border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2383e2]/20 focus:border-[#2383e2] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchChange && onSearchChange('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-[#2383e2] dark:text-[#388bfd] hover:opacity-80 cursor-pointer shrink-0"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
