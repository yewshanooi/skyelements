"use client";

import type { FC } from 'react';
import type { WidgetWidth } from '@/sales/types/chart';
import type { TopProductPoint } from '@/sales/lib/chartUtils';

interface TopItemsWidgetProps {
  data: TopProductPoint[];
  currentWidth?: WidgetWidth;
  isModal?: boolean;
}

export const TopItemsWidget: FC<TopItemsWidgetProps> = ({
  data,
  currentWidth = '4/4',
  isModal = false,
}) => {
  const isTwoColumn = currentWidth === '4/4' || isModal;
  const layoutClass = isTwoColumn
    ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5'
    : 'space-y-2';

  const itemsToDisplay = isModal ? data.slice(0, 30) : data.slice(0, 10);

  return (
    <div className="space-y-3 min-w-0">
      <div className={`${layoutClass} ${isModal ? '' : 'max-h-[360px] overflow-y-auto pr-1 pb-3'}`}>
        {itemsToDisplay.map((item, idx) => {
          const rankBadgeClass =
            idx === 0
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              : idx === 1
              ? 'bg-slate-400/15 text-slate-600 dark:text-slate-300 border border-slate-400/30'
              : idx === 2
              ? 'bg-amber-700/15 text-amber-700 dark:text-amber-500 border border-amber-700/30'
              : 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';

          return (
            <div
              key={item.item}
              className="p-2.5 sm:p-3 rounded-xl bg-neutral-50/70 dark:bg-[#252525]/60 border border-neutral-200/70 dark:border-neutral-800/80 flex items-center justify-between gap-2.5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${rankBadgeClass}`}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate"
                    title={item.item}
                  >
                    {item.item}
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 truncate">
                    <span className="shrink-0">
                      {item.units} {item.units === 1 ? 'item' : 'items'}
                    </span>
                    <span>•</span>
                    <span className="truncate">{item.category}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  RM {item.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {item.margin}% margin
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
