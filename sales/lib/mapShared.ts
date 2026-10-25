import type { StyleSpecification } from 'maplibre-gl';

export const MAPLIBRE_WORKER_URL = new URL(
  'maplibre-gl/dist/maplibre-gl-worker.mjs',
  import.meta.url,
).toString();

/** Raster OSM style shared by the full map and the table mini-map. */
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
    },
  ],
};

const PIN_HTML = `
  <div class="relative flex flex-col items-center group">
    <div class="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 border-2 border-white dark:border-neutral-900 shadow-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3" fill="white"/>
      </svg>
    </div>
    <div class="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rotate-45 -mt-1.5 shadow-xs border-r-2 border-b-2 border-white dark:border-neutral-900 z-0"></div>
    <div class="w-2 h-1 bg-black/20 dark:bg-black/40 rounded-full mt-0.5 blur-[1px]"></div>
  </div>
`;

/** Map pin DOM element used by both map views. */
export function createPinElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'group cursor-pointer flex flex-col items-center select-none';
  el.innerHTML = PIN_HTML;
  return el;
}
