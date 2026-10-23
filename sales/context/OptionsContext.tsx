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
import { createClient } from '@/lib/supabase/client';
import {
  DEFAULT_OPTION_COLOR,
  isOptionType,
  isValidOptionColor,
  type OptionType,
  type SalesOption,
} from '@/sales/lib/optionTypes';
import {
  createOptionAction,
  deleteOptionAction,
  fetchOptionsAction,
  renameOptionAction,
  updateOptionColorAction,
} from '@/sales/services/optionsActions';

type RenameListener = (type: OptionType, oldName: string, newName: string) => void;

interface OptionsContextValue {
  /** Option names for a type, in creation order. */
  getOptionNames: (type: OptionType) => string[];
  /** Full option objects (name + color) for a type. */
  getOptionList: (type: OptionType) => SalesOption[];
  /** Tag class for a value. Values that are not (or no longer) options render with the default color. */
  getOptionColor: (type: OptionType | string | undefined, name: string) => string;
  /** Each mutator resolves to an error message, or null on success. */
  addOption: (type: OptionType, name: string, color?: string) => Promise<string | null>;
  renameOption: (type: OptionType, oldName: string, newName: string) => Promise<string | null>;
  setOptionColor: (type: OptionType, name: string, color: string) => Promise<string | null>;
  removeOption: (type: OptionType, name: string) => Promise<string | null>;
  /** Fires after a rename succeeds so views can update the sale rows they hold in memory. */
  onOptionRenamed: (listener: RenameListener) => () => void;
}

const noopAsync = async () => null;

const OptionsContext = createContext<OptionsContextValue>({
  getOptionNames: () => [],
  getOptionList: () => [],
  getOptionColor: () => DEFAULT_OPTION_COLOR,
  addOption: noopAsync,
  renameOption: noopAsync,
  setOptionColor: noopAsync,
  removeOption: noopAsync,
  onOptionRenamed: () => () => {},
});

const REFETCH_DEBOUNCE_MS = 200;
const EMPTY_OPTIONS: SalesOption[] = [];

