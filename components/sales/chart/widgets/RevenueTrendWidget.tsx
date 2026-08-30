"use client";

import type { FC } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { WidgetWidth } from '../chartTypes';
import type { TrendDataPoint } from '../chartDataUtils';
import { SegmentedControl } from '../ChartControls';

interface RevenueTrendWidgetProps {
  data: TrendDataPoint[];
  granularity: 'daily' | 'weekly' | 'monthly';
  onGranularityChange: (g: 'daily' | 'weekly' | 'monthly') => void;
  chartType: 'area' | 'bar' | 'line';
  onChartTypeChange: (t: 'area' | 'bar' | 'line') => void;
  metric: 'all' | 'profit' | 'revenue' | 'cumulative';
  onMetricChange: (m: 'all' | 'profit' | 'revenue' | 'cumulative') => void;
  currentWidth?: WidgetWidth;
  isModal?: boolean;
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
  stroke?: string;
}

const TrendTooltipContent = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-xl text-xs space-y-1.5 min-w-[170px]">
        <p className="font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200/60 dark:border-neutral-800 pb-1">
          {label}
        </p>
        {payload.map((entry, i) => {
          const color = entry.color || entry.fill || entry.stroke || '#888888';
          const numVal = typeof entry.value === 'number' ? entry.value : Number(entry.value) || 0;
          return (
            <div key={i} className="flex justify-between items-center gap-3">
              <span style={{ color }} className="font-medium">
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                RM {numVal.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export const RevenueTrendWidget: FC<RevenueTrendWidgetProps> = ({
  data,
  granularity,
  onGranularityChange,
  chartType,
  onChartTypeChange,
  metric,
  onMetricChange,
  currentWidth = '2/4',
  isModal = false,
}) => {
  const heightClass = isModal ? 'h-[250px] sm:h-[380px]' : currentWidth === '1/4' ? 'h-[220px]' : 'h-[280px]';
  const yAxisWidth = currentWidth === '1/4' ? 32 : 36;
  const leftMargin = currentWidth === '1/4' ? -10 : 0;

  const showRevenue = metric === 'all' || metric === 'revenue';
  const showProfit = metric === 'all' || metric === 'profit';
  const showCost = metric === 'all';
  const showCumulative = metric === 'cumulative';

  const metricOptions = [
    { value: 'all' as const, label: currentWidth === '1/4' ? 'All' : 'All Metrics' },
    { value: 'profit' as const },
    { value: 'revenue' as const },
    { value: 'cumulative' as const },
  ];

  return (
    <div className="space-y-3.5 min-w-0">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-neutral-400 font-medium text-[11px] shrink-0">Granularity:</span>
          <SegmentedControl
            options={['daily', 'weekly', 'monthly'] as const}
            value={granularity}
            onChange={onGranularityChange}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <SegmentedControl
            options={metricOptions}
            value={metric}
            onChange={onMetricChange}
            accent
          />
          <SegmentedControl
            options={['area', 'bar', 'line'] as const}
            value={chartType}
            onChange={onChartTypeChange}
          />
        </div>
      </div>

      {/* Chart Container */}
      <div className={`w-full ${heightClass}`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 15, left: leftMargin, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
              <XAxis dataKey="label" stroke="#888888" fontSize={10} tickLine={false} minTickGap={10} />
              <YAxis stroke="#888888" fontSize={10} tickLine={false} width={yAxisWidth} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                cursor={{ stroke: '#888888', strokeWidth: 1, opacity: 0.4 }}
                isAnimationActive={false}
                animationDuration={0}
                wrapperStyle={{ transition: 'none', pointerEvents: 'none' }}
                content={<TrendTooltipContent />}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              {showRevenue && <Area type="monotone" dataKey="subtotal" name="Gross Revenue" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} />}
              {showProfit && <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" fill="url(#colorProfit)" strokeWidth={2} />}
              {showCost && <Area type="monotone" dataKey="cost" name="Total Cost" stroke="#f43f5e" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />}
              {showCumulative && <Area type="monotone" dataKey="cumulativeProfit" name="Cumulative Profit" stroke="#8b5cf6" fill="url(#colorProfit)" strokeWidth={2.5} />}
            </AreaChart>
          ) : chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 15, left: leftMargin, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
              <XAxis dataKey="label" stroke="#888888" fontSize={10} tickLine={false} minTickGap={10} />
              <YAxis stroke="#888888" fontSize={10} tickLine={false} width={yAxisWidth} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                cursor={{ fill: 'rgba(128, 128, 128, 0.08)' }}
                isAnimationActive={false}
                animationDuration={0}
                wrapperStyle={{ transition: 'none', pointerEvents: 'none' }}
                content={<TrendTooltipContent />}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              {showRevenue && <Bar dataKey="subtotal" name="Gross Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />}
              {showProfit && <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />}
              {showCost && <Bar dataKey="cost" name="Total Cost" fill="#f43f5e" radius={[4, 4, 0, 0]} />}
              {showCumulative && <Bar dataKey="cumulativeProfit" name="Cumulative Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} />}
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 15, left: leftMargin, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
              <XAxis dataKey="label" stroke="#888888" fontSize={10} tickLine={false} minTickGap={10} />
              <YAxis stroke="#888888" fontSize={10} tickLine={false} width={yAxisWidth} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                cursor={{ stroke: '#888888', strokeWidth: 1, opacity: 0.4 }}
                isAnimationActive={false}
                animationDuration={0}
                wrapperStyle={{ transition: 'none', pointerEvents: 'none' }}
                content={<TrendTooltipContent />}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              {showRevenue && <Line type="monotone" dataKey="subtotal" name="Gross Revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />}
              {showProfit && <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />}
              {showCost && <Line type="monotone" dataKey="cost" name="Total Cost" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={{ r: 4.5 }} />}
              {showCumulative && <Line type="monotone" dataKey="cumulativeProfit" name="Cumulative Profit" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
