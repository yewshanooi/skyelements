"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { SalesSettingKey, SalesSettings } from '@/sales/lib/salesSettings';
import { normalizeFormula } from '@/sales/lib/formulaEngine';
import { patchSettingsAction } from '@/sales/services/settingsActions';

const SAVE_DEBOUNCE_MS = 800;

interface SettingsContextValue {
  /** Reactive snapshot (formula updates immediately; layout-type settings update when saved). */
  settings: SalesSettings;
  /** Always the latest values, including unsaved edits. Use for initializing local state on mount. */
  getSettings: () => SalesSettings;
  /** Updates a setting immediately in memory and saves it to the database (debounced). */
  updateSetting: <K extends SalesSettingKey>(key: K, value: SalesSettings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: {},
  getSettings: () => ({}),
  updateSetting: () => {},
});

export function SettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings: SalesSettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<SalesSettings>(initialSettings);
  const settingsRef = useRef<SalesSettings>(initialSettings);
  const pendingRef = useRef<SalesSettings>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const patch = pendingRef.current;
    if (Object.keys(patch).length === 0) return;
    pendingRef.current = {};
    // Publish the latest values to React state (batched here to avoid re-rendering every consumer
    // on each frame of a drag/resize).
    setSettings(settingsRef.current);
    try {
      const result = await patchSettingsAction(patch);
      if (!result.ok) console.error('Failed to save settings:', result.error);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, []);

  const updateSetting = useCallback(
    <K extends SalesSettingKey>(key: K, value: SalesSettings[K]) => {
      if (JSON.stringify(settingsRef.current[key]) === JSON.stringify(value)) return;
      settingsRef.current = { ...settingsRef.current, [key]: value };
      // The formula is shared live between the table, sale modal and dashboard, so publish it now.
      if (key === 'formula') setSettings(settingsRef.current);
      pendingRef.current = { ...pendingRef.current, [key]: value };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    },
    [flush]
  );

  // Best-effort flush when the tab is hidden/closed or the provider unmounts.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flush);
      void flush();
    };
  }, [flush]);

  const getSettings = useCallback(() => settingsRef.current, []);

  const value = useMemo(
    () => ({ settings, getSettings, updateSetting }),
    [settings, getSettings, updateSetting]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSalesSettings() {
  return useContext(SettingsContext);
}

/**
 * Persists a locally-owned piece of state to the user's settings whenever it changes.
 * The first render is skipped so untouched defaults are never written.
 * Pass `undefined` to pause saving temporarily.
 */
export function useSyncSetting<K extends SalesSettingKey>(key: K, value: SalesSettings[K]) {
  const { updateSetting } = useSalesSettings();
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    // `undefined` means "hold off" (e.g. while a drag is still in progress).
    if (value === undefined) return;
    updateSetting(key, value);
  }, [key, value, updateSetting]);
}

/** The shared "Sales" formula, synced across views and devices. */
export function useFormulaSetting() {
  const { settings, updateSetting } = useSalesSettings();
  const formula = useMemo(() => normalizeFormula(settings.formula), [settings.formula]);
  const setFormula = useCallback(
    (next: string) => updateSetting('formula', next),
    [updateSetting]
  );
  return [formula, setFormula] as const;
}
