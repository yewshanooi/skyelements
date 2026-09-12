"use client";

import type { FC } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { WidgetWidth } from '@/sales/types/chart';
import type { BasketTierPoint } from '@/sales/lib/chartUtils';
import { ChartTooltipCard, ChartTooltipRow } from '../ChartTooltip';

interface BasketTiersWidgetProps {
  data: BasketTierPoint[];
  currentWidth?: WidgetWidth;
  isModal?: boolean;
}

export const BasketTiersWidget: FC<BasketTiersWidgetProps> = ({
  data,
  currentWidth = '2/4',
  isModal = false,
}) => {
  const basketHeight = isModal ? 'h-[280px] sm:h-[340px]' : currentWidth === '1/4' ? 'h-[180px]' : 'h-[220px]';

  return (
    <div className="w-full min-w-0">
      <div className={`w-full ${basketHeight}`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis dataKey="key" stroke="#888888" fontSize={9} tickLine={false} interval={0} />
            <YAxis stroke="#888888" fontSize={9} tickLine={false} width={26} />
            <Tooltip
              cursor={{ fill: 'rgba(128, 128, 128, 0.08)' }}
              isAnimationActive={false}
              animationDuration={0}
              wrapperStyle={{ transition: 'none', pointerEvents: 'none' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as BasketTierPoint;
                  return (
                    <ChartTooltipCard title={d.key} minWidthClass="min-w-[190px]">
                      <ChartTooltipRow
                        label="Orders"
                        colorDot={d.color}
                        value={`${d.count} ${d.count === 1 ? 'order' : 'orders'}`}
                        valueClass="font-mono font-bold text-neutral-800 dark:text-neutral-200"
                      />
                      <ChartTooltipRow
                        label="Share"
                        value={`${d.pctOrders}%`}
                        valueClass="font-mono font-medium text-neutral-700 dark:text-neutral-300"
                      />
                    </ChartTooltipCard>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
