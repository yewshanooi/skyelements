/**
 * Normalizes and validates latitude and longitude coordinates.
 * Handles swapped lat/lng pairs automatically (e.g. [101.68, 3.14] -> [3.14, 101.68]).
 */
export function normalizeCoordinates(
  lat?: number | string | null,
  lng?: number | string | null
): { lat: number; lng: number } | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;

  let parsedLat = typeof lat === 'number' ? lat : parseFloat(String(lat).trim());
  let parsedLng = typeof lng === 'number' ? lng : parseFloat(String(lng).trim());

  if (isNaN(parsedLat) || isNaN(parsedLng)) return null;

  // Auto-detect and fix inverted lat/lng
  // In Malaysia & SE Asia: Lat is ~ -11 to 25, Lng is ~ 95 to 145
  // Globally: Lat cannot exceed 90. If lat > 90, it must be longitude.
  if (Math.abs(parsedLat) > 90 || (Math.abs(parsedLat) > 35 && Math.abs(parsedLng) <= 35)) {
    const temp = parsedLat;
    parsedLat = parsedLng;
    parsedLng = temp;
  }

  // Ensure lat is within [-90, 90] and lng within [-180, 180]
  if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
    return null;
  }

  return {
    lat: Number(parsedLat.toFixed(5)),
    lng: Number(parsedLng.toFixed(5)),
  };
}

/**
 * Client-side lightweight coordinate parser (Regex based)
 * Extracts direct latitude/longitude if coordinates or map URLs are embedded.
 */
export function extractEmbeddedCoordinates(text?: string | null): { lat: number; lng: number } | null {
  if (!text || typeof text !== 'string') return null;

  // 1. Google Maps / Apple Maps / Waze URLs: @lat,lng or ?q=lat,lng or /ll/lat,lng or place/lat,lng
  const urlMatch =
    text.match(/@([-+]?\d{1,3}\.\d+),([-+]?\d{1,3}\.\d+)/) ||
    text.match(/[?&]q=([-+]?\d{1,3}\.\d+),([-+]?\d{1,3}\.\d+)/) ||
    text.match(/[?&]ll=([-+]?\d{1,3}\.\d+),([-+]?\d{1,3}\.\d+)/) ||
    text.match(/place\/([-+]?\d{1,3}\.\d+),([-+]?\d{1,3}\.\d+)/);

  if (urlMatch) {
    const n1 = parseFloat(urlMatch[1]);
    const n2 = parseFloat(urlMatch[2]);
    const normalized = normalizeCoordinates(n1, n2);
    if (normalized) return normalized;
  }

  // 2. Direct coordinate pairs or GeoJSON/WKT format: "4.3110, 101.1500" or "[101.1500, 4.3110]" or "POINT(101.15 4.31)"
  const pairMatch = text.match(/(?:geo:|POINT\s*\(|[\[(])?([-+]?\d{1,3}\.\d{2,})[,\s]+([-+]?\d{1,3}\.\d{2,})[\])]?/i);
  if (pairMatch) {
    const n1 = parseFloat(pairMatch[1]);
    const n2 = parseFloat(pairMatch[2]);
    const normalized = normalizeCoordinates(n1, n2);
    if (normalized) return normalized;
  }

  return null;
}

