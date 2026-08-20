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
import type { WidgetWidth } from '../chartTypes';
import type { CategoryMatrixPoint } from '../chartDataUtils';
import { SegmentedControl } from '../ChartControls';

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
  const heightClass = isModal ? 'h-[450px]' : currentWidth === '1/4' ? 'h-[260px]' : 'h-[280px]';
  const yAxisWidth = currentWidth === '1/4' ? 65 : 85;

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
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 15, left: currentWidth === '1/4' ? -10 : 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis type="number" stroke="#888888" fontSize={10} tickFormatter={(v) => v >= 1000 ? `RM ${(v/1000).toFixed(0)}k` : `RM ${v}`} />
            <YAxis
              dataKey="category"
              type="category"
              stroke="#888888"
              fontSize={10}
              width={yAxisWidth}
              tickLine={false}
              tickFormatter={(v) => (currentWidth === '1/4' && v.length > 8 ? `${v.slice(0, 7)}...` : v)}
            />
            <Tooltip
              isAnimationActive={false}
              animationDuration={0}
              wrapperStyle={{ transition: 'none', pointerEvents: 'none' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as CategoryMatrixPoint;
                  return (
                    <div className="p-3 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-xl text-xs space-y-1.5">
                      <p className="font-bold text-neutral-900 dark:text-neutral-100">{d.category}</p>
                      <div className="space-y-0.5">
                        <div className="flex justify-between gap-4 text-blue-600 dark:text-blue-400">
                          <span>Gross Revenue:</span>
                          <span className="font-mono font-bold">RM {d.revenue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                          <span>Net Profit:</span>
                          <span className="font-mono font-bold">RM {d.profit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-amber-600 dark:text-amber-400">
                          <span>Margin:</span>
                          <span className="font-mono font-bold">{d.margin}%</span>
                        </div>
                        <div className="flex justify-between gap-4 text-neutral-400 text-[11px] pt-1 border-t border-neutral-200 dark:border-neutral-800">
                          <span>Orders:</span>
                          <span>{d.orders} orders ({d.quantity} items)</span>
                        </div>
                      </div>
                    </div>
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