export function OptionsProvider({
  userId,
  initialOptions,
  children,
}: {
  userId?: string | null;
  initialOptions: SalesOption[];
  children: ReactNode;
}) {
  const [options, setOptions] = useState<SalesOption[]>(initialOptions);
  const optionsRef = useRef<SalesOption[]>(initialOptions);
  optionsRef.current = options;
  const renameListenersRef = useRef<Set<RenameListener>>(new Set());
  // Counts in-flight local mutations so a refetch never overwrites an optimistic state mid-write.
  const pendingMutationsRef = useRef(0);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    if (pendingMutationsRef.current > 0) return;
    try {
      const fresh = await fetchOptionsAction();
      if (pendingMutationsRef.current === 0) setOptions(fresh);
    } catch (err) {
      console.error('Failed to refresh options:', err);
    }
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(refetch, REFETCH_DEBOUNCE_MS);
  }, [refetch]);

  // Cross-device sync: realtime changes + refresh when the tab becomes visible/online again.
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`sales_options:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_options', filter: `user_id=eq.${userId}` },
        () => scheduleRefetch()
      )
      // Realtime can't filter DELETE events by user_id; only refresh when the deleted id
      // belongs to an option currently loaded for this user.
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'sales_options' },
        (payload) => {
          const deletedId = (payload.old as { id?: string } | null)?.id;
          if (deletedId && optionsRef.current.some((option) => option.id === deletedId)) {
            scheduleRefetch();
          }
        }
      )
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRefetch();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', scheduleRefetch);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', scheduleRefetch);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId, scheduleRefetch]);

  const byType = useMemo(() => {
    const map = new Map<OptionType, SalesOption[]>();
    for (const opt of options) {
      const list = map.get(opt.type);
      if (list) list.push(opt);
      else map.set(opt.type, [opt]);
    }
    return map;
  }, [options]);

  const colorLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of options) map.set(`${opt.type}:${opt.name}`, opt.color);
    return map;
  }, [options]);

  const getOptionList = useCallback(
    (type: OptionType) => byType.get(type) ?? EMPTY_OPTIONS,
    [byType]
  );

  const getOptionNames = useCallback(
    (type: OptionType) => (byType.get(type) ?? EMPTY_OPTIONS).map((o) => o.name),
    [byType]
  );

  const getOptionColor = useCallback(
    (type: OptionType | string | undefined, name: string) => {
      if (!type || !isOptionType(type)) return DEFAULT_OPTION_COLOR;
      return colorLookup.get(`${type}:${name}`) ?? DEFAULT_OPTION_COLOR;
    },
    [colorLookup]
  );

  /** Runs an optimistic mutation; on failure the server state is restored. */
  const mutate = useCallback(
    async (
      optimistic: (prev: SalesOption[]) => SalesOption[],
      request: () => Promise<{ ok: true } | { ok: false; error: string }>
    ): Promise<string | null> => {
      pendingMutationsRef.current += 1;
      setOptions(optimistic);
      let error: string | null = null;
      try {
        const result = await request();
        if (!result.ok) error = result.error;
      } catch (err) {
        console.error('Option mutation failed:', err);
        error = 'Something went wrong. Please try again.';
      } finally {
        pendingMutationsRef.current -= 1;
      }
      // Reconcile with the database either way (picks up server-assigned ids, or reverts on failure).
      await refetch();
      return error;
    },
    [refetch]
  );

  const addOption = useCallback(
    async (type: OptionType, name: string, color: string = DEFAULT_OPTION_COLOR) => {
      const trimmed = name.trim();
      if (!trimmed) return 'Name is required.';
      if ((byType.get(type) ?? []).some((o) => o.name.toLowerCase() === trimmed.toLowerCase())) {
        return 'An option with this name already exists.';
      }
      const safeColor = isValidOptionColor(color) ? color : DEFAULT_OPTION_COLOR;
      return mutate(
        (prev) => [
          ...prev,
          { id: `temp-${type}-${trimmed}`, type, name: trimmed, color: safeColor },
        ],
        () => createOptionAction(type, trimmed, safeColor)
      );
    },
    [byType, mutate]
  );

  const renameOption = useCallback(
    async (type: OptionType, oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return null;
      const clash = (byType.get(type) ?? []).some(
        (o) => o.name !== oldName && o.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (clash) return 'An option with this name already exists.';

      const error = await mutate(
        (prev) =>
          prev.map((o) => (o.type === type && o.name === oldName ? { ...o, name: trimmed } : o)),
        () => renameOptionAction(type, oldName, trimmed)
      );
      if (!error) {
        renameListenersRef.current.forEach((listener) => listener(type, oldName, trimmed));
      }
      return error;
    },
    [byType, mutate]
  );

  const setOptionColor = useCallback(
    (type: OptionType, name: string, color: string) =>
      mutate(
        (prev) => prev.map((o) => (o.type === type && o.name === name ? { ...o, color } : o)),
        () => updateOptionColorAction(type, name, color)
      ),
    [mutate]
  );

  const removeOption = useCallback(
    (type: OptionType, name: string) =>
      mutate(
        (prev) => prev.filter((o) => !(o.type === type && o.name === name)),
        () => deleteOptionAction(type, name)
      ),
    [mutate]
  );

  const onOptionRenamed = useCallback((listener: RenameListener) => {
    renameListenersRef.current.add(listener);
    return () => {
      renameListenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<OptionsContextValue>(
    () => ({
      getOptionNames,
      getOptionList,
      getOptionColor,
      addOption,
      renameOption,
      setOptionColor,
      removeOption,
      onOptionRenamed,
    }),
    [
      getOptionNames,
      getOptionList,
      getOptionColor,
      addOption,
      renameOption,
      setOptionColor,
      removeOption,
      onOptionRenamed,
    ]
  );

  return <OptionsContext.Provider value={value}>{children}</OptionsContext.Provider>;
}

export function useOptions(type: OptionType) {
  const ctx = useContext(OptionsContext);
  const { getOptionList, addOption, renameOption, setOptionColor, removeOption } = ctx;

  const options = getOptionList(type);

  return {
    options,
    addOption: useCallback((name: string, color?: string) => addOption(type, name, color), [addOption, type]),
    renameOption: useCallback((oldName: string, newName: string) => renameOption(type, oldName, newName), [renameOption, type]),
    setOptionColor: useCallback((name: string, color: string) => setOptionColor(type, name, color), [setOptionColor, type]),
    removeOption: useCallback((name: string) => removeOption(type, name), [removeOption, type]),
  };
}

/** Access to the whole options store (lists for any type, colors, rename events). */
export function useOptionsStore() {
  return useContext(OptionsContext);
}
