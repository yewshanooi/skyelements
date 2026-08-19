"use client";

import type { FC } from 'react';
import type { TopCustomerPoint } from '../chartDataUtils';

interface TopCustomersWidgetProps {
  data: TopCustomerPoint[];
  isModal?: boolean;
}

export const TopCustomersWidget: FC<TopCustomersWidgetProps> = ({ data, isModal = false }) => {
  return (
    <div className={`space-y-2 ${isModal ? '' : 'max-h-[340px] overflow-y-auto pr-1 pb-3'} min-w-0`}>
      {data.map((cust, idx) => (
        <div
          key={cust.customer}
          className="p-2.5 sm:p-3 rounded-xl bg-neutral-50/70 dark:bg-[#252525]/60 border border-neutral-200/70 dark:border-neutral-800/80 flex items-center justify-between gap-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-[10px] sm:text-[11px] shrink-0">
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate" title={cust.customer}>
                {cust.customer}
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-400 flex items-center gap-1.5 truncate">
                <span className="shrink-0">{cust.orders} {cust.orders === 1 ? 'order' : 'orders'}</span>
                <span>•</span>
                <span className="truncate">{cust.topCategory}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
              RM {cust.totalRevenue.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              +RM {cust.totalProfit.toFixed(2)} profit
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
