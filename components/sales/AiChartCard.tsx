"use client";

import { useMemo, type FC } from 'react';
import { Table as TableIcon } from 'lucide-react';
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

export const AiChartCard: FC<AiChartCardProps> = ({ chartSpec }) => {
  const { title, data, xAxisKey, dataKeys } = chartSpec;

  // Limit metric columns to at most 2 so the compact table never overflows or truncates
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

  if (!data || data.length === 0) {
    return (
      <div className="mt-2.5 p-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 rounded-xl text-xs text-neutral-500 text-center">
        No aggregated records found.
      </div>
    );
  }

  // Compute column totals for active metrics
  const totals = useMemo(() => {
    const res: Record<string, number> = {};
    validDataKeys.forEach((key) => {
      res[key] = data.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
    });
    return res;
  }, [data, validDataKeys]);

  return (
    <div className="mt-3 bg-white dark:bg-[#1c1c1f] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)] text-xs">
      {/* Header (clean and uncluttered, row count removed) */}
      <div className="px-3.5 py-2.5 bg-neutral-50/90 dark:bg-[#232326]/90 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-[#2383e2]/10 dark:bg-[#2383e2]/20 flex items-center justify-center shrink-0">
          <TableIcon className="w-3 h-3 text-[#2383e2] dark:text-blue-400" />
        </div>
        <h4 className="text-[12px] font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          {title}
        </h4>
      </div>

      {/* Table Body */}
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
    </div>
  );
};

export const AiMetricsTable = AiChartCard;
