"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { FC, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  RotateCcw,
  GripVertical,
  Plus,
  Minus,
  LayoutGrid,
} from 'lucide-react';
import {
  ALL_KPI_DEFINITIONS,
  KPI_CONFIG_MAP,
  DEFAULT_KPI_SIZES,
  getCardColSpan,
  calculateTotalRows,
  MAX_OVERVIEW_ROWS,
  clampLayoutToMaxRows,
  type KpiCardId,
  type KpiCardSize,
  type KpiStats,
  type KpiCardDefinition,
  type OverviewKpiLayoutState,
} from './chartTypes';

// =========================================================================
// Mini KPI Card Component
// =========================================================================
interface MiniCardProps {
  config: KpiCardDefinition;
  stats: KpiStats;
  size: KpiCardSize;
  currentWidth?: string;
  isModal?: boolean;
  isEditMode?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  onRemove?: () => void;
  onResizeStart?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onDragStart?: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDrop?: (e: ReactDragEvent<HTMLDivElement>) => void;
  cardRef?: (node: HTMLDivElement | null) => void;
}

export const MiniKpiCard: FC<MiniCardProps> = ({
  config,
  stats,
  size = '1x1',
  currentWidth = '4/4',
  isModal = false,
  isEditMode = false,
  isDragging = false,
  isResizing = false,
  onRemove,
  onResizeStart,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  cardRef,
}) => {
  const Icon = config.icon;
  const val = config.getValue(stats);
  const fullVal = config.getFullValueTitle(stats);
  const sub = config.getSubtext(stats);
  const SubIcon = sub.icon;

  const isCompact = currentWidth === '1/4' && !isModal;
  const isMedium = currentWidth === '2/4' && !isModal;

  const paddingClass = isCompact
    ? 'p-2.5 min-h-[92px]'
    : isMedium
    ? 'p-3 min-h-[100px]'
    : 'p-3.5 sm:p-4 min-h-[106px]';

  const stateClass = isDragging
    ? 'opacity-40 scale-[0.97] border-dashed border-blue-500 shadow-none'
    : isResizing
    ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg scale-[1.01]'
    : isEditMode
    ? 'border-blue-500/30 dark:border-blue-500/30 hover:border-blue-500/60 shadow-2xs'
    : 'border-neutral-200/80 dark:border-neutral-700/70 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-600';

  const iconContainerClass = `${isCompact ? 'w-6 h-6 rounded-lg' : 'w-7 h-7 rounded-xl'} flex items-center justify-center shrink-0 ${config.iconBg}`;
  const iconSizeClass = isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div
      ref={cardRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group relative w-full rounded-xl bg-neutral-100/90 dark:bg-[#282828] border transition-all duration-150 min-w-0 flex flex-col justify-between select-none ${paddingClass} h-full ${stateClass}`}
    >
      {/* Edit Mode Remove Badge: (-) */}
      {isEditMode && onRemove && (
        <div className="absolute -top-1.5 -left-1.5 z-20 flex items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-4.5 h-4.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xs transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            title="Remove metric"
          >
            <Minus className="w-2.5 h-2.5 stroke-[3]" />
          </button>
        </div>
      )}

      {/* Drag Grip (::) */}
      {isEditMode && (
        <div
          draggable={!isResizing}
          onDragStart={onDragStart}
          className="absolute right-1.5 top-1.5 p-1 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 cursor-grab active:cursor-grabbing shrink-0 transition-colors opacity-60 hover:opacity-100 group-hover:opacity-90 z-20 touch-none select-none"
          title="Drag :: to rearrange"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Resize Grip */}
      {isEditMode && onResizeStart && (
        <div
          onPointerDown={onResizeStart}
          className="absolute right-1.5 bottom-1.5 p-1 rounded-md cursor-se-resize flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors z-20 touch-none select-none"
          title="Drag corner to resize card width"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="21" y1="21" x2="15" y2="21" />
            <line x1="21" y1="21" x2="21" y2="15" />
            <line x1="21" y1="15" x2="15" y2="21" />
            <line x1="21" y1="9" x2="9" y2="21" />
          </svg>
        </div>
      )}

      {/* Card Content based on Size */}
      {size === '1x1' ? (
        <div className="flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between min-w-0">
            <div className={iconContainerClass}>
              <Icon className={iconSizeClass} />
            </div>
          </div>

          <div className={`mt-1 min-w-0 ${isEditMode ? 'pr-4' : 'pr-0.5'}`}>
            <div
              className={`${
                isCompact ? 'text-xs sm:text-[13px]' : isMedium ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
              } font-bold font-mono text-neutral-900 dark:text-neutral-100 truncate tracking-tight`}
              title={fullVal}
            >
              {val}
            </div>
            <div className={`${isCompact ? 'text-[10px]' : 'text-[11px]'} text-neutral-500 dark:text-neutral-400 font-medium truncate mt-0.5`}>
              {config.shortTitle}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs min-w-0">
            <div className={`flex items-center gap-2 min-w-0 flex-1 ${isEditMode ? 'pr-6' : 'pr-1'}`}>
              <div className={iconContainerClass}>
                <Icon className={iconSizeClass} />
              </div>
              <span className="truncate font-semibold text-neutral-800 dark:text-neutral-200">
                {config.title}
              </span>
            </div>
          </div>

          <div
            className={`${
              isCompact
                ? 'text-sm sm:text-base my-0.5'
                : isMedium
                ? 'text-base sm:text-lg my-1'
                : 'text-base sm:text-lg lg:text-xl my-1'
            } font-bold font-mono text-neutral-900 dark:text-neutral-100 truncate tracking-tight`}
            title={fullVal}
          >
            {val}
          </div>

          <div className={`text-[10px] sm:text-[11px] flex items-center gap-1 min-w-0 truncate ${isEditMode ? 'pr-6' : 'pr-1'} ${sub.colorClass || 'text-neutral-400'}`}>
            {SubIcon && <SubIcon className="w-3 h-3 shrink-0" />}
            <span className="truncate">{sub.label}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// Controls Gallery Item (Inactive items in modal edit view)
// =========================================================================
interface GalleryCardProps {
  config: KpiCardDefinition;
  stats: KpiStats;
  disabled?: boolean;
  onAdd: () => void;
  onDragStart: (e: ReactDragEvent<HTMLDivElement>) => void;
}

export const GalleryControlItem: FC<GalleryCardProps> = ({
  config,
  stats,
  disabled = false,
  onAdd,
  onDragStart,
}) => {
  const Icon = config.icon;
  const val = config.getValue(stats);

  return (
    <div
      draggable={!disabled}
      onDragStart={disabled ? undefined : onDragStart}
      onClick={disabled ? undefined : onAdd}
      className={`group relative p-2.5 rounded-xl border transition-all duration-150 select-none ${
        disabled
          ? 'bg-neutral-100/50 dark:bg-[#1f1f1f] border-neutral-200/50 dark:border-neutral-800 opacity-40 cursor-not-allowed'
          : 'bg-white dark:bg-[#282828] border-neutral-200/90 dark:border-neutral-700/70 hover:border-blue-500/60 dark:hover:border-blue-500/60 shadow-2xs hover:shadow-md cursor-pointer active:scale-95'
      } flex items-center justify-between gap-2.5`}
      title={disabled ? 'Cannot add: Maximum of 3 rows reached' : 'Drag down to canvas or tap + to add'}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg} ${disabled ? '' : 'group-hover:scale-105'} transition-transform`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {config.title}
          </div>
          <p className="text-[10px] text-neutral-400 font-mono truncate">
            {val}
          </p>
        </div>
      </div>

      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-2xs ${
        disabled
          ? 'bg-neutral-200/50 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600'
          : 'bg-blue-50 dark:bg-blue-950/50 group-hover:bg-[#2383e2] text-[#2383e2] dark:text-[#529cca] group-hover:text-white'
      }`}>
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
      </div>
    </div>
  );
};

// =========================================================================
// Main Overview Control Center & Grid View
// =========================================================================
interface OverviewControlCenterProps {
  stats: KpiStats;
  layout: OverviewKpiLayoutState;
  isModal?: boolean;
  isEditMode?: boolean;
  currentWidth?: string;
  onChangeLayout: (newLayout: OverviewKpiLayoutState | ((prev: OverviewKpiLayoutState) => OverviewKpiLayoutState)) => void;
  onReset: () => void;
}

export const OverviewControlCenter: FC<OverviewControlCenterProps> = ({
  stats,
  layout,
  isModal = false,
  isEditMode = false,
  currentWidth = '4/4',
  onChangeLayout,
  onReset,
}) => {
  const [draggedCardId, setDraggedCardId] = useState<KpiCardId | null>(null);
  const [dragSource, setDragSource] = useState<'gallery' | 'canvas' | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<KpiCardId | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);
  const [resizingCardId, setResizingCardId] = useState<KpiCardId | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const cardElementsRef = useRef<Map<KpiCardId, HTMLDivElement>>(new Map());

  const activeCardIds = useMemo(
    () => layout.order.filter((id) => !layout.hidden[id]),
    [layout.order, layout.hidden]
  );

  const inactiveCardIds = useMemo(
    () => ALL_KPI_DEFINITIONS.map((c) => c.id).filter((id) => layout.hidden[id]),
    [layout.hidden]
  );

  const currentSizes = layout.sizes || DEFAULT_KPI_SIZES;

  // Auto-clamp layout if incoming state exceeds 3 rows
  useEffect(() => {
    const clamped = clampLayoutToMaxRows(layout, MAX_OVERVIEW_ROWS, 6);
    const hasDifference = layout.order.some((id) => layout.hidden[id] !== clamped.hidden[id]);
    if (hasDifference) {
      onChangeLayout(clamped);
    }
  }, [layout, onChangeLayout]);

  const handleAddCard = useCallback((id: KpiCardId, targetIndex?: number) => {
    const newHidden = { ...layout.hidden, [id]: false };
    let newOrder = [...layout.order];

    if (!newOrder.includes(id)) {
      newOrder.push(id);
    }

    if (targetIndex !== undefined && targetIndex >= 0) {
      newOrder = newOrder.filter((cardId) => cardId !== id);
      newOrder.splice(targetIndex, 0, id);
    }

    const cardDef = KPI_CONFIG_MAP.get(id);
    const newSizes = {
      ...currentSizes,
      [id]: currentSizes[id] || cardDef?.defaultSize || '1x1',
    };

    const newActiveIds = newOrder.filter((cardId) => !newHidden[cardId]);
    if (calculateTotalRows(newActiveIds, newSizes, 6) > MAX_OVERVIEW_ROWS) {
      return;
    }

    onChangeLayout({
      order: newOrder,
      hidden: newHidden,
      sizes: newSizes,
    });
  }, [layout, currentSizes, onChangeLayout]);

  const handleRemoveCard = useCallback((id: KpiCardId) => {
    onChangeLayout({
      ...layout,
      hidden: { ...layout.hidden, [id]: true },
    });
  }, [layout, onChangeLayout]);

  // Drag-to-Resize Handler
  const handleResizeStart = (e: ReactPointerEvent<HTMLDivElement>, id: KpiCardId) => {
    e.preventDefault();
    e.stopPropagation();

    const cardEl = cardElementsRef.current.get(id);
    const gridEl = gridContainerRef.current;
    if (!cardEl || !gridEl) return;

    setResizingCardId(id);

    const calculateSizeFromPointer = (clientX: number): KpiCardSize => {
      const cardRect = cardEl.getBoundingClientRect();
      const gridRect = gridEl.getBoundingClientRect();
      const currentWidthPx = clientX - cardRect.left;
      const gridTotalWidth = gridRect.width;

      let cols: number;
      if (isModal || currentWidth === '4/4') {
        cols = window.innerWidth >= 1280 ? 6 : window.innerWidth >= 768 ? 4 : window.innerWidth >= 640 ? 3 : 2;
      } else if (currentWidth === '3/4') {
        cols = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 640 ? 3 : 2;
      } else if (currentWidth === '2/4') {
        cols = window.innerWidth >= 640 ? 3 : 2;
      } else {
        cols = 2;
      }

      const singleColWidth = gridTotalWidth / cols;
      const colUnits = currentWidthPx / singleColWidth;

      if (colUnits >= 2.4 && cols >= 3) return '3x1';
      if (colUnits >= 1.35 && cols >= 2) return '2x1';
      return '1x1';
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const newSize = calculateSizeFromPointer(moveEvent.clientX);
      onChangeLayout((prev) => {
        const sizesMap = prev.sizes || DEFAULT_KPI_SIZES;
        if (sizesMap[id] === newSize) return prev;

        const testSizes = { ...sizesMap, [id]: newSize };
        const activeIds = prev.order.filter((cardId) => !prev.hidden[cardId]);
        if (calculateTotalRows(activeIds, testSizes, 6) > MAX_OVERVIEW_ROWS) {
          return prev;
        }

        return { ...prev, sizes: testSizes };
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      cleanup();
      const finalSize = calculateSizeFromPointer(upEvent.clientX);
      onChangeLayout((prev) => {
        const sizesMap = prev.sizes || DEFAULT_KPI_SIZES;
        const testSizes = { ...sizesMap, [id]: finalSize };
        const activeIds = prev.order.filter((cardId) => !prev.hidden[cardId]);
        const allowedSize = calculateTotalRows(activeIds, testSizes, 6) <= MAX_OVERVIEW_ROWS ? finalSize : sizesMap[id];

        return {
          ...prev,
          sizes: { ...sizesMap, [id]: allowedSize },
        };
      });
      setResizingCardId(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleGalleryDragStart = (e: ReactDragEvent<HTMLDivElement>, id: KpiCardId) => {
    setDraggedCardId(id);
    setDragSource('gallery');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleCanvasCardDragStart = (e: ReactDragEvent<HTMLDivElement>, id: KpiCardId) => {
    if (resizingCardId) return;
    const cardEl = cardElementsRef.current.get(id);
    if (cardEl && e.dataTransfer.setDragImage) {
      const rect = cardEl.getBoundingClientRect();
      e.dataTransfer.setDragImage(cardEl, e.clientX - rect.left, e.clientY - rect.top);
    }
    setDraggedCardId(id);
    setDragSource('canvas');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOverCard = (e: ReactDragEvent<HTMLDivElement>, targetId: KpiCardId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedCardId || draggedCardId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    setDragOverTargetId(targetId);
    setDropPosition(e.clientX < midX ? 'before' : 'after');
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDragSource(null);
    setDragOverTargetId(null);
    setIsCanvasDragOver(false);
  };

  const handleDropOnCard = (e: ReactDragEvent<HTMLDivElement>, targetId: KpiCardId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedCardId) {
      handleDragEnd();
      return;
    }

    const currentOrder = [...layout.order];
    const targetIdx = currentOrder.indexOf(targetId);

    if (dragSource === 'gallery') {
      const insertIdx = dropPosition === 'after' ? targetIdx + 1 : targetIdx;
      handleAddCard(draggedCardId, Math.max(0, insertIdx));
    } else if (dragSource === 'canvas') {
      if (draggedCardId === targetId) {
        handleDragEnd();
        return;
      }
      const fromIndex = currentOrder.indexOf(draggedCardId);
      let toIndex = targetIdx;

      if (fromIndex === -1 || toIndex === -1) {
        handleDragEnd();
        return;
      }

      if (dropPosition === 'after' && fromIndex > toIndex) toIndex += 1;
      else if (dropPosition === 'before' && fromIndex < toIndex) toIndex -= 1;

      currentOrder.splice(fromIndex, 1);
      currentOrder.splice(Math.max(0, Math.min(currentOrder.length, toIndex)), 0, draggedCardId);

      onChangeLayout({ ...layout, order: currentOrder });
    }

    handleDragEnd();
  };

  const handleDropOnCanvasEnd = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedCardId && dragSource === 'gallery') {
      handleAddCard(draggedCardId);
    }
    handleDragEnd();
  };

  const gridColsClass = useMemo(() => {
    if (isModal || currentWidth === '4/4') return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3';
    if (currentWidth === '3/4') return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3';
    if (currentWidth === '2/4') return 'grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3';
    return 'grid-cols-2 gap-2';
  }, [isModal, currentWidth]);

  const scrollContainerClass = isModal
    ? ''
    : 'max-h-[415px] overflow-y-auto overflow-x-hidden pr-1 pb-1 scrollbar-thin flex-1';

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      {/* TOP ZONE: Controls Gallery (Shown in Customize / Edit Mode) */}
      {isEditMode && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedCardId && dragSource === 'canvas') {
              handleRemoveCard(draggedCardId);
            }
            handleDragEnd();
          }}
          className="p-4 sm:p-5 rounded-3xl bg-neutral-50/90 dark:bg-[#181818] border border-neutral-200/90 dark:border-neutral-800 shadow-sm space-y-3.5 transition-all animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              All Metrics
            </h3>
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-2 py-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Default</span>
            </button>
          </div>

          {inactiveCardIds.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-1">
              {inactiveCardIds.map((id) => {
                const cardDef = KPI_CONFIG_MAP.get(id);
                if (!cardDef) return null;

                const cardSize = currentSizes[id] || cardDef.defaultSize || '1x1';
                const canAdd = calculateTotalRows([...activeCardIds, id], { ...currentSizes, [id]: cardSize }, 6) <= MAX_OVERVIEW_ROWS;

                return (
                  <GalleryControlItem
                    key={id}
                    config={cardDef}
                    stats={stats}
                    disabled={!canAdd}
                    onAdd={() => handleAddCard(id)}
                    onDragStart={(e) => handleGalleryDragStart(e, id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2 bg-neutral-100/50 dark:bg-neutral-900/40">
              <span>All metrics are currently active on your dashboard.</span>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM ZONE: Active Metrics Canvas */}
      <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
        {isEditMode && (
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              Active Metrics
            </span>
          </div>
        )}

        {activeCardIds.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsCanvasDragOver(true);
            }}
            onDragLeave={() => setIsCanvasDragOver(false)}
            onDrop={handleDropOnCanvasEnd}
            className={`p-8 text-center rounded-3xl border-2 border-dashed transition-all ${
              isCanvasDragOver
                ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                : 'border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30'
            }`}
          >
            <LayoutGrid className="w-8 h-8 mx-auto text-neutral-400 mb-2 opacity-60" />
            <h4 className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              No active metrics
            </h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Drag metrics down from the Controls Gallery above or tap + to add.
            </p>
          </div>
        ) : (
          <div className={scrollContainerClass}>
            <div
              ref={gridContainerRef}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={handleDropOnCanvasEnd}
              className={`grid ${gridColsClass} transition-all ${
                isEditMode ? 'p-3 rounded-3xl bg-neutral-50/40 dark:bg-[#181818]/40 border border-blue-500/20' : ''
              }`}
            >
              {activeCardIds.map((id) => {
                const cardDef = KPI_CONFIG_MAP.get(id);
                if (!cardDef) return null;

                const cardSize = currentSizes[id] || cardDef.defaultSize || '1x1';
                const cardColSpan = getCardColSpan(cardSize, currentWidth, isModal);
                const isDragging = draggedCardId === id;
                const isOver = dragOverTargetId === id;
                const isResizing = resizingCardId === id;

                return (
                  <div
                    key={id}
                    className={`relative ${cardColSpan}`}
                    onDragOver={(e) => handleDragOverCard(e, id)}
                    onDragLeave={() => {
                      if (dragOverTargetId === id) setDragOverTargetId(null);
                    }}
                    onDrop={(e) => handleDropOnCard(e, id)}
                  >
                    {isOver && isEditMode && (
                      <div
                        className={`absolute inset-y-0 w-1.5 bg-blue-500 rounded-full z-30 pointer-events-none shadow-md animate-pulse ${
                          dropPosition === 'before' ? '-left-2' : '-right-2'
                        }`}
                      />
                    )}

                    <MiniKpiCard
                      config={cardDef}
                      stats={stats}
                      size={cardSize}
                      currentWidth={currentWidth}
                      isModal={isModal}
                      isEditMode={isEditMode}
                      isDragging={isDragging}
                      isResizing={isResizing}
                      onRemove={() => handleRemoveCard(id)}
                      onResizeStart={(e) => handleResizeStart(e, id)}
                      onDragStart={(e) => handleCanvasCardDragStart(e, id)}
                      cardRef={(node) => {
                        if (node) cardElementsRef.current.set(id, node);
                        else cardElementsRef.current.delete(id);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
