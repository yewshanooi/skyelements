"use client";

import type { FC } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { WidgetWidth } from '@/sales/types/chart';
import type { DayOfWeekPoint } from '@/sales/lib/chartUtils';
import { ChartTooltipCard, ChartTooltipRow } from '../ChartTooltip';

interface DayOfWeekWidgetProps {
  data: DayOfWeekPoint[];
  currentWidth?: WidgetWidth;
  isModal?: boolean;
}

export const DayOfWeekWidget: FC<DayOfWeekWidgetProps> = ({
  data,
  currentWidth = '2/4',
  isModal = false,
}) => {
  const dayHeight = isModal ? 'h-[280px] sm:h-[340px]' : currentWidth === '1/4' ? 'h-[180px]' : 'h-[220px]';

  return (
    <div className="w-full min-w-0">

      <div className={`w-full ${dayHeight}`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis dataKey="day" stroke="#888888" fontSize={9} tickLine={false} tickFormatter={(v) => v.slice(0, 3)} />
            <YAxis
              stroke="#888888"
              fontSize={9}
              tickLine={false}
              width={34}
              tickFormatter={(v) => (v >= 1000 ? `RM ${(v / 1000).toFixed(0)}k` : `RM ${v}`)}
            />
            <Tooltip
              cursor={{ fill: 'rgba(128, 128, 128, 0.08)' }}
              isAnimationActive={false}
              animationDuration={0}
              wrapperStyle={{ transition: 'none', pointerEvents: 'none' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as DayOfWeekPoint;
                  return (
                    <ChartTooltipCard title={d.fullDay} minWidthClass="min-w-[200px]">
                      <ChartTooltipRow
                        label="Net Profit"
                        colorDot="#10b981"
                        value={`RM ${d.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        valueClass="font-mono font-bold text-neutral-800 dark:text-neutral-200"
                      />
                      <ChartTooltipRow
                        label="Orders"
                        value={d.orders}
                        valueClass="font-mono font-bold text-neutral-800 dark:text-neutral-200"
                      />
                      <ChartTooltipRow
                        label="Avg / Order"
                        value={`RM ${d.orders > 0 ? (d.profit / d.orders).toFixed(2) : '0.00'}`}
                        valueClass="font-mono font-medium text-neutral-700 dark:text-neutral-300"
                      />
                    </ChartTooltipCard>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
