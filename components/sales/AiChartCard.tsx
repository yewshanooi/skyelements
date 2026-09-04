"use client";

import { useState, useMemo, type FC } from 'react';
import { Table as TableIcon, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { ChartSpec } from '@/types/salesAi';

interface AiChartCardProps {
  chartSpec: ChartSpec;
}

function isCurrencyMetric(key: string): boolean {
  return key === 'revenue' || key === 'cost' || key === 'profit' || key === 'aov';
}

function formatValue(key: string, value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return String(value ?? '-');

  if (isCurrencyMetric(key)) {
    return `RM ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return num.toLocaleString('en-US');
}

function formatDimensionValue(dimKey: string, val: unknown): string {
  if (val === null || val === undefined) return '-';
  const str = String(val).trim();

  // Full ISO date: YYYY-MM-DD -> DD/MM/YYYY
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return `${day}/${month}/${year}`;
  }

  // Month string: YYYY-MM -> MM/YYYY
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(str);
  if (monthMatch) {
    const [, year, month] = monthMatch;
    return `${month}/${year}`;
  }

  // ISO timestamp with time: YYYY-MM-DDTHH:mm... -> DD/MM/YYYY
  if (str.includes('T') && !isNaN(Date.parse(str))) {
    const d = new Date(str);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

function formatColumnHeader(key: string): string {
  switch (key.toLowerCase()) {
    case 'revenue':
      return 'Revenue';
    case 'cost':
      return 'Cost';
    case 'profit':
      return 'Profit';
    case 'units_sold':
      return 'Units';
    case 'order_count':
      return 'Orders';
    case 'aov':
      return 'AOV';
    case 'month':
      return 'Month';
    case 'date':
      return 'Date';
    case 'customer':
      return 'Customer';
    case 'category':
      return 'Category';
    case 'marketplace':
      return 'Store';
    case 'item':
      return 'Item';
    default:
      return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
  }
}

const METRIC_COLORS: Record<string, string> = {
  revenue: '#2383e2',
  profit: '#10b981',
  cost: '#f43f5e',
  units_sold: '#8b5cf6',
  order_count: '#f59e0b',
  aov: '#06b6d4',
};

interface TooltipPayloadItem {
  name: string;
  value: unknown;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomTooltip: FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md p-2.5 rounded-xl border border-black/10 dark:border-white/10 shadow-lg text-[11px] select-none">
        <p className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[10.5px]">
            <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              {formatColumnHeader(entry.name)}:
            </span>
            <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
              {formatValue(entry.name, entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const AiChartCard: FC<AiChartCardProps> = ({ chartSpec }) => {
  const { title, data, xAxisKey, dataKeys } = chartSpec;
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  // Limit metric columns to at most 2 so the compact table and chart never overflow
  const validDataKeys = useMemo(() => {
    let keys: string[] = [];
    if (dataKeys && dataKeys.length > 0) {
      keys = dataKeys;
    } else if (data.length > 0) {
      keys = Object.keys(data[0]).filter(
        (k) => k !== xAxisKey && typeof data[0][k] === 'number'
      );
    }
    if (keys.length === 0) keys = ['revenue'];
    return keys.slice(0, 2);
  }, [data, dataKeys, xAxisKey]);

  // Compute column totals for active metrics
  const totals = useMemo(() => {
    const res: Record<string, number> = {};
    validDataKeys.forEach((key) => {
      res[key] = data.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
    });
    return res;
  }, [data, validDataKeys]);

  // Format data for Recharts
  const chartData = useMemo(() => {
    return data.map((row) => {
      const formattedRow: Record<string, unknown> = {
        name: formatDimensionValue(xAxisKey, row[xAxisKey]),
      };
      validDataKeys.forEach((key) => {
        formattedRow[key] = Number(row[key]) || 0;
      });
      return formattedRow;
    });
  }, [data, xAxisKey, validDataKeys]);

  if (!data || data.length === 0) {
    return (
      <div className="mt-2.5 p-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 rounded-xl text-xs text-neutral-500 text-center">
        No aggregated records found.
      </div>
    );
  }

  return (
    <div className="mt-3 bg-white dark:bg-[#1c1c1f] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)] text-xs">
      {/* Header with Title and Segmented View Mode Toggle */}
      <div className="px-3 py-2 bg-neutral-50/90 dark:bg-[#232326]/90 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-[#2383e2]/10 dark:bg-[#2383e2]/20 flex items-center justify-center shrink-0">
            {viewMode === 'table' ? (
              <TableIcon className="w-3 h-3 text-[#2383e2] dark:text-blue-400" />
            ) : (
              <BarChart3 className="w-3 h-3 text-[#2383e2] dark:text-blue-400" />
            )}
          </div>
          <h4 className="text-[11.5px] font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {title}
          </h4>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center bg-black/[0.05] dark:bg-white/[0.08] p-0.5 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-[#2c2c30] text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
            title="Table View"
          >
            <TableIcon className="w-3 h-3" />
            <span>Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium transition-all cursor-pointer ${
              viewMode === 'chart'
                ? 'bg-white dark:bg-[#2c2c30] text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
            title="Chart View"
          >
            <BarChart3 className="w-3 h-3" />
            <span>Chart</span>
          </button>
        </div>
      </div>

      {/* Content: Either Table View or Recharts Bar View */}
      {viewMode === 'table' ? (
        <div className="max-h-64 overflow-y-auto overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-neutral-100/60 dark:bg-[#222225] text-neutral-600 dark:text-neutral-400 font-semibold border-b border-black/[0.06] dark:border-white/[0.08]">
                <th className="text-left px-3 py-2 font-medium capitalize">
                  {formatColumnHeader(xAxisKey)}
                </th>
                {validDataKeys.map((key) => (
                  <th key={key} className="text-right px-3 py-2 font-medium">
                    {formatColumnHeader(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-neutral-50/80 dark:hover:bg-[#26262a]/80 transition-colors"
                >
                  <td className="px-3 py-2 font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[150px]">
                    {formatDimensionValue(xAxisKey, row[xAxisKey])}
                  </td>
                  {validDataKeys.map((key) => {
                    const isProfit = key === 'profit';
                    const isCost = key === 'cost';
                    return (
                      <td
                        key={key}
                        className={`text-right px-3 py-2 font-mono font-medium ${
                          isProfit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isCost
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {formatValue(key, row[key])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {data.length > 1 && (
              <tfoot>
                <tr className="bg-neutral-100/80 dark:bg-[#242428] border-t border-black/[0.08] dark:border-white/[0.1] font-semibold text-neutral-900 dark:text-neutral-100">
                  <td className="px-3 py-2">Total</td>
                  {validDataKeys.map((key) => (
                    <td
                      key={key}
                      className={`text-right px-3 py-2 font-mono ${
                        key === 'profit'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : key === 'cost'
                          ? 'text-rose-600 dark:text-rose-400'
                          : ''
                      }`}
                    >
                      {formatValue(key, totals[key])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <div className="p-2.5 h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 12, right: 10, left: -14, bottom: chartData.length > 5 ? 24 : 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-neutral-200 dark:text-neutral-800 opacity-60"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9.5, fill: 'currentColor' }}
                className="text-neutral-500 dark:text-neutral-400"
                interval={chartData.length > 8 ? 'preserveStartEnd' : 0}
                angle={chartData.length > 5 ? -25 : 0}
                textAnchor={chartData.length > 5 ? 'end' : 'middle'}
                height={chartData.length > 5 ? 36 : 22}
              />
              <YAxis
                tick={{ fontSize: 9.5, fill: 'currentColor' }}
                className="text-neutral-500 dark:text-neutral-400"
                tickFormatter={(val) => {
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                  return String(val);
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {validDataKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  fill={METRIC_COLORS[key] || '#2383e2'}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export const AiMetricsTable = AiChartCard;
