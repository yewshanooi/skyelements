"use client";

import type { FC } from 'react';
import type { WidgetWidth } from '../chartTypes';
import { CHART_PALETTE } from '../chartTypes';
import type { TopProductPoint } from '../chartDataUtils';

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
  const topProductsGrid =
    currentWidth === '1/4'
      ? 'grid grid-cols-1 gap-2.5'
      : currentWidth === '2/4'
      ? 'grid grid-cols-1 xl:grid-cols-2 gap-2.5'
      : 'grid grid-cols-1 md:grid-cols-2 gap-3';

  const itemsToDisplay = isModal ? data.slice(0, 50) : data.slice(0, 10);

  return (
    <div className="space-y-3 min-w-0">
      <div className={`${topProductsGrid} ${isModal ? '' : 'max-h-[380px] overflow-y-auto pr-1 pb-3'}`}>
        {itemsToDisplay.map((item, idx) => (
          <div
            key={item.item}
            className="p-3 rounded-xl bg-neutral-50/70 dark:bg-[#252525]/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-2 min-w-0"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {idx + 1}
                </span>
                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate flex-1 min-w-0" title={item.item}>
                  {item.item}
                </span>
              </div>

              <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 shrink-0 whitespace-nowrap">
                RM {item.profit.toFixed(2)}
              </span>
            </div>

            <div className="w-full h-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, item.profitShare))}%`,
                  backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length],
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-neutral-400 min-w-0">
              <span className="truncate min-w-0 flex-1">{item.category}</span>
              <span className="shrink-0 whitespace-nowrap">{item.units} item(s)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0 whitespace-nowrap">
                Margin: {item.margin}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
