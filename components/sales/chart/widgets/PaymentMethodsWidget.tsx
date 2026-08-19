"use client";

import type { FC } from 'react';
import { CHART_PALETTE } from '../chartTypes';
import type { PaymentMethodPoint } from '../chartDataUtils';

interface PaymentMethodsWidgetProps {
  data: PaymentMethodPoint[];
  isModal?: boolean;
}

export const PaymentMethodsWidget: FC<PaymentMethodsWidgetProps> = ({ data, isModal = false }) => {
  return (
    <div className={`space-y-2 ${isModal ? '' : 'max-h-[300px] overflow-y-auto pr-1 pb-3'} min-w-0`}>
      {data.map((item, idx) => (
        <div
          key={item.method}
          className="p-2.5 rounded-lg bg-neutral-50/70 dark:bg-[#252525]/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5 min-w-0"
        >
          <div className="flex items-center justify-between text-xs gap-2 min-w-0">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate flex-1 min-w-0" title={item.method}>
              {item.method}
            </span>
            <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 shrink-0">
              RM {item.revenue.toFixed(2)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, item.sharePct)}%`,
                backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length],
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 gap-1 min-w-0">
            <span className="truncate">{item.count} orders ({item.sharePct}%)</span>
            <span className="shrink-0">Avg: RM {item.avgTicket.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
