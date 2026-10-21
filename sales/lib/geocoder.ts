/**
 * Geocoding entry points shared by the browser (pickers, map drawer) and the server (sales actions).
 *
 * Strategy, ordered by cost:
 *  1. Embedded coordinates / map URLs                     (instant)
 *  2. Place-name-only input (town, landmark, postcode...) (instant, offline index)
 *  3. Street-level input -> Photon, sanity-checked against the offline anchor (network, bounded)
 *  4. Offline area match as a deterministic fallback      (instant)
 */
import type { LocationCoordinates, LocationSuggestion } from '@/sales/lib/geoData';
import {
  ANCHOR_TOLERANCE_KM,
  approximate,
  distanceKm,
  resolveLocally,
  searchLocal,
  type LocalMatch,
  type LocalSuggestion,
} from '@/sales/lib/localGeocoder';
import { cleanQueryForApi, photonSearch } from '@/sales/lib/photon';

export type { LocationCoordinates, LocationSuggestion };

const MAX_ATTEMPTS = 3;
const DEFAULT_DEADLINE_MS = 5000;
const MIN_ATTEMPT_MS = 300;

export interface GeocodeOptions {
  signal?: AbortSignal;
  /** Total time budget for all network attempts. */
  deadlineMs?: number;
}

/** Full address first, then without the leading business/unit fragment, then district + state. */
function buildQueries(text: string): string[] {
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  const candidates = [text];
  if (parts.length > 1) candidates.push(parts.slice(1).join(', '));
  if (parts.length >= 3) candidates.push(parts.slice(-2).join(', '));

  const seen = new Set<string>();
  const queries: string[] = [];
  for (const q of candidates) {
    const key = cleanQueryForApi(q).toLowerCase();
    if (key.length < 2 || seen.has(key)) continue;
    seen.add(key);
    queries.push(q);
  }
  return queries.slice(0, MAX_ATTEMPTS);
}

/** Reject remote hits that land far from the town/landmark the address itself names. */
function isPlausible(hit: LocationCoordinates, anchor: LocalMatch | null): boolean {
  const tolerance = anchor ? ANCHOR_TOLERANCE_KM[anchor.level] : undefined;
  return tolerance === undefined || distanceKm(anchor!, hit) <= tolerance;
}

async function geocodeRemote(
  text: string,
  anchor: LocalMatch | null,
  { signal, deadlineMs = DEFAULT_DEADLINE_MS }: GeocodeOptions
): Promise<LocationCoordinates | null> {
  const deadline = Date.now() + deadlineMs;

  for (const query of buildQueries(text)) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS || signal?.aborted) break;

    const results = await photonSearch(query, { signal, timeoutMs: remaining });
    // A failed request (timeout/network) will not be fixed by a coarser query, so stop early.
    if (results === null) break;

    const hit = results.find((r) => isPlausible(r, anchor));
    if (hit) return { lat: hit.lat, lng: hit.lng };
  }
  return null;
}

/**
 * Resolve an address to coordinates. Returns null only when nothing could be matched at all.
 */
export async function geocodeAddress(
  address: string,
  options: GeocodeOptions = {}
): Promise<LocationCoordinates | null> {
  const text = address?.trim();
  if (!text) return null;

  const local = resolveLocally(text);
  if (local?.exact) return { lat: local.lat, lng: local.lng };

  const remote = await geocodeRemote(text, local, options);
  if (remote) return remote;

  return local ? approximate(local, text) : null;
}

const MAX_SUGGESTIONS = 8;

const isNear = (a: LocationSuggestion, b: LocationSuggestion) =>
  Math.abs(a.lat - b.lat) < 0.003 && Math.abs(a.lng - b.lng) < 0.003;

/**
 * Combine offline and remote autocomplete results: confident offline hits first (they are instant
 * and usually exactly what was typed), then Photon, then weaker offline hits.
 *
 * Duplicates are removed by name. Offline/remote pairs that point at the same spot are also
 * collapsed, but two remote results close together (e.g. two shops in one mall) are both kept.
 */
export function mergeSuggestions(
  local: LocalSuggestion[],
  remote: LocationSuggestion[],
  limit = MAX_SUGGESTIONS
): LocationSuggestion[] {
  const ordered = [
    ...local.filter((s) => s.strong).slice(0, 3).map((s) => ({ s, fromLocal: true })),
    ...remote.map((s) => ({ s, fromLocal: false })),
    ...local.filter((s) => !s.strong).map((s) => ({ s, fromLocal: true })),
  ];

  const out: { s: LocationSuggestion; fromLocal: boolean }[] = [];
  const names = new Set<string>();
  for (const item of ordered) {
    const name = item.s.displayName.toLowerCase();
    if (names.has(name)) continue;
    if (out.some((o) => o.fromLocal !== item.fromLocal && isNear(o.s, item.s))) continue;
    names.add(name);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out.map(({ s }) => ({ displayName: s.displayName, lat: s.lat, lng: s.lng }));
}

export { searchLocal };
