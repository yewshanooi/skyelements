"use client";

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { resolveOptionTagClass, getOptionColor } from '@/services/sales/optionsService';

interface TagPillProps {
  text: string;
  type?: 'category' | 'marketplace' | 'payment_method' | 'order_status' | 'payment_status' | 'custom';
  color?: string;
  className?: string;
}

export const TagPill: FC<TagPillProps> = ({ text = '', type, color, className = '' }) => {
  const safeText = typeof text === 'string' ? text : String(text || '');
  const [customColor, setCustomColor] = useState<string | undefined>(() => getOptionColor(safeText, type));

  useEffect(() => {
    setCustomColor(getOptionColor(safeText, type));

    const handleColorChange = () => {
      setCustomColor(getOptionColor(safeText, type));
    };

    window.addEventListener('custom-colors-changed', handleColorChange);
    window.addEventListener('custom-option-renamed', handleColorChange);
    return () => {
      window.removeEventListener('custom-colors-changed', handleColorChange);
      window.removeEventListener('custom-option-renamed', handleColorChange);
    };
  }, [safeText, type]);

  if (!safeText.trim()) {
    return null;
  }

  const resolvedClass = color || customColor || resolveOptionTagClass(safeText, type);

  return (
    <span
      className={`inline-flex items-center max-w-full min-w-0 px-2 py-0.5 rounded text-xs font-medium tracking-tight transition-colors select-none ${resolvedClass} ${className}`}
      title={safeText}
    >
      <span className="truncate">{safeText}</span>
    </span>
  );
};
