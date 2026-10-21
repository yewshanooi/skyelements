/**
 * Offline location engine for Malaysian places. Resolves postcodes, landmarks, towns and states
 * with zero network latency. Isomorphic: safe on both client and server.
 *
 * Matching is token based (word boundaries), so short keys such as "um" never fire inside
 * unrelated words like "Kuala Lumpur".
 */
import {
  KNOWN_LANDMARKS,
  KNOWN_TOWNS,
  STATE_COORDINATES,
  getCoordinatesFromPostcode,
  isReasonableCoordinates,
  type LocationCoordinates,
  type LocationSuggestion,
} from '@/sales/lib/geoData';
import { extractEmbeddedCoordinates } from '@/sales/lib/locationParser';

export type MatchLevel = 'coordinates' | 'landmark' | 'town' | 'state' | 'postcode';

export interface LocalMatch extends LocationCoordinates {
  level: MatchLevel;
  /** True when the query is only a place name, with no street/unit detail left over. */
  exact: boolean;
}

export interface LocalSuggestion extends LocationSuggestion {
  /** True when the query equals or prefixes the place name (a confident autocomplete hit). */
  strong: boolean;
}

type EntryLevel = 'landmark' | 'town' | 'state';

interface Entry {
  key: string;
  name: string;
  state?: string;
  words: number;
  level: EntryLevel;
  lat: number;
  lng: number;
  label: string;
  /** Ambiguous short names (e.g. "yan") only match when they are the whole query. */
  weak: boolean;
  /** Alias spellings that should resolve but never be listed as suggestions. */
  hidden: boolean;
}

const LEVEL_RANK: Record<EntryLevel, number> = { landmark: 0, town: 1, state: 2 };
const WEAK_KEYS = new Set(['um', 'sik', 'yan']);
const ACRONYMS = new Set(['kl', 'jb', 'klcc', 'klia', 'klia2', 'utm', 'usm', 'um', 'ukm', 'upm', 'utar', 'usj', 'ss2', 'ttdi']);
const COUNTRY_KEYS = new Set(['singapore', 'brunei', 'indonesia', 'thailand']);
/** Admin words that carry no street-level detail. */
const NOISE = new Set(['malaysia', 'my', 'wp', 'w', 'p', 'wilayah', 'persekutuan', 'negeri']);
const POSTCODE_RE = /^\d{5}$/;

/** Max distance (km) a remote result may sit from a local anchor before it is considered a wrong match. */
export const ANCHOR_TOLERANCE_KM: Partial<Record<MatchLevel, number>> = {
  landmark: 40,
  town: 60,
  postcode: 100,
};

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

export function distanceKm(a: LocationCoordinates, b: LocationCoordinates): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function titleCase(key: string): string {
  if (ACRONYMS.has(key)) return key.toUpperCase();
  return key
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildLabel(name: string, level: EntryLevel, key: string, state?: string): string {
  if (level === 'state' && COUNTRY_KEYS.has(key)) return name;
  const parts = [name];
  if (state && state.toLowerCase() !== name.toLowerCase()) parts.push(state);
  if (state !== 'Brunei') parts.push('Malaysia');
  return parts.join(', ');
}

interface Index {
  byKey: Map<string, Entry>;
  entries: Entry[];
  maxWords: number;
}

let indexCache: Index | null = null;

/** Built once, lazily. Replaces the old per-call regex compilation and sorting. */
function getIndex(): Index {
  if (indexCache) return indexCache;

  const byKey = new Map<string, Entry>();
  let maxWords = 1;

  const add = (rawKey: string, level: EntryLevel, c: LocationCoordinates, state?: string) => {
    const tokens = tokenize(rawKey);
    if (tokens.length === 0) return;
    const key = tokens.join(' ');
    const existing = byKey.get(key);
    if (existing && LEVEL_RANK[existing.level] <= LEVEL_RANK[level]) return;

    const name = titleCase(key);
    byKey.set(key, {
      key,
      name,
      state,
      words: tokens.length,
      level,
      lat: c.lat,
      lng: c.lng,
      label: buildLabel(name, level, key, state),
      weak: WEAK_KEYS.has(key),
      hidden: key.startsWith('w p ') || key.startsWith('wilayah persekutuan'),
    });
    maxWords = Math.max(maxWords, tokens.length);
  };

  for (const [k, v] of Object.entries(STATE_COORDINATES)) add(k, 'state', v);
  for (const [k, v] of Object.entries(KNOWN_TOWNS)) add(k, 'town', v, v.state);
  for (const [k, v] of Object.entries(KNOWN_LANDMARKS)) add(k, 'landmark', v, v.state);

  indexCache = { byKey, entries: [...byKey.values()], maxWords };
  return indexCache;
}

interface Hit {
  entry: Entry;
  start: number;
  len: number;
}

/**
 * Resolve free text to a known place. Returns base (un-jittered) coordinates.
 * Precedence: embedded coordinates > landmark > town > state > postcode.
 */
export function resolveLocally(address: string): LocalMatch | null {
  if (!address || !address.trim()) return null;

  const embedded = extractEmbeddedCoordinates(address);
  if (embedded && isReasonableCoordinates(embedded.lat, embedded.lng)) {
    return { ...embedded, level: 'coordinates', exact: true };
  }

  const tokens = tokenize(address);
  if (tokens.length === 0) return null;

  const { byKey, maxWords } = getIndex();

  // Left-to-right longest match over word n-grams.
  const hits: Hit[] = [];
  const uncovered: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let n = Math.min(maxWords, tokens.length - i); n >= 1; n--) {
      const entry = byKey.get(tokens.slice(i, i + n).join(' '));
      if (entry) {
        hits.push({ entry, start: i, len: n });
        i += n;
        matched = true;
        break;
      }
    }
    if (!matched) {
      uncovered.push(tokens[i]);
      i++;
    }
  }

  // Weak (ambiguous) names only count when they are the entire query.
  const isEntireQuery = hits.length === 1 && uncovered.every((t) => NOISE.has(t) || POSTCODE_RE.test(t));
  const usable = hits.filter((h) => !h.entry.weak || isEntireQuery);
  const ignored = hits.filter((h) => !usable.includes(h));
  const leftover = [...uncovered, ...ignored.flatMap((h) => tokens.slice(h.start, h.start + h.len))].filter(
    (t) => !NOISE.has(t) && !POSTCODE_RE.test(t)
  );
  const exact = leftover.length === 0;

  if (usable.length > 0) {
    const best = [...usable].sort(
      (a, b) =>
        LEVEL_RANK[a.entry.level] - LEVEL_RANK[b.entry.level] || b.len - a.len || a.start - b.start
    )[0];
    return { lat: best.entry.lat, lng: best.entry.lng, level: best.entry.level, exact };
  }

  const postcode = tokens.find((t) => POSTCODE_RE.test(t));
  if (postcode) {
    const c = getCoordinatesFromPostcode(postcode);
    if (c) return { lat: c.lat, lng: c.lng, level: 'postcode', exact };
  }

  return null;
}

