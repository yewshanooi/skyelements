"use client";

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { FC, PointerEvent } from 'react';
import {
  Table2,
  PieChart as PieIcon,
  Calendar,
  MapPin,
  LayoutGrid,
  Plus,
  Download,
  Loader2,
  Search,
  X,
  Trash2,
} from 'lucide-react';
import type { ViewMode } from '@/sales/types';

interface HeaderProps {
  activeView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onExportPdf: () => void;
  isExportingPdf?: boolean;
  onOpenNewSale?: (defaultStore?: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  salesCount?: number;
  filteredCount?: number;
  selectedIdsCount?: number;
  onBatchDelete?: () => void;
  onDeselectAll?: () => void;
}

interface ViewTabConfig {
  id: ViewMode;
  label: string;
  Icon: typeof Table2;
}

const VIEWS: ViewTabConfig[] = [
  { id: 'table', label: 'Table', Icon: Table2 },
  { id: 'board', label: 'Board', Icon: LayoutGrid },
  { id: 'chart', label: 'Chart', Icon: PieIcon },
  { id: 'timeline', label: 'Timeline', Icon: Calendar },
  { id: 'map', label: 'Map', Icon: MapPin },
];

/* =========================================================================
   MOBILE FLOATING NAVIGATION + EXPANDING SEARCH
   - Isolated state machine: opening/closing search won't re-render parent Header
   - Outside click / key listeners registered ONLY when search is open
   - Synchronous input.blur() on dismiss for instant iOS/Android keyboard collapse
   - User taps search input to open keyboard (no auto open keyboard on mobile)
   - Press-and-drag view navigation previews the target tab and continuously follows the pointer between tabs
   - Pixel-perfect h-12 (48px) circle and pill alignment with safe-area spacing
   ========================================================================= */
interface MobileFloatingNavProps {
  activeView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenNewSale?: (defaultStore?: string) => void;
  onExportPdf: () => void;
  isExportingPdf?: boolean;
  selectedIdsCount?: number;
  onBatchDelete?: () => void;
  onDeselectAll?: () => void;
}

const MobileFloatingNav: FC<MobileFloatingNavProps> = ({
  activeView,
  onSelectView,
  searchQuery = '',
  onSearchChange,
  onOpenNewSale,
  onExportPdf,
  isExportingPdf = false,
  selectedIdsCount = 0,
  onBatchDelete,
  onDeselectAll,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [draggedView, setDraggedView] = useState<ViewMode | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    view: ViewMode;
    hasMoved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const dragPreviewXRef = useRef<number | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const viewButtonRefs = useRef<Partial<Record<ViewMode, HTMLButtonElement | null>>>({});
  const dragMetricsRef = useRef<{
    navLeft: number;
    navWidth: number;
    navTop: number;
    navBottom: number;
    views: Partial<Record<ViewMode, { left: number; width: number; height: number; top: number }>>;
  } | null>(null);
  const [activeIndicator, setActiveIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    const selectedView = draggedView ?? activeView;
    const button = viewButtonRefs.current[selectedView];
    if (!button) return;

    setActiveIndicator({
      left: button.offsetLeft,
      top: button.offsetTop,
      width: button.offsetWidth,
      height: button.offsetHeight,
    });
  }, [activeView, draggedView]);

  const dragPreviewX = dragPreviewXRef.current;
  const renderedIndicator = activeIndicator
    ? {
        ...activeIndicator,
        ...(dragPreviewX !== null && draggedView && mobileNavRef.current
          ? {
              left: Math.max(
                0,
                Math.min(
                  mobileNavRef.current.clientWidth - activeIndicator.width,
                  dragPreviewX - activeIndicator.width / 2
                )
              ),
            }
          : {}),
      }
    : null;

  const getViewAtPoint = (clientX: number, clientY: number): ViewMode | null => {
    const metrics = dragMetricsRef.current;
    if (!metrics || clientY < metrics.navTop || clientY > metrics.navBottom) return null;

    let closestView: ViewMode | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const view of VIEWS) {
      const metric = metrics.views[view.id];
      if (!metric) continue;

      const distance = Math.abs(clientX - (metrics.navLeft + metric.left + metric.width / 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestView = view.id;
      }
    }

    return closestView;
  };

  const applyDragPreviewFrame = () => {
    dragFrameRef.current = null;
    const indicator = indicatorRef.current;
    const metrics = dragMetricsRef.current;
    const dragState = dragStateRef.current;
    if (!indicator || !metrics || !dragState || !dragState.hasMoved) return;

    const metric = metrics.views[dragState.view];
    const previewX = dragPreviewXRef.current;
    if (!metric || previewX === null) return;

    const left = Math.max(
      0,
      Math.min(metrics.navWidth - metric.width, previewX - metric.width / 2)
    );
    indicator.style.width = `${metric.width}px`;
    indicator.style.height = `${metric.height}px`;
    indicator.style.transform = `translate3d(${left}px, ${metric.top}px, 0)`;
  };

  const scheduleDragPreviewFrame = () => {
    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = window.requestAnimationFrame(applyDragPreviewFrame);
  };

  const updateDragPreviewPosition = (clientX: number) => {
    const metrics = dragMetricsRef.current;
    if (!metrics) return;

    dragPreviewXRef.current = Math.max(0, Math.min(metrics.navWidth, clientX - metrics.navLeft));
    scheduleDragPreviewFrame();
  };

  const handleNavPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    suppressClickRef.current = false;
    dragPreviewXRef.current = null;

    const tab = (event.target as Element).closest<HTMLElement>('[data-view]');
    const view = tab?.dataset.view;
    if (!tab || !VIEWS.some((item) => item.id === view)) return;

    const nav = mobileNavRef.current;
    if (!nav) return;
    const navRect = nav.getBoundingClientRect();
    const views: Partial<Record<ViewMode, { left: number; width: number; height: number; top: number }>> = {};
    for (const item of VIEWS) {
      const button = viewButtonRefs.current[item.id];
      if (!button) continue;
      const buttonRect = button.getBoundingClientRect();
      views[item.id] = {
        left: buttonRect.left - navRect.left,
        top: buttonRect.top - navRect.top,
        width: buttonRect.width,
        height: buttonRect.height,
      };
    }
    dragMetricsRef.current = {
      navLeft: navRect.left,
      navWidth: navRect.width,
      navTop: navRect.top,
      navBottom: navRect.bottom,
      views,
    };

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      view: view as ViewMode,
      hasMoved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleNavPointerMove = (event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (!dragState.hasMoved) {
      const distance = Math.hypot(
        event.clientX - dragState.startX,
        event.clientY - dragState.startY
      );
      if (distance < 6) return;
      dragState.hasMoved = true;
      setDraggedView(dragState.view);
    }

    updateDragPreviewPosition(event.clientX);
    const view = getViewAtPoint(event.clientX, event.clientY);
    if (view && view !== dragState.view) {
      dragState.view = view;
      setDraggedView(view);
    }
  };

  const finishNavDrag = (event: PointerEvent<HTMLElement>, cancelled = false) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (!cancelled) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      onSelectView(dragState.view);
    }

    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    dragStateRef.current = null;
    dragPreviewXRef.current = null;
    dragMetricsRef.current = null;
    setDraggedView(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // Close more menu on Escape key
  useEffect(() => {
    if (!isMoreMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMoreMenuOpen]);

  return (
    <>
      {/* Tap-to-dismiss backdrop for More Popover */}
      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-2xs pointer-events-auto md:hidden animate-in fade-in duration-150 touch-manipulation"
          onClick={() => setIsMoreMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className="fixed inset-x-0 z-40 flex items-center justify-center px-2.5 sm:px-3 pointer-events-none select-none md:hidden transform-gpu will-change-transform"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
      >
        {/* Natural container holding the base nav row + (...) more options bubble */}
        <div className="relative flex items-center gap-2 max-w-full pointer-events-none">
          {/* Base: Navigation Capsule Pill */}
          <nav
            ref={mobileNavRef}
            onPointerDown={handleNavPointerDown}
            onPointerMove={handleNavPointerMove}
            onPointerUp={finishNavDrag}
            onPointerCancel={(event) => finishNavDrag(event, true)}
            className="pointer-events-auto relative h-12 flex items-center gap-0.5 p-1 bg-white dark:bg-[#1c1c1e] backdrop-blur-xl border border-neutral-200/90 dark:border-neutral-800/90 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            style={{ touchAction: 'pan-y' }}
            aria-label="Sales View Navigation. Press and drag across views to navigate."
          >
            {renderedIndicator && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute left-0 top-0 z-0 will-change-transform rounded-full bg-neutral-200/90 dark:bg-neutral-700/80 shadow-2xs ${draggedView === null ? 'transition-[transform,width] duration-150 ease-out' : 'transition-none'}`}
                ref={indicatorRef}
                style={{
                  width: renderedIndicator.width,
                  height: renderedIndicator.height,
                  transform: `translate(${renderedIndicator.left}px, ${renderedIndicator.top}px)`,
                }}
              />
            )}
            {VIEWS.map((v) => {
              const isActive = (draggedView ?? activeView) === v.id;
              const TabIcon = v.Icon;
              return (
                <button
                  key={v.id}
                  ref={(button) => {
                    viewButtonRefs.current[v.id] = button;
                  }}
                  type="button"
                  data-view={v.id}
                  onClick={() => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    onSelectView(v.id);
                  }}
                  aria-pressed={isActive}
                  className={`relative z-10 flex flex-col items-center justify-center h-full min-w-[46px] xs:min-w-[50px] sm:min-w-[56px] px-1.5 sm:px-2 rounded-full transition-colors duration-150 cursor-pointer touch-manipulation ${isActive
                    ? 'text-[#2383e2] dark:text-[#388bfd] font-medium'
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 active:scale-90'
                    }`}
                  title={v.label}
                >
                  <TabIcon className="w-4.5 h-4.5 shrink-0" />
                  <span className="text-[10px] leading-none mt-0.5 tracking-tight font-medium">
                    {v.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Replacement Bubble: (...) More Options Button Container */}
          <div className="relative shrink-0 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className={`w-12 h-12 rounded-full bg-white dark:bg-[#1c1c1e] backdrop-blur-xl border border-neutral-200/90 dark:border-neutral-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-90 touch-manipulation relative ${isMoreMenuOpen
                ? 'bg-neutral-200/90 dark:bg-neutral-700/80 text-neutral-900 dark:text-white'
                : 'hover:bg-white dark:hover:bg-[#1c1c1e] text-neutral-700 dark:text-neutral-300'
                }`}
              aria-label="More Options and Search"
              title="More Options"
              aria-expanded={isMoreMenuOpen}
            >
              <Plus className="w-5 h-5" />

              {/* Status Badges: Selected Orders count or Search active indicator */}
              {selectedIdsCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 leading-none text-center shadow-xs">
                  {selectedIdsCount}
                </span>
              ) : searchQuery && searchQuery.length > 0 ? (
                <span
                  className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#2383e2] rounded-full ring-2 ring-white dark:ring-[#1c1c1e]"
                  title="Search filter active"
                />
              ) : null}
            </button>

            {/* More (...) Options Popover Menu - Positioned cleanly above the (...) button */}
            {isMoreMenuOpen && (
              <div
                className="absolute right-0 bottom-14 w-52 max-w-[calc(100vw-24px)] bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.2)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] border border-neutral-200/90 dark:border-neutral-800/90 p-1.5 z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 origin-bottom-right"
                role="menu"
                aria-label="Dashboard Options"
              >
                {/* Incorporated Search Bar */}
                <form
                  role="search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setIsMoreMenuOpen(false);
                  }}
                  className="p-1 mb-1"
                >
                  <div className="relative flex items-center w-full">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsMoreMenuOpen(false);
                        }
                      }}
                      enterKeyHint="search"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label="Search"
                      className="w-full pl-7.5 pr-7 py-1.5 text-xs bg-neutral-100 dark:bg-[#252528] border border-neutral-200 dark:border-neutral-700/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2383e2]/20 focus:border-[#2383e2] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={() => onSearchChange?.('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 cursor-pointer touch-manipulation"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </form>

                {/* 1. New Order Button */}
                {onOpenNewSale && selectedIdsCount === 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNewSale();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-xl text-[#2383e2] dark:text-[#388bfd] hover:bg-blue-50 dark:hover:bg-blue-950/40 active:bg-blue-100 dark:active:bg-blue-950/60 transition-colors text-left cursor-pointer touch-manipulation"
                    >
                      <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-[#2383e2] dark:text-[#388bfd] shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span className="flex-1 truncate">New Order</span>
                    </button>
                    <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80 my-1 mx-1" />
                  </>
                )}

                {/* 2. Export as PDF */}
                <button
                  type="button"
                  onClick={() => {
                    onExportPdf();
                    setIsMoreMenuOpen(false);
                  }}
                  disabled={isExportingPdf}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
                >
                  <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 shrink-0">
                    {isExportingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="flex-1 truncate">{isExportingPdf ? 'Exporting...' : 'Export as PDF'}</span>
                </button>

                {/* 4. Batch Selection Actions (if any items selected) */}
                {selectedIdsCount > 0 && (
                  <>
                    <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80 my-1 mx-1" />
                    {onDeselectAll && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeselectAll();
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors text-left cursor-pointer touch-manipulation"
                      >
                        <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </div>
                        <span className="flex-1 truncate">Deselect</span>
                      </button>
                    )}
                    {onBatchDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          onBatchDelete();
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 active:bg-red-100 dark:active:bg-red-950/60 transition-colors text-left cursor-pointer touch-manipulation"
                      >
                        <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950/80 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="flex-1 truncate">Delete ({selectedIdsCount})</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};


export const Header: FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onExportPdf,
  isExportingPdf = false,
  onOpenNewSale,
  searchQuery = '',
  onSearchChange,
  salesCount = 0,
  filteredCount,
  selectedIdsCount = 0,
  onBatchDelete,
  onDeselectAll,
}) => {
  return (
    <>
      {/* =========================================================================
          1. DESKTOP HEADER (Preserved for md+ desktop screens)
         ========================================================================= */}
      <div className="hidden md:block shrink-0 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-[#191919]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
        {/* Notion-style View Tabs, Centered Actions (Ask AI, Export, Search), and Action Controls */}
        <div className="px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Left: View Tabs */}
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar touch-scroll-x py-0.5">
            {VIEWS.map((v) => {
              const isActive = activeView === v.id;
              const TabIcon = v.Icon;
              return (
                <button
                  key={v.id}
                  onClick={() => onSelectView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${isActive
                    ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                    }`}
                >
                  <TabIcon className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Search, Export, Orders Count, Deselect All, Delete Selection, and Notion Blue New Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Bar (sits immediately left of Export) - hidden while rows are selected */}
            {selectedIdsCount === 0 && (
            <div className="relative flex items-center w-56 shrink-0">
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
            )}

            {/* Export PDF Button - hidden while rows are selected */}
            {selectedIdsCount === 0 && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200/70 dark:border-neutral-700/70 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              title="Export"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </>
              )}
            </button>
            )}

            {/* Order Count */}
            {salesCount > 0 && selectedIdsCount === 0 && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium px-1 truncate">
                {activeView !== 'timeline' && filteredCount !== undefined
                  ? `${filteredCount} ${filteredCount === 1 ? 'order' : 'orders'}`
                  : `${salesCount} ${salesCount === 1 ? 'order' : 'orders'}`}
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
            {onOpenNewSale && selectedIdsCount === 0 && (
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
          2. FLOATING BOTTOM BAR (Navigation Capsule + Search & More Action Bubble)
         ========================================================================= */}
      <MobileFloatingNav
        activeView={activeView}
        onSelectView={onSelectView}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onOpenNewSale={onOpenNewSale}
        onExportPdf={onExportPdf}
        isExportingPdf={isExportingPdf}
        selectedIdsCount={selectedIdsCount}
        onBatchDelete={onBatchDelete}
        onDeselectAll={onDeselectAll}
      />
    </>
  );
};

