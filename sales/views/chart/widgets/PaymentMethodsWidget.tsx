"use client";

import type { FC } from 'react';
import { CHART_PALETTE, type WidgetWidth } from '@/sales/types/chart';
import type { PaymentMethodPoint } from '@/sales/lib/chartUtils';

interface PaymentMethodsWidgetProps {
  data: PaymentMethodPoint[];
  currentWidth?: WidgetWidth;
  isModal?: boolean;
}

export const PaymentMethodsWidget: FC<PaymentMethodsWidgetProps> = ({
  data,
  currentWidth = '1/4',
  isModal = false,
}) => {
  const isTwoColumn = currentWidth === '4/4' || isModal;
  const layoutClass = isTwoColumn
    ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5'
    : 'space-y-2';

  const itemsToDisplay = isModal ? data.slice(0, 30) : data;

  return (
    <div className="space-y-3 min-w-0">
      <div className={`${layoutClass} ${isModal ? '' : 'max-h-[300px] overflow-y-auto pr-1 pb-3'}`}>
        {itemsToDisplay.map((item, idx) => (
          <div
            key={item.method}
            className="p-2.5 rounded-xl bg-neutral-50/70 dark:bg-[#252525]/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5 min-w-0 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center justify-between text-xs gap-2 min-w-0">
              <span
                className="font-semibold text-neutral-900 dark:text-neutral-100 truncate flex-1 min-w-0"
                title={item.method}
              >
                {item.method}
              </span>
              <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 shrink-0">
                RM {item.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, item.profitShare)}%`,
                  backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length],
                }}
              />
            </div>
            <div className="text-[11px] text-neutral-400">
              {item.count} {item.count === 1 ? 'order' : 'orders'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
