'use client';

import { useEffect, useMemo, useState } from 'react';
import { mergeSuggestions, searchLocal, type LocationSuggestion } from '@/sales/lib/geocoder';
import { peekPhotonCache, photonSearch } from '@/sales/lib/photon';

const DEBOUNCE_MS = 200;
const MIN_REMOTE_CHARS = 3;
const EMPTY: LocationSuggestion[] = [];

interface RemoteState {
  query: string;
  results: LocationSuggestion[];
}

/**
 * Location autocomplete shared by the table picker and the map drawer.
 *
 * - Offline matches are derived synchronously on every keystroke, so the list is never empty
 *   while the network is still working.
 * - Photon is debounced, cancellable (stale responses can never overwrite newer input) and
 *   served from an in-memory cache when the same query was seen before.
 * - Previous remote results stay visible while the next ones load, which avoids list flicker.
 */
export function useLocationSearch(query: string, remoteEnabled = true) {
  const trimmed = query.trim();
  const wantsRemote = remoteEnabled && trimmed.length >= MIN_REMOTE_CHARS;

  const [remoteState, setRemoteState] = useState<RemoteState>({ query: '', results: EMPTY });

  const local = useMemo(() => searchLocal(trimmed), [trimmed]);
  const cached = wantsRemote ? peekPhotonCache(trimmed) : undefined;

  useEffect(() => {
    if (!wantsRemote || peekPhotonCache(trimmed)) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const results = await photonSearch(trimmed, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setRemoteState({ query: trimmed, results: results ?? EMPTY });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, wantsRemote]);

  const remote = !wantsRemote ? EMPTY : cached ?? remoteState.results;
  const isLoading = wantsRemote && !cached && remoteState.query !== trimmed;

  const suggestions = useMemo(() => mergeSuggestions(local, remote), [local, remote]);

  return { suggestions, isLoading };
}
