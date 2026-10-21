"use client";

import type { FC } from 'react';
import type { FulfillmentPipelineData, StatusBreakdownPoint } from '@/sales/lib/chartUtils';
import { useOptionsStore } from '@/sales/context/OptionsContext';
import { getTagColorHex, type OptionType } from '@/sales/lib/optionTypes';

interface FulfillmentPipelineWidgetProps {
  data: FulfillmentPipelineData;
}

const StatusBars: FC<{ title: string; type: OptionType; rows: StatusBreakdownPoint[] }> = ({
  title,
  type,
  rows,
}) => {
  const { getOptionColor } = useOptionsStore();

  return (
    <div className="space-y-2">
      <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-neutral-400 italic">
          No {title.toLowerCase()} options yet. Create them in the table.
        </div>
      ) : (
        rows.map((row) => {
          const color = row.isUnset ? '#cbd5e1' : getTagColorHex(getOptionColor(type, row.status));

          return (
            <div key={row.status} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{row.status}</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {row.count} ({row.pct}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, row.pct)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export const FulfillmentPipelineWidget: FC<FulfillmentPipelineWidgetProps> = ({ data }) => {
  return (
    <div className="space-y-4 min-w-0">
      <StatusBars title="Order Status" type="order_status" rows={data.orderStatuses} />
      <StatusBars title="Payment Status" type="payment_status" rows={data.paymentStatuses} />
    </div>
  );
};
