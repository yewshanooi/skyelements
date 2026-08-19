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
import type { WidgetWidth } from '../chartTypes';
import type { DayOfWeekPoint } from '../chartDataUtils';

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
  const dayHeight = isModal ? 'h-[360px]' : currentWidth === '1/4' ? 'h-[190px]' : 'h-[220px]';

  return (
    <div className="space-y-3 min-w-0">
      <div className={`w-full ${dayHeight}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis dataKey="day" stroke="#888888" fontSize={10} tickLine={false} tickFormatter={(v) => v.slice(0, 3)} />
            <YAxis stroke="#888888" fontSize={10} tickLine={false} width={35} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as DayOfWeekPoint;
                  return (
                    <div className="p-2.5 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-xl text-xs space-y-1">
                      <p className="font-bold text-neutral-900 dark:text-neutral-100">{d.fullDay}</p>
                      <p className="text-blue-600 dark:text-blue-400 font-mono">
                        Revenue: RM {d.revenue.toFixed(2)}
                      </p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-mono">
                        Profit: RM {d.profit.toFixed(2)} ({d.orders} orders)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
