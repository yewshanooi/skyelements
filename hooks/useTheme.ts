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
  const toggleTheme = () => {
    const current = resolvedTheme || theme;
    setTheme(current === 'dark' ? 'light' : 'dark');
  };

  return {
    theme: (theme as Theme) || 'system',
    isDarkMode,
    mounted,
    setTheme: (t: Theme) => setTheme(t),
    toggleTheme,
  };
}