function hashString(str: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SPREAD: Record<MatchLevel, number> = {
  coordinates: 0,
  landmark: 0.004,
  postcode: 0.005,
  town: 0.006,
  state: 0.015,
};

/**
 * Spread approximate (area-level) matches around their centre so that different addresses in the
 * same town do not stack on one pin. Deterministic per address: the same text always lands on the
 * same point, unlike the previous Math.random() jitter.
 */
export function approximate(match: LocalMatch, seed: string): LocationCoordinates {
  const spread = SPREAD[match.level];
  const key = seed.trim().toLowerCase();
  const dLat = (hashString(key, 1) / 0xffffffff - 0.5) * spread;
  const dLng = (hashString(key, 2) / 0xffffffff - 0.5) * spread;
  return { lat: Number((match.lat + dLat).toFixed(5)), lng: Number((match.lng + dLng).toFixed(5)) };
}

function nearestTown(c: LocationCoordinates, maxKm: number): Entry | null {
  let best: Entry | null = null;
  let bestDist = maxKm;
  for (const e of getIndex().entries) {
    if (e.level !== 'town') continue;
    const d = distanceKm(c, e);
    if (d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return best;
}

/** Instant autocomplete from the offline index (prefix, word-prefix and contained matches). */
export function searchLocal(query: string, limit = 8): LocalSuggestion[] {
  const tokens = tokenize(query);
  const q = tokens.join(' ');
  if (q.length < 2) return [];

  const padded = ` ${q} `;
  const scored: { entry: Entry; score: number }[] = [];
  for (const entry of getIndex().entries) {
    if (entry.hidden) continue;
    let score: number;
    if (entry.key === q) score = 0;
    else if (entry.key.startsWith(q)) score = 1;
    else if (` ${entry.key}`.includes(` ${q}`)) score = 2;
    else if (!entry.weak && padded.includes(` ${entry.key} `)) score = 3;
    else continue;
    scored.push({ entry, score });
  }

  // Closest name first ("Kuala Lumpur" before "Kuala Lumpur International Airport" for "kuala lump").
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      a.entry.key.length - b.entry.key.length ||
      LEVEL_RANK[a.entry.level] - LEVEL_RANK[b.entry.level]
  );

  const results: LocalSuggestion[] = [];
  const isDuplicate = (c: LocationCoordinates) =>
    results.some((r) => Math.abs(r.lat - c.lat) < 0.003 && Math.abs(r.lng - c.lng) < 0.003);

  const postcode = tokens.find((t) => POSTCODE_RE.test(t));
  const postcodeCoords = postcode ? getCoordinatesFromPostcode(postcode) : null;
  if (postcode && postcodeCoords && isReasonableCoordinates(postcodeCoords.lat, postcodeCoords.lng)) {
    const town = nearestTown(postcodeCoords, 25);
    const label = town
      ? `${postcode} ${town.name}, ${town.state ?? ''}, Malaysia`.replace(', ,', ',')
      : `${postcode}, Malaysia`;
    results.push({ displayName: label, ...postcodeCoords, strong: q === postcode });
  }

  for (const { entry, score } of scored) {
    if (results.length >= limit) break;
    if (isDuplicate(entry)) continue;
    results.push({ displayName: entry.label, lat: entry.lat, lng: entry.lng, strong: score <= 1 });
  }

  return results;
}
