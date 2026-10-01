"use client";
import { useEffect, useState } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted ? resolvedTheme === 'dark' : false;

  return {
    theme: (theme as Theme) || 'system',
    isDarkMode,
    mounted,
    setTheme: (t: Theme) => setTheme(t),
  };
}

