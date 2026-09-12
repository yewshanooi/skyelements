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
  Legend,
} from 'recharts';
import type { WidgetWidth } from '@/sales/types/chart';
import type { CategoryMatrixPoint } from '@/sales/lib/chartUtils';
import { SegmentedControl } from '../ChartControls';
import { ChartTooltipCard, ChartTooltipRow, ChartTooltipDivider } from '../ChartTooltip';

interface CategoryProfitabilityWidgetProps {
  data: CategoryMatrixPoint[];
  sortBy: 'revenue' | 'profit' | 'margin';
  onSortByChange: (s: 'revenue' | 'profit' | 'margin') => void;
  currentWidth?: WidgetWidth;
  isModal?: boolean;
}

export const CategoryProfitabilityWidget: FC<CategoryProfitabilityWidgetProps> = ({
  data,
  sortBy,
  onSortByChange,
  currentWidth = '2/4',
  isModal = false,
}) => {
  const heightClass = isModal ? 'h-[280px] sm:h-[380px]' : currentWidth === '1/4' ? 'h-[230px]' : 'h-[270px]';
  const yAxisWidth = currentWidth === '1/4' ? 65 : 80;

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <span className="text-neutral-400 text-[11px]">Sort by:</span>
        <SegmentedControl
          options={['revenue', 'profit', 'margin'] as const}
          value={sortBy}
          onChange={onSortByChange}
        />
      </div>

      <div className={`w-full ${heightClass}`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 15, left: currentWidth === '1/4' ? -10 : 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis type="number" stroke="#888888" fontSize={9} tickFormatter={(v) => v >= 1000 ? `RM ${(v/1000).toFixed(0)}k` : `RM ${v}`} />
            <YAxis
              dataKey="category"
              type="category"
              stroke="#888888"
              fontSize={9}
              width={yAxisWidth}
              tickLine={false}
              tickFormatter={(v) => (currentWidth === '1/4' && v.length > 8 ? `${v.slice(0, 7)}...` : v)}
            />
            <Tooltip
              cursor={{ fill: 'rgba(128, 128, 128, 0.08)' }}
              isAnimationActive={false}
              animationDuration={0}
              wrapperStyle={{ transition: 'none', pointerEvents: 'none' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as CategoryMatrixPoint;
                  return (
                    <ChartTooltipCard title={d.category} minWidthClass="min-w-[210px]">
                      <ChartTooltipRow
                        label="Gross Revenue"
                        colorDot="#3b82f6"
                        value={`RM ${d.revenue.toFixed(2)}`}
                        valueClass="font-mono font-bold text-neutral-800 dark:text-neutral-200"
                      />
                      <ChartTooltipRow
                        label="Net Profit"
                        colorDot="#10b981"
                        value={`RM ${d.profit.toFixed(2)}`}
                        valueClass="font-mono font-bold text-neutral-800 dark:text-neutral-200"
                      />
                      <ChartTooltipRow
                        label="Margin"
                        value={`${d.margin}%`}
                        valueClass="font-mono font-bold text-neutral-800 dark:text-neutral-200"
                      />
                      <ChartTooltipDivider />
                      <ChartTooltipRow
                        label="Orders"
                        value={d.orders}
                        valueClass="font-mono font-medium text-neutral-700 dark:text-neutral-300"
                      />
                      <ChartTooltipRow
                        label="Items"
                        value={d.quantity}
                        valueClass="font-mono font-medium text-neutral-700 dark:text-neutral-300"
                      />
                    </ChartTooltipCard>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
            <Bar dataKey="revenue" name="Gross Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
