"use client";

import type { FC } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, type PieLabelRenderProps } from 'recharts';
import type { WidgetWidth } from '../chartTypes';
import { CHART_PALETTE } from '../chartTypes';
import type { DonutDataPoint } from '../chartDataUtils';
import { SegmentedControl } from '../ChartControls';

interface SalesDonutWidgetProps {
  data: DonutDataPoint[];
  totalSales: number;
  breakdown: 'items' | 'categories' | 'marketplace' | 'payment';
  onBreakdownChange: (b: 'items' | 'categories' | 'marketplace' | 'payment') => void;
  currentWidth?: WidgetWidth;
  isModal?: boolean;
}

const renderCustomDonutLabel = (props: PieLabelRenderProps) => {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, name = '', value = 0 } = props;
  const RADIAN = Math.PI / 180;
  const radius = Number(outerRadius) + 26;
  const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
  const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);
  const isRight = x > Number(cx);

  if (Number(percent) < 0.022) return null;

  const displayName = String(name).length > 22 ? `${String(name).substring(0, 20)}...` : String(name);

  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={isRight ? 'start' : 'end'}
      dominantBaseline="central"
      pointerEvents="none"
      className="text-[11px] font-sans fill-neutral-600 dark:fill-neutral-300 pointer-events-none select-none"
    >
      {`${displayName} RM ${value} (${(Number(percent) * 100).toFixed(1)}%)`}
    </text>
  );
};

const BREAKDOWN_OPTIONS = [
  { value: 'items' as const, label: 'Orders' },
  { value: 'categories' as const, label: 'Categories' },
  { value: 'marketplace' as const, label: 'Store' },
  { value: 'payment' as const, label: 'Payment' },
];

export const SalesDonutWidget: FC<SalesDonutWidgetProps> = ({
  data,
  totalSales,
  breakdown,
  onBreakdownChange,
  currentWidth = '2/4',
  isModal = false,
}) => {
  const isMobileScreen = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  const innerRadius = isModal ? (isMobileScreen ? 60 : 100) : currentWidth === '1/4' ? 48 : currentWidth === '2/4' ? 62 : 78;
  const outerRadius = isModal ? (isMobileScreen ? 88 : 140) : currentWidth === '1/4' ? 70 : currentWidth === '2/4' ? 90 : 110;
  const heightClass = isModal ? 'h-[250px] sm:h-[380px]' : currentWidth === '1/4' ? 'h-[240px]' : 'h-[280px]';

  const centerTextClass = isModal
    ? 'text-base sm:text-2xl font-extrabold'
    : currentWidth === '1/4'
    ? 'text-xs sm:text-sm font-bold'
    : currentWidth === '2/4'
    ? 'text-sm sm:text-base font-bold'
    : 'text-lg font-extrabold';

  const legendItems = isModal ? data : data.slice(0, 6);

  return (
    <div className={`min-w-0 ${isModal ? 'space-y-1 sm:space-y-1' : 'space-y-3'}`}>
      {/* Category Toggles */}
      <div className={`flex flex-wrap items-center justify-between gap-1.5 text-xs ${isModal ? '-mt-1 sm:-mt-2' : ''}`}>
        <span className="text-neutral-400 text-[11px]">Dimension:</span>
        <SegmentedControl
          options={BREAKDOWN_OPTIONS}
          value={breakdown}
          onChange={onBreakdownChange}
        />
      </div>

      {/* Donut Chart with Center Display */}
      <div className="relative flex flex-col items-center justify-center">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 px-2 text-center">
          <span
            className={`${centerTextClass} font-mono tracking-tight text-neutral-900 dark:text-neutral-100 truncate max-w-[100px] sm:max-w-[160px] leading-tight`}
            title={`RM ${totalSales.toFixed(2)}`}
          >
            RM {totalSales.toFixed(2)}
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Total Sales Profit
          </span>
        </div>

        <div className={`relative z-10 w-full ${heightClass}`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Tooltip
                isAnimationActive={false}
                animationDuration={0}
                wrapperStyle={{ transition: 'none', pointerEvents: 'none' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0];
                    const pct = totalSales > 0 ? ((Number(d.value) / totalSales) * 100).toFixed(1) : '0';
                    return (
                      <div className="p-3 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-xl text-xs space-y-1">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {d.name}
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          RM {Number(d.value).toFixed(2)} ({pct}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                dataKey="value"
                label={isModal && !isMobileScreen ? renderCustomDonutLabel : false}
                animationDuration={800}
              >
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                    stroke="transparent"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick legend pills */}
      <div className={`flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto pt-1 scrollbar-thin`}>
        {legendItems.map((entry, idx) => (
          <div
            key={entry.name}
            className="px-2 py-0.5 rounded-md text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 min-w-0"
            title={entry.name}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
            />
            <span className="truncate max-w-[100px] sm:max-w-[140px]">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
