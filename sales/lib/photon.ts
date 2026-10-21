/**
 * Komoot Photon client (OSM-backed, CORS enabled). Isomorphic: the browser calls it directly,
 * which removes the server-action + auth round trip that used to sit in front of every keystroke.
 */
import { isReasonableCoordinates, type LocationSuggestion } from '@/sales/lib/geoData';
import { normalizeCoordinates } from '@/sales/lib/locationParser';

const PHOTON_URL = 'https://photon.komoot.io';
/** Bias towards central Malaysia and hard-limit results to Southeast Asia. */
const BIAS = { lat: 4.2105, lon: 101.9758 };
const REGION_BBOX = '95,-11,145,22'; // minLon,minLat,maxLon,maxLat
const RESULT_LIMIT = 8;
const MAX_QUERY_LENGTH = 180;
const CACHE_MAX = 200;
export const DEFAULT_TIMEOUT_MS = 4000;

// Browsers forbid setting User-Agent (and extra headers would trigger a CORS preflight), so this is server only.
const SERVER_HEADERS: HeadersInit | undefined =
  typeof window === 'undefined'
    ? { Accept: 'application/json', 'User-Agent': 'SkyelementsApp/1.0 (internal-sales-dashboard)' }
    : undefined;

/** Strip unit/lot prefixes and venue words that confuse OSM text matching. */
export function cleanQueryForApi(raw: string): string {
  const cleaned = raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/^(?:no\.?|lot|unit|blok|tingkat|level)\s*[\w\d/-]+[^,]*,/gi, '')
    .replace(/^(?:kedai\s+makan|restoran|warung)\s+/i, '')
    .replace(/,\s*malaysia\s*,?\s*malaysia/gi, ', Malaysia')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '');
  return (cleaned || raw.trim()).slice(0, MAX_QUERY_LENGTH);
}

const cacheKey = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim();

// Small LRU of successful responses (an empty array is a valid, cacheable "no results").
const cache = new Map<string, LocationSuggestion[]>();

export function peekPhotonCache(query: string): LocationSuggestion[] | undefined {
  const key = cacheKey(cleanQueryForApi(query));
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

function remember(key: string, value: LocationSuggestion[]) {
  cache.set(key, value);
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

interface PhotonProps {
  name?: string;
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
  district?: string;
  locality?: string;
  state?: string;
  country?: string;
}

interface PhotonFeature {
  geometry?: { coordinates?: number[] };
  properties?: PhotonProps;
}

function buildDisplayName(p: PhotonProps): string {
  const street = p.street ? `${p.housenumber ? `${p.housenumber} ` : ''}${p.street}` : undefined;
  const area = p.city || p.district || p.locality;
  const areaWithPostcode = area ? `${p.postcode ? `${p.postcode} ` : ''}${area}` : p.postcode;

  const parts: string[] = [];
  for (const part of [p.name, street, areaWithPostcode, p.state, p.country]) {
    if (!part) continue;
    // Skip adjacent repeats such as "Kampar, Kampar".
    if (parts.length > 0 && parts[parts.length - 1].toLowerCase() === part.toLowerCase()) continue;
    parts.push(part);
  }
  return parts.join(', ');
}

function parseFeatures(features: PhotonFeature[]): LocationSuggestion[] {
  const out: LocationSuggestion[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const c = f.geometry?.coordinates;
    if (!Array.isArray(c) || c.length < 2) continue;
    const norm = normalizeCoordinates(c[1], c[0]);
    if (!norm || !isReasonableCoordinates(norm.lat, norm.lng)) continue;

    const displayName = buildDisplayName(f.properties ?? {});
    if (!displayName) continue;
    const dedupeKey = displayName.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({ displayName, lat: norm.lat, lng: norm.lng });
  }
  return out;
}

async function photonFetch(
  url: string,
  signal: AbortSignal | undefined,
  timeoutMs: number
): Promise<PhotonFeature[] | null> {
  if (signal?.aborted) return null;

  // One controller merges the caller's signal with our own timeout.
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal, headers: SERVER_HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: PhotonFeature[] };
    return Array.isArray(data?.features) ? data.features : [];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface PhotonOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Forward search. Resolves to `null` on failure (network, timeout, abort, HTTP error) and to an
 * array (possibly empty) when Photon answered. Only answers are cached, never failures.
 */
export async function photonSearch(
  query: string,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: PhotonOptions = {}
): Promise<LocationSuggestion[] | null> {
  const q = cleanQueryForApi(query);
  if (q.length < 2) return [];

  const key = cacheKey(q);
  const cached = cache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    q,
    lat: String(BIAS.lat),
    lon: String(BIAS.lon),
    limit: String(RESULT_LIMIT),
    bbox: REGION_BBOX,
  });
  const features = await photonFetch(`${PHOTON_URL}/api/?${params}`, signal, timeoutMs);
  if (features === null) return null;

  const results = parseFeatures(features);
  remember(key, results);
  return results;
}

/** Reverse geocode a point to a readable label, or `null` if unavailable. */
export async function photonReverse(
  lat: number,
  lng: number,
  { signal, timeoutMs = 2500 }: PhotonOptions = {}
): Promise<string | null> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), limit: '1' });
  const features = await photonFetch(`${PHOTON_URL}/reverse?${params}`, signal, timeoutMs);
  const props = features?.[0]?.properties;
  return props ? buildDisplayName(props) || null : null;
}
