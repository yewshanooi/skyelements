"use client";

import type { FC } from 'react';
import type { StoreComparisonPoint } from '../chartDataUtils';

interface StoreComparisonWidgetProps {
  data: StoreComparisonPoint[];
}

export const StoreComparisonWidget: FC<StoreComparisonWidgetProps> = ({ data }) => {
  return (
    <div className="space-y-3 min-w-0">
      {data.map((store) => {
        const isShopee = store.name.toLowerCase().includes('shopee');
        const accentColor = isShopee ? '#f97316' : '#ef4444';

        return (
          <div
            key={store.name}
            className="p-3 sm:p-3.5 rounded-xl bg-neutral-50/80 dark:bg-[#252525]/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-2 min-w-0"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                  {store.name}
                </span>
                <span className="text-[10px] sm:text-[11px] text-neutral-400 truncate shrink-0">
                  ({store.orders} orders)
                </span>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  RM {store.profit.toFixed(2)}
                </div>
                <div className="text-[9px] sm:text-[10px] text-neutral-400">
                  Rev: RM {store.revenue.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Progress Bar of Profit Share */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, store.profitShare))}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-neutral-400">
                <span>{store.profitShare}% profit share</span>
                <span>Margin: {store.margin}%</span>
                <span>AOV: RM {store.aov.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
