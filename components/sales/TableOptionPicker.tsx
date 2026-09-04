"use client";

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FC, DragEvent } from 'react';
import {
  GripVertical,
  X,
  Check,
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { TagPill } from './TagPill';
import {
  useOptions,
  type OptionType,
  normalizeOptionType,
  NOTION_COLORS,
  resolveOptionTagClass,
  setOptionColor,
} from '@/services/sales/optionsService';

interface TableOptionPickerProps {
  type: OptionType;
  currentValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export const TableOptionPicker: FC<TableOptionPickerProps> = ({
  type,
  currentValue,
  onSelect,
  onClose,
}) => {
  const { options, reorderOptions, addOption, removeOption, renameOption } = useOptions(type);
  const normalizedType = normalizeOptionType(type);
  const [search, setSearch] = useState('');
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [, setTriggerRefresh] = useState(0);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const isDraggingRef = useRef(false);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    placement: 'bottom' | 'top';
  } | null>(null);

  const computePosition = () => {
    const anchor = anchorRef.current?.parentElement || anchorRef.current;
    if (!anchor) return;
    const parentRect = anchor.getBoundingClientRect();
    if (parentRect.width === 0 && parentRect.height === 0) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = popoverRef.current?.offsetWidth || 256;
    const popoverHeight = popoverRef.current?.offsetHeight || 280;

    const spaceBelow = viewportHeight - parentRect.bottom;
    const spaceAbove = parentRect.top;

    let placement: 'bottom' | 'top' = 'bottom';
    if (spaceBelow < Math.min(popoverHeight, 260) && (spaceAbove > spaceBelow || spaceAbove > 180)) {
      placement = 'top';
    }

    let left = parentRect.left;
    if (left + popoverWidth > viewportWidth - 12) {
      left = parentRect.right - popoverWidth;
    }
    left = Math.max(12, Math.min(left, viewportWidth - popoverWidth - 12));

    if (placement === 'top') {
      setCoords({
        bottom: viewportHeight - parentRect.top + 4,
        left,
        placement: 'top',
      });
    } else {
      setCoords({
        top: parentRect.bottom + 4,
        left,
        placement: 'bottom',
      });
    }
  };

  useLayoutEffect(() => {
    computePosition();
  }, [editingOption, search]);

  useEffect(() => {
    computePosition();
    const handleScrollOrResize = () => {
      computePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }
      const anchor = anchorRef.current?.parentElement;
      if (anchor && anchor.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.some((opt) => opt.toLowerCase() === search.trim().toLowerCase());

  const handleDragStart = (e: DragEvent<HTMLDivElement>, opt: string) => {
    isDraggingRef.current = true;
    setDraggedItem(opt);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', opt);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, opt: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedItem || draggedItem === opt) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';

    setDragOverItem(opt);
    setDropPosition(pos);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetOpt: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetOpt) {
      handleDragEnd();
      return;
    }

    const fromIndex = options.indexOf(draggedItem);
    const toIndex = options.indexOf(targetOpt);

    if (fromIndex !== -1 && toIndex !== -1) {
      const calculatedIndex =
        dropPosition === 'after'
          ? fromIndex < toIndex
            ? toIndex
            : toIndex + 1
          : fromIndex < toIndex
          ? toIndex - 1
          : toIndex;

      const targetIndex = Math.max(0, Math.min(calculatedIndex, options.length - 1));
      reorderOptions(fromIndex, targetIndex);
    }

    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    setDropPosition(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);
  };

  const handleCreateNew = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    addOption(trimmed);
    onSelect(trimmed);
    onClose();
  };

  const handleSaveRename = () => {
    if (!editingOption) return;
    const trimmed = editName.trim();
    if (!trimmed || trimmed === editingOption) {
      setEditName(editingOption);
      return;
    }
    renameOption(editingOption, trimmed);
    if (currentValue === editingOption) {
      onSelect(trimmed);
    }
    setEditingOption(trimmed);
  };

  const handleDeleteOption = () => {
    if (!editingOption) return;
    removeOption(editingOption);
    if (currentValue === editingOption) {
      onSelect('');
    }
    setEditingOption(null);
  };

  return (
    <>
      <span ref={anchorRef} className="contents pointer-events-none" />
      {coords &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              ...(coords.placement === 'top'
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            className="w-64 max-w-[calc(100vw-24px)] p-2.5 bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl space-y-2.5 animate-in fade-in-50 zoom-in-95 duration-100 text-xs select-none"
          >
      {editingOption ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setEditingOption(null)}
              className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 py-0.5 px-1 -ml-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="font-medium">Back</span>
            </button>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              Edit option
            </span>
            <div className="w-8" />
          </div>

          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveRename();
              }
              if (e.key === 'Escape') {
                setEditingOption(null);
              }
            }}
            onBlur={handleSaveRename}
            autoFocus
            className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-[#282828] border border-blue-500 ring-2 ring-blue-500/20 rounded-lg text-neutral-900 dark:text-neutral-100 outline-hidden font-medium"
          />

          <button
            type="button"
            onClick={handleDeleteOption}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer text-left"
          >
            <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-red-500" />
            <span>Delete</span>
          </button>

          <div className="border-t border-neutral-100 dark:border-neutral-800" />

          <div className="space-y-1">
            <div className="px-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
              Colors
            </div>
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
              {NOTION_COLORS.map((c) => {
                const activeColor = resolveOptionTagClass(editingOption, type);
                const isSelected = activeColor === c.tagClass;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setOptionColor(editingOption, c.tagClass, normalizedType);
                      setTriggerRefresh((n) => n + 1);
                    }}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-md border border-neutral-300/60 dark:border-neutral-600/60 shrink-0 ${c.tagClass}`}
                      />
                      <span>{c.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          {currentValue ? (
            <div className="flex items-center justify-between p-1.5 bg-neutral-100/90 dark:bg-[#2c2c2c] rounded-lg border border-neutral-200 dark:border-neutral-700 min-w-0">
              <TagPill text={currentValue} type={normalizedType} className="min-w-0" />
              <button
                onClick={() => {
                  onSelect('');
                  onClose();
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md cursor-pointer transition-colors shrink-0 ml-1"
                title="Clear value"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search or select an option..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim() && !exactMatch) {
                  e.preventDefault();
                  handleCreateNew();
                }
              }}
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-neutral-50 dark:bg-[#282828] border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500/40"
              autoFocus={typeof window !== 'undefined' ? window.innerWidth >= 768 : false}
            />
          </div>

          <div className="px-1 text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
            Select an option or create one
          </div>

          <div className="max-h-56 overflow-y-auto overflow-x-hidden space-y-1 pr-0.5 scrollbar-thin">
            {filteredOptions.length === 0 && !search.trim() ? (
              <div className="text-center py-4 text-xs text-neutral-400 italic">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt === currentValue;
                const isBeingDragged = draggedItem === opt;
                const isTargetOver = dragOverItem === opt && draggedItem !== opt;
                const isEditing = editingOption === opt;

                return (
                  <div
                    key={opt}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opt)}
                    onDragOver={(e) => handleDragOver(e, opt)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, opt)}
                    onDragEnd={handleDragEnd}
                    className="relative group/opt"
                  >
                    {isTargetOver && dropPosition === 'before' && (
                      <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10 shadow-xs shadow-blue-500/50 animate-pulse pointer-events-none" />
                    )}

                    <div
                      onClick={() => {
                        if (isDraggingRef.current) return;
                        onSelect(opt);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer select-none ${
                        isBeingDragged
                          ? 'opacity-30 bg-blue-50/50 dark:bg-blue-950/20 border border-dashed border-blue-400/60 scale-[0.98]'
                          : isEditing
                          ? 'bg-neutral-100 dark:bg-[#2e2e2e] ring-1 ring-neutral-300 dark:ring-neutral-600'
                          : isSelected
                          ? 'bg-neutral-100 dark:bg-[#2e2e2e] font-medium shadow-2xs'
                          : 'hover:bg-neutral-100/80 dark:hover:bg-[#282828]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
                        <div
                          className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors shrink-0"
                          title="Drag to reorder"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="w-3.5 h-3.5 opacity-70 group-hover/opt:opacity-100" />
                        </div>
                        <TagPill text={opt} type={normalizedType} className="min-w-0" />
                      </div>

                      <div className="flex items-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingOption(opt);
                            setEditName(opt);
                          }}
                          className="btn-more-options p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 opacity-0 group-hover/opt:opacity-100 transition-opacity cursor-pointer"
                          title="Edit option name, color, or delete"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isTargetOver && dropPosition === 'after' && (
                      <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10 shadow-xs shadow-blue-500/50 animate-pulse pointer-events-none" />
                    )}
                  </div>
                );
              })
            )}

            {search.trim() && !exactMatch && (
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors text-left cursor-pointer border border-blue-200/60 dark:border-blue-800/40 mt-1"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Create <strong>"{search.trim()}"</strong>
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>,
    document.body
  )}
</>
);
};
