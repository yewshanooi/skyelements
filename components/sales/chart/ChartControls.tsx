"use client";

import type { FC, ReactNode, DragEvent as ReactDragEvent } from 'react';
import {
  GripVertical,
  Maximize2,
  X,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import type { WidgetConfig } from './chartTypes';

// =========================================================================
// 1. Segmented Control / Button Pill Group
// =========================================================================
export interface SegmentOption<T extends string> {
  value: T;
  label?: string;
}

interface SegmentedControlProps<T extends string> {
  options: Array<T | SegmentOption<T>>;
  value: T;
  onChange: (val: T) => void;
  accent?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accent = false,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-lg p-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
      {options.map((opt) => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label || opt.value;
        const isActive = value === optValue;

        const activeClass = accent
          ? 'bg-[#2383e2] text-white font-semibold shadow-2xs'
          : 'bg-white dark:bg-[#181818] text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold';

        const inactiveClass = 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200';

        return (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium capitalize transition-all cursor-pointer ${
              isActive ? activeClass : inactiveClass
            }`}
          >
            {optLabel}
          </button>
        );
      })}
    </div>
  );
}

// =========================================================================
// 2. Widget Card Header Component
// =========================================================================
interface WidgetHeaderProps {
  widget: WidgetConfig;
  onExpand?: () => void;
  onDragStart?: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: ReactDragEvent<HTMLDivElement>) => void;
  children?: ReactNode;
}

export const WidgetHeader: FC<WidgetHeaderProps> = ({
  widget,
  onExpand,
  onDragStart,
  onDragEnd,
  children,
}) => {
  const Icon = widget.icon;

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 pb-3 mb-3.5 sm:mb-4 border-b border-neutral-100 dark:border-neutral-800/80 select-none">
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="hidden sm:block p-1 rounded-md transition-colors cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0"
          title="Drag :: to reorder widget"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 truncate" title={widget.title}>
            {widget.title}
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {children}

        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="p-1 sm:p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            title="Expand to Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 3. Fullscreen Chart Expand Modal
// =========================================================================
interface ChartModalProps {
  widget: WidgetConfig | null;
  isOpen: boolean;
  onClose: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
}

export const ChartModal: FC<ChartModalProps> = ({
  widget,
  isOpen,
  onClose,
  headerActions,
  children,
}) => {
  if (!isOpen || !widget) return null;

  const Icon = widget.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1a1a1a] rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {widget.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-400 truncate">
                {widget.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close Fullscreen View"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. Customize Cards / Widgets Manager Modal
// =========================================================================
interface CustomizeWidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allWidgets: WidgetConfig[];
  hiddenWidgets: Record<string, boolean>;
  onToggleWidget: (widgetId: string) => void;
  onApplyPreset: (presetKey: string) => void;
  onResetLayout: () => void;
}

const PRESETS = [
  {
    key: 'all',
    name: 'Full Overview',
    desc: 'Complete dashboard with all 11 cards.',
    badge: 'Default',
  },
  {
    key: 'executive',
    name: 'Executive Summary',
    desc: 'Key metrics, trends, and top orders.',
  },
  {
    key: 'operations',
    name: 'Operations & Channels',
    desc: 'Store metrics, orders, and payments.',
  },
  {
    key: 'customer_mix',
    name: 'Customers & Basket Size',
    desc: 'Top buyers, order tiers, and sales mix.',
  },
];

export const CustomizeWidgetsModal: FC<CustomizeWidgetsModalProps> = ({
  isOpen,
  onClose,
  allWidgets,
  hiddenWidgets,
  onToggleWidget,
  onApplyPreset,
  onResetLayout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1a1a1a] rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-2xl max-h-[94vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Manage Cards
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-5 sm:space-y-6 flex-1">
          {/* Quick Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Layout Presets
              </span>
              <button
                type="button"
                onClick={onResetLayout}
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-2 py-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Default</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => onApplyPreset(preset.key)}
                  className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#202020]/70 hover:bg-white dark:hover:bg-[#252525] hover:border-blue-500/40 text-left transition-all group cursor-pointer shadow-2xs flex flex-col justify-between h-[60px]"
                >
                  <div className="flex items-center justify-between h-5">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {preset.name}
                    </span>
                    {preset.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        {preset.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight truncate">
                    {preset.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Widget Catalog List */}
          <div className="space-y-2.5 pt-5.5 border-t border-neutral-200/80 dark:border-neutral-800">
            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              All Cards
            </div>

            <div className="space-y-2.5">
              {allWidgets.map((w) => {
                const Icon = w.icon;
                const isVisible = !hiddenWidgets[w.id];

                return (
                  <div
                    key={w.id}
                    onClick={() => onToggleWidget(w.id)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isVisible
                        ? 'bg-white dark:bg-[#202020] border-neutral-200 dark:border-neutral-700 shadow-2xs'
                        : 'bg-neutral-50/50 dark:bg-neutral-900/30 border-neutral-200/50 dark:border-neutral-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isVisible
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                            {w.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {w.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <div
                        className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                          isVisible ? 'bg-[#2383e2]' : 'bg-neutral-300 dark:bg-neutral-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform transform shadow-xs ${
                            isVisible ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
