"use client";

import type { FC } from 'react';
import { useOptionsStore } from '@/sales/context/OptionsContext';

interface TagPillProps {
  text: string;
  type?: 'category' | 'marketplace' | 'payment_method' | 'order_status' | 'payment_status' | 'custom';
  color?: string;
  className?: string;
}

export const TagPill: FC<TagPillProps> = ({ text = '', type, color, className = '' }) => {
  const { getOptionColor } = useOptionsStore();
  const safeText = typeof text === 'string' ? text : String(text || '');

  if (!safeText.trim()) {
    return null;
  }

  // Color comes from the user's saved option. Values that aren't saved options use the default color.
  const resolvedClass = color || getOptionColor(type, safeText);

  return (
    <span
      className={`inline-flex items-center max-w-full min-w-0 px-2 py-0.5 rounded text-xs font-medium tracking-tight transition-colors select-none ${resolvedClass} ${className}`}
      title={safeText}
    >
      <span className="truncate">{safeText}</span>
    </span>
  );
};
