"use client";

import type { FC } from 'react';
import type { FulfillmentPipelineData, StatusBreakdownPoint } from '@/sales/lib/chartUtils';
import { useOptionsStore } from '@/sales/context/OptionsContext';
import { getTagColorHex, type OptionType } from '@/sales/lib/optionTypes';
import type { WidgetWidth } from '@/sales/types/chart';

interface FulfillmentPipelineWidgetProps {
  data: FulfillmentPipelineData;
  currentWidth?: WidgetWidth;
  isModal?: boolean;
}

const StatusCards: FC<{ title: string; type: OptionType; rows: StatusBreakdownPoint[] }> = ({
  title,
  type,
  rows,
}) => {
  const { getOptionColor } = useOptionsStore();

  return (
    <section className="space-y-2.5 min-w-0">
      <h3 className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
        {title}
      </h3>
      {rows.length === 0 ? (
        <div className="text-xs text-neutral-400 italic">
          No {title.toLowerCase()} options yet. Create them in the table.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const color = row.isUnset ? '#cbd5e1' : getTagColorHex(getOptionColor(type, row.status));

            return (
              <div
                key={row.status}
                className="p-2.5 rounded-xl bg-neutral-50/70 dark:bg-[#252525]/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5 min-w-0 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate flex-1 min-w-0" title={row.status}>
                    {row.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 shrink-0">
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
          })}
        </div>
      )}
    </section>
  );
};

export const FulfillmentPipelineWidget: FC<FulfillmentPipelineWidgetProps> = ({
  data,
  currentWidth = '1/4',
  isModal = false,
}) => {
  const isTwoColumn = currentWidth === '4/4' || isModal;

  return (
    <div className={`min-w-0 ${isTwoColumn ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'} ${isModal ? '' : 'max-h-105 overflow-y-auto pr-1 pb-3'}`}>
      <StatusCards title="Order Status" type="order_status" rows={data.orderStatuses} />
      <StatusCards title="Payment Status" type="payment_status" rows={data.paymentStatuses} />
    </div>
  );
};
