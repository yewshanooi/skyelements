"use client";

import type { FC, ReactNode } from 'react';
import Link from 'next/link';
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

  const views: { id: ViewMode; label: string; icon: ReactNode }[] = [
    { id: 'table', label: 'Table', icon: <Table2 className="w-4 h-4" /> },
    { id: 'board', label: 'Board', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'chart', label: 'Chart', icon: <PieIcon className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> },
    { id: 'map', label: 'Map', icon: <MapPin className="w-4 h-4" /> },
  ];

  return (
    <div className="border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      {/* Top Utility Bar: Left Title, Center Search Bar, Right Actions (Export, Auth, Theme) */}
      <div className="px-6 py-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800/60 gap-4">
        {/* Left: Sales Dashboard Title & Home Link */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="text-lg select-none leading-none group-hover:scale-105 transition-transform">📋</span>
            <h1 className="text-base md:text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate m-0 font-sans">
              Sales Dashboard
            </h1>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 flex justify-center max-w-md w-full">
          <div className="relative flex items-center w-full max-w-sm sm:max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full pl-8.5 pr-7 py-1.5 text-xs bg-neutral-100/80 dark:bg-[#202020] hover:bg-neutral-100 dark:hover:bg-[#252525] focus:bg-white dark:focus:bg-[#202020] border border-neutral-200/80 dark:border-neutral-700/80 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange && onSearchChange('')}
                className="absolute right-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-0.5"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Import & Export Buttons, Auth, Theme */}
        <div className="flex items-center gap-1.5 md:gap-2 justify-end flex-1">
          {/* Ask AI Copilot Button */}
          {onToggleAi && (
            <button
              type="button"
              onClick={onToggleAi}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isAiOpen
                  ? 'bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d28d9] hover:to-[#4f46e5] text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200/70 dark:border-neutral-700/70'
              }`}
              title="Sales AI Copilot (Ctrl+J)"
            >
              <Sparkles className={`w-3 h-3 ${isAiOpen ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
              <span>Ask AI</span>
            </button>
          )}

          {/* Import Notion Button (For logged-in users) */}
          {user && onOpenImport && (
            <button
              type="button"
              onClick={onOpenImport}
              className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200/70 dark:border-neutral-700/70 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Import from Notion (ZIP or CSV)"
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
            title="Export CSV"
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
            title="Toggle Light/Dark Theme"
          >
            <Sun className="w-3.5 h-3.5 hidden dark:block" />
            <Moon className="w-3.5 h-3.5 block dark:hidden" />
          </button>
        </div>
      </div>

      {/* Notion-style View Tabs & Action Controls */}
      <div className="px-6 py-6 flex items-center justify-between gap-3">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {views.map((v) => {
            const isActive = activeView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onSelectView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
        <div className="flex items-center gap-2">
          {/* Order Count (hidden when Delete button is visible) */}
          {salesCount > 0 && selectedIdsCount === 0 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium px-1">
              {filteredCount !== undefined && filteredCount !== salesCount
                ? `${filteredCount} of ${salesCount}`
                : `${salesCount} orders`}
            </span>
          )}

          {/* Deselect All Button (shown when orders are selected) */}
          {selectedIdsCount > 0 && onDeselectAll && (
            <button
              type="button"
              onClick={onDeselectAll}
              className="px-2.5 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-xs font-medium transition-colors cursor-pointer animate-in fade-in zoom-in-95 duration-150"
            >
              Deselect All
            </button>
          )}

          {/* Delete Button (shown when orders are selected) */}
          {selectedIdsCount > 0 && onBatchDelete && (
            <button
              type="button"
              onClick={onBatchDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
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
              className="px-3 py-1.5 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
