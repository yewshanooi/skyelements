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
import type { WidgetWidth } from '../chartTypes';
import type { BasketTierPoint } from '../chartDataUtils';

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
  const basketHeight = isModal ? 'h-[360px]' : currentWidth === '1/4' ? 'h-[170px]' : 'h-[200px]';
  const basketGridCols =
    currentWidth === '1/4'
      ? 'grid grid-cols-2 sm:grid-cols-3 gap-1.5'
      : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2';

  return (
    <div className="space-y-3 min-w-0">
      <div className={`w-full ${basketHeight}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis dataKey="key" stroke="#888888" fontSize={9} tickLine={false} interval={0} />
            <YAxis stroke="#888888" fontSize={10} tickLine={false} width={30} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as BasketTierPoint;
                  return (
                    <div className="p-2.5 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-xl text-xs space-y-1">
                      <p className="font-bold text-neutral-900 dark:text-neutral-100">{d.key}</p>
                      <p className="text-blue-600 dark:text-blue-400">
                        Orders: <span className="font-bold font-mono">{d.count} ({d.pctOrders}%)</span>
                      </p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-mono">
                        Revenue: RM {d.revenue.toFixed(2)} ({d.pctRevenue}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" name="Order Count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={`${basketGridCols} pt-1 border-t border-neutral-200/60 dark:border-neutral-800`}>
        {data.map((t) => (
          <div key={t.key} className="text-center p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 min-w-0">
            <div className="text-[10px] text-neutral-400 truncate" title={t.key}>{t.key}</div>
            <div className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200 truncate">
              {t.count} ({t.pctOrders}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
