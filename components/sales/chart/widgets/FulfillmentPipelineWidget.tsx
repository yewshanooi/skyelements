"use client";

import type { FC } from 'react';
import type { FulfillmentPipelineData } from '../chartDataUtils';

interface FulfillmentPipelineWidgetProps {
  data: FulfillmentPipelineData;
}

export const FulfillmentPipelineWidget: FC<FulfillmentPipelineWidgetProps> = ({ data }) => {
  return (
    <div className="space-y-3 min-w-0">
      {/* Top Fulfillment Health KPI */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 min-w-0">
        <div>
          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
            Fulfillment Rate
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-blue-900 dark:text-blue-100">
            {data.completionRate}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-neutral-400">Pending Revenue</div>
          <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
            RM {data.pendingRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Order Status Bars */}
      <div className="space-y-2">
        <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
          Order Delivery Status
        </div>
        {data.orderStatuses.map((os) => {
          const color =
            os.status === 'Delivered'
              ? 'bg-emerald-500'
              : os.status === 'Shipped'
              ? 'bg-blue-500'
              : 'bg-amber-500';

          return (
            <div key={os.status} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{os.status}</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {os.count} ({os.pct}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${color}`}
                  style={{ width: `${Math.min(100, os.pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
