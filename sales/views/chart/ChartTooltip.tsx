"use client";

import type { FC, ReactNode } from 'react';

export interface ChartTooltipCardProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  minWidthClass?: string;
}

export const ChartTooltipCard: FC<ChartTooltipCardProps> = ({
  title,
  children,
  className = '',
  minWidthClass = 'min-w-[190px]',
}) => {
  return (
    <div
      className={`p-3.5 ${minWidthClass} text-xs font-sans bg-white dark:bg-[#202020] border border-neutral-200/90 dark:border-neutral-700/60 shadow-xl rounded-[14px] text-neutral-900 dark:text-neutral-100 transition-colors select-none ${className}`}
    >
      <div className="flex items-start justify-between gap-2 border-b pb-2 border-neutral-100 dark:border-neutral-800">
        <span className="font-semibold text-neutral-900 dark:text-neutral-100 leading-snug truncate">
          {title}
        </span>
      </div>
      <div className="space-y-1.5 pt-2 text-neutral-600 dark:text-neutral-300">
        {children}
      </div>
    </div>
  );
};

export interface ChartTooltipRowProps {
  label: string;
  value: ReactNode;
  valueClass?: string;
  colorDot?: string;
}

export const ChartTooltipRow: FC<ChartTooltipRowProps> = ({
  label,
  value,
  valueClass = 'font-mono font-bold text-neutral-800 dark:text-neutral-200',
  colorDot,
}) => {
  return (
    <div className="flex items-center justify-between text-xs gap-4">
      <div className="flex items-center gap-1.5 min-w-0">
        {colorDot && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: colorDot }}
          />
        )}
        <span className="text-neutral-400 dark:text-neutral-500 font-medium truncate">
          {label}:
        </span>
      </div>
      <span className={`shrink-0 ${valueClass}`}>{value}</span>
    </div>
  );
};

export const ChartTooltipDivider: FC = () => (
  <div className="pt-1.5 mt-1.5 border-t border-neutral-100 dark:border-neutral-800" />
);
