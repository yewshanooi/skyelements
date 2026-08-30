"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import { Map, Marker, Popup, NavigationControl, LngLatBounds } from 'maplibre-gl';
import {
  MapPin,
  Maximize2,
  Minimize2,
  LocateFixed,
  X,
  Sparkles,
  Check,
  AlertCircle,
  Search,
  Loader2,
  Edit2,
} from 'lucide-react';
import type { SaleItem } from '@/types/sales';
import { geocodeAddress, searchLocations, type LocationSuggestion } from '@/services/sales/geocodeService';
import { normalizeCoordinates, extractEmbeddedCoordinates } from '@/lib/sales/locationParser';
import { NotionFilterBar } from './NotionFilterBar';
import { filterSales, type FilterState } from '@/lib/sales/filterUtils';
import { useBodyScrollLock } from '@/lib/sales/useBodyScrollLock';

interface MapViewProps {
  sales: SaleItem[];
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  onSelectSale: (sale: SaleItem) => void;
  onUpdateSaleLocation: (saleId: string, location: string, lat: number, lng: number) => Promise<void>;
  selectedSalePin?: SaleItem | null;
}

const STORAGE_KEY_MAP_VIEWPORT = 'sales_dashboard_map_viewport_v1';

const MAP_STYLE = {
  version: 8 as const,
  sources: {
    'osm-tiles': {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster' as const,
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

function computeSalesBounds(sales: SaleItem[]): LngLatBounds | null {
  const bounds = new LngLatBounds();
  let count = 0;
  for (const s of sales) {
    const norm = normalizeCoordinates(s.latitude, s.longitude);
    if (norm) {
      bounds.extend([norm.lng, norm.lat]);
      count++;
    }
  }
  return count > 0 ? bounds : null;
}

interface MapViewport {
  center: [number, number];
  zoom: number;
}

const getSavedViewport = (): MapViewport | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MAP_VIEWPORT);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        Array.isArray(parsed?.center) &&
        parsed.center.length === 2 &&
        typeof parsed.center[0] === 'number' &&
        typeof parsed.center[1] === 'number' &&
        typeof parsed.zoom === 'number' &&
        !isNaN(parsed.center[0]) &&
        !isNaN(parsed.center[1]) &&
        !isNaN(parsed.zoom)
      ) {
        return {
          center: [parsed.center[0], parsed.center[1]],
          zoom: parsed.zoom,
        };
      }
    }
  } catch {
    /* ignore storage error */
  }
  return null;
};


export const MapView: FC<MapViewProps> = ({
  sales,
  filters: propFilters,
  onFiltersChange: propOnFiltersChange,
  onSelectSale,
  onUpdateSaleLocation,
  selectedSalePin,
}) => {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const hasInitializedBoundsRef = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  useBodyScrollLock(isFullscreen);
  const [showNoPlaceDrawer, setShowNoPlaceDrawer] = useState(false);
  const [geocodingId, setGeocodingId] = useState<string | null>(null);
  const [successGeocodeId, setSuccessGeocodeId] = useState<string | null>(null);
  const [failedGeocodeMap, setFailedGeocodeMap] = useState<Record<string, string>>({});

  // Batch geocoding state
  const [isBatchGeocoding, setIsBatchGeocoding] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; success: number } | null>(null);

  // Manual address input and live suggestions
  const [manualAddressInput, setManualAddressInput] = useState<{ id: string; address: string } | null>(null);
  const [drawerSuggestions, setDrawerSuggestions] = useState<LocationSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map Filter state
  const [internalFilters, setInternalFilters] = useState<FilterState>({
    search: '',
    categories: [],
    stores: [],
    orderStatuses: [],
    paymentStatuses: ['Paid'],
    paymentMethods: [],
    dateRange: 'all',
  });

  const filters = propFilters ?? internalFilters;
  const setFilters = (newFilters: FilterState) => {
    if (propOnFiltersChange) {
      propOnFiltersChange(newFilters);
    } else {
      setInternalFilters(newFilters);
    }
  };

  // Filtered dataset
  const filteredSales = useMemo(() => {
    return filterSales(sales, filters);
  }, [sales, filters]);

  // Separate located sales from unlocated sales
  const locatedSales = useMemo(() => {
    return filteredSales.filter(
      (s) => normalizeCoordinates(s.latitude, s.longitude) !== null
    );
  }, [filteredSales]);

  const unlocatedSales = useMemo(() => {
    return filteredSales.filter(
      (s) => normalizeCoordinates(s.latitude, s.longitude) === null
    );
  }, [filteredSales]);

  // Count unlocated items that have an address string ready to be geocoded
  const geocodableUnlocatedSales = useMemo(() => {
    return unlocatedSales.filter((s) => s.location && s.location.trim().length > 0);
  }, [unlocatedSales]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const savedViewport = getSavedViewport();
      const defaultCenter: [number, number] = [108.5, 3.8]; // Central Malaysia / Borneo overview
      const defaultZoom = 5.2;

      const map = new Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: savedViewport ? savedViewport.center : defaultCenter,
        zoom: savedViewport ? savedViewport.zoom : defaultZoom,
        attributionControl: false,
      });

      map.addControl(new NavigationControl({ showCompass: true }), 'top-right');

      // Save user's viewport on pan/zoom
      const handleMoveEnd = () => {
        try {
          const center = map.getCenter();
          const zoom = map.getZoom();
          localStorage.setItem(
            STORAGE_KEY_MAP_VIEWPORT,
            JSON.stringify({
              center: [center.lng, center.lat],
              zoom,
            })
          );
        } catch {
          /* ignore storage error */
        }
      };

      map.on('moveend', handleMoveEnd);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Update Markers whenever located sales change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Create marker for each located sale
    locatedSales.forEach((sale) => {
      const norm = normalizeCoordinates(sale.latitude, sale.longitude);
      if (!norm) return;

      try {
        const el = document.createElement('div');
        el.className = 'group cursor-pointer flex flex-col items-center select-none';
        el.innerHTML = `
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

        // Custom Popup Card
        const popupContent = document.createElement('div');
        popupContent.className = 'p-3.5 min-w-[230px] max-w-[270px] text-xs font-sans bg-white dark:bg-[#202020] text-neutral-900 dark:text-neutral-100 transition-colors';
        popupContent.innerHTML = `
          <div class="flex items-start justify-between gap-2 border-b pb-2.5 pr-6 border-neutral-100 dark:border-neutral-800">
            <span class="font-semibold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2">${sale.item}</span>
          </div>
          <div class="space-y-1.5 pt-2 text-neutral-600 dark:text-neutral-300">
            <div class="flex items-center justify-between text-xs">
              <span class="text-neutral-400 dark:text-neutral-500 font-medium">Customer:</span>
              <span class="font-medium text-neutral-800 dark:text-neutral-200">${sale.customer}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-neutral-400 dark:text-neutral-500 font-medium">Date:</span>
              <span class="text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">${sale.date}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-neutral-400 dark:text-neutral-500 font-medium">Net Sales:</span>
              <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">RM ${sale.sales.toFixed(2)}</span>
            </div>
            ${sale.location
            ? `<div class="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-start gap-1.5 leading-relaxed">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span class="line-clamp-2">${sale.location}</span>
                  </div>`
            : ''
          }
          </div>
        `;

        popupContent.addEventListener('click', () => {
          onSelectSale(sale);
        });

        const popup = new Popup({
          offset: {
            'center': [0, 0],
            'top': [0, 8],
            'top-left': [0, 8],
            'top-right': [0, 8],
            'bottom': [0, -38],
            'bottom-left': [0, -38],
            'bottom-right': [0, -38],
            'left': [18, -18],
            'right': [-18, -18],
          },
          closeButton: true,
          maxWidth: '280px',
        }).setDOMContent(popupContent);

        const marker = new Marker({ element: el, anchor: 'bottom' })
          .setLngLat([norm.lng, norm.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      } catch (err) {
        console.warn(`[MapView] Error adding marker for sale ${sale.id}:`, err);
      }
    });

    // Auto-fit bounds ONLY on initial load if user has NO saved viewport and no specific pin is forced
    const savedViewport = getSavedViewport();
    if (!savedViewport && !hasInitializedBoundsRef.current && locatedSales.length > 0 && !selectedSalePin) {
      hasInitializedBoundsRef.current = true;
      const bounds = computeSalesBounds(locatedSales);
      if (bounds) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 600 });
      }
    }
  }, [locatedSales, onSelectSale, selectedSalePin]);

  // If a specific pin was selected from another view, fly to it & open its popup
  useEffect(() => {
    if (!selectedSalePin) return;
    const norm =
      normalizeCoordinates(selectedSalePin.latitude, selectedSalePin.longitude) ||
      extractEmbeddedCoordinates(selectedSalePin.location);
    if (!norm) return;

    const flyAndOpen = () => {
      const map = mapInstanceRef.current;
      if (!map) return;

      map.flyTo({
        center: [norm.lng, norm.lat],
        zoom: 14.5,
        duration: 1000,
      });

      const targetMarker = markersRef.current.find((m) => {
        const lngLat = m.getLngLat();
        return (
          Math.abs(lngLat.lng - norm.lng) < 0.0002 &&
          Math.abs(lngLat.lat - norm.lat) < 0.0002
        );
      });
      if (targetMarker && !targetMarker.getPopup()?.isOpen()) {
        targetMarker.togglePopup();
      }
    };

    flyAndOpen();
    const t1 = setTimeout(flyAndOpen, 300);
    const t2 = setTimeout(flyAndOpen, 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selectedSalePin, locatedSales]);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    const el = mapWrapperRef.current;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Fallback to CSS-only fullscreen state if Fullscreen API is blocked/unavailable
      setIsFullscreen((prev) => !prev);
    }
  }, []);

  // Listen to native fullscreen changes and resize map
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement && document.fullscreenElement === mapWrapperRef.current;
      setIsFullscreen(isNowFullscreen);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Resize map whenever isFullscreen changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || locatedSales.length === 0) return;

    const bounds = computeSalesBounds(locatedSales);
    if (bounds) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 600 });
    }
  };

  // Live suggestion search for manual input
  const handleAddressInputChange = (saleId: string, value: string) => {
    setManualAddressInput({ id: saleId, address: value });
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (value.trim().length >= 2) {
      setIsFetchingSuggestions(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const suggestions = await searchLocations(value);
          setDrawerSuggestions(suggestions);
        } catch {
          setDrawerSuggestions([]);
        } finally {
          setIsFetchingSuggestions(false);
        }
      }, 250);
    } else {
      setDrawerSuggestions([]);
      setIsFetchingSuggestions(false);
    }
  };

  // Auto-geocode single item
  const handleAutoGeocodeItem = async (sale: SaleItem) => {
    if (!sale.location) return;
    setGeocodingId(sale.id);
    setFailedGeocodeMap((prev) => {
      const copy = { ...prev };
      delete copy[sale.id];
      return copy;
    });

    try {
      const coords = await geocodeAddress(sale.location);
      if (coords) {
        setSuccessGeocodeId(sale.id);
        await onUpdateSaleLocation(sale.id, sale.location, coords.lat, coords.lng);
        setTimeout(() => setSuccessGeocodeId(null), 1500);
      } else {
        // Not resolved automatically -> open manual input with suggestions
        setFailedGeocodeMap((prev) => ({
          ...prev,
          [sale.id]: 'Coordinates not found. Type an area below.',
        }));
        handleAddressInputChange(sale.id, sale.location);
      }
    } catch {
      setFailedGeocodeMap((prev) => ({
        ...prev,
        [sale.id]: 'Geocoding request failed. Please assign location manually.',
      }));
      handleAddressInputChange(sale.id, sale.location);
    } finally {
      setGeocodingId(null);
    }
  };

  // Batch auto-geocode all unlocated items with an address
  const handleBatchGeocodeAll = async () => {
    if (geocodableUnlocatedSales.length === 0 || isBatchGeocoding) return;

    setIsBatchGeocoding(true);
    const total = geocodableUnlocatedSales.length;
    let current = 0;
    let success = 0;
    setBatchProgress({ current: 0, total, success: 0 });

    for (const sale of geocodableUnlocatedSales) {
      if (!sale.location) {
        current++;
        setBatchProgress({ current, total, success });
        continue;
      }

      try {
        const coords = await geocodeAddress(sale.location);
        if (coords) {
          await onUpdateSaleLocation(sale.id, sale.location, coords.lat, coords.lng);
          success++;
        }
      } catch (err) {
        console.warn(`Batch geocoding failed for ${sale.id}:`, err);
      } finally {
        current++;
        setBatchProgress({ current, total, success });
        // Minimal delay to prevent UI freezing
        await new Promise((r) => setTimeout(r, 40));
      }
    }

    setIsBatchGeocoding(false);
    setTimeout(() => setBatchProgress(null), 3000);
  };

  // Save manual address or suggestion
  const handleSelectSuggestionAndSave = async (saleId: string, displayName: string, lat: number, lng: number) => {
    setGeocodingId(saleId);
    try {
      await onUpdateSaleLocation(saleId, displayName, lat, lng);
      setManualAddressInput(null);
      setDrawerSuggestions([]);
      setFailedGeocodeMap((prev) => {
        const copy = { ...prev };
        delete copy[saleId];
        return copy;
      });
    } finally {
      setGeocodingId(null);
    }
  };

  const handleManualSave = async (saleId: string) => {
    if (!manualAddressInput || manualAddressInput.id !== saleId || !manualAddressInput.address.trim()) return;
    setGeocodingId(saleId);
    try {
      const query = manualAddressInput.address.trim();
      const coords = await geocodeAddress(query);
      if (coords) {
        await onUpdateSaleLocation(saleId, query, coords.lat, coords.lng);
      } else {
        await onUpdateSaleLocation(saleId, query, undefined as unknown as number, undefined as unknown as number);
      }
      setManualAddressInput(null);
      setDrawerSuggestions([]);
      setFailedGeocodeMap((prev) => {
        const copy = { ...prev };
        delete copy[saleId];
        return copy;
      });
    } finally {
      setGeocodingId(null);
    }
  };


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Notion Filter Bar for Map */}
      <NotionFilterBar
        storageKeyPrefix="map"
        showSort={false}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Map Card */}
      <div
        ref={mapWrapperRef}
        className={`relative rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#191919] shadow-2xs overflow-hidden flex flex-col transition-all duration-200 isolate [mask-image:radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)] ${isFullscreen
            ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none [mask-image:none] [-webkit-mask-image:none]'
            : 'h-[60vh] min-h-[380px] sm:h-[520px] md:h-[620px] rounded-xl'
          }`}
      >
        {/* Top Floating Action Bar */}
        <div className="absolute top-2 sm:top-3 right-12 sm:right-16 z-20 flex items-center gap-1.5 sm:gap-2 pointer-events-none max-w-[calc(100%-60px)]">
          {/* Notion "No location (X)" Counter Pill */}
          <button
            onClick={() => setShowNoPlaceDrawer(true)}
            className="pointer-events-auto px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium bg-white/95 dark:bg-[#202020]/95 backdrop-blur-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
            <span>No location ({unlocatedSales.length})</span>
          </button>

          {/* Fit all pins / Center map button */}
          <button
            onClick={handleFitBounds}
            className="pointer-events-auto p-1.5 sm:p-2 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer shrink-0"
            title="Fit to center / show all pins"
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen toggle button */}
          <button
            onClick={toggleFullscreen}
            className="pointer-events-auto p-1.5 sm:p-2 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer shrink-0"
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full rounded-xl overflow-hidden" />

        {/* Unlocated Items Drawer / Panel */}
        {showNoPlaceDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-full sm:w-96 max-w-full bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  No location ({unlocatedSales.length})
                </h3>
                <button
                  onClick={() => setShowNoPlaceDrawer(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Batch Auto-Geocode All Button */}
              {geocodableUnlocatedSales.length > 0 && (
                <button
                  onClick={handleBatchGeocodeAll}
                  disabled={isBatchGeocoding}
                  className="w-full py-1.5 px-3 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isBatchGeocoding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        Geocoding {batchProgress?.current || 0}/{batchProgress?.total || 0}...
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Auto-Geocode All ({geocodableUnlocatedSales.length})</span>
                    </>
                  )}
                </button>
              )}

              {/* Batch Progress Bar Banner */}
              {batchProgress && (
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                    <span>
                      Progress: {batchProgress.current} / {batchProgress.total}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {batchProgress.success} Pinned
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 transition-all duration-200"
                      style={{
                        width: `${Math.round((batchProgress.current / Math.max(1, batchProgress.total)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Item List */}
            <div className="p-3 overflow-y-auto overscroll-contain flex-1 space-y-2.5 text-xs">
              {unlocatedSales.length === 0 ? (
                <div className="text-center py-16 space-y-2 text-neutral-400">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-neutral-700 dark:text-neutral-300">All Orders Pinned!</p>
                  <p className="text-[11px]">Every filtered order has coordinates on the map.</p>
                </div>
              ) : (
                unlocatedSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                  >
                    <div className="font-semibold text-neutral-800 dark:text-neutral-200 leading-snug">
                      {sale.item}
                    </div>
                    <div className="flex justify-between text-neutral-500 text-[11px]">
                      <span>Customer: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{sale.customer}</strong></span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">RM {sale.sales.toFixed(2)}</span>
                    </div>

                    {/* Geocode Error Message */}
                    {failedGeocodeMap[sale.id] && (
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded text-amber-700 dark:text-amber-400 text-[11px] flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <span>{failedGeocodeMap[sale.id]}</span>
                      </div>
                    )}

                    {/* Location Info & Geocode Controls */}
                    {sale.location && manualAddressInput?.id !== sale.id ? (
                      <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className="text-neutral-600 dark:text-neutral-400 text-[11px] line-clamp-2" title={sale.location}>
                            📍 {sale.location}
                          </p>
                          <button
                            onClick={() => handleAddressInputChange(sale.id, sale.location || '')}
                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded cursor-pointer shrink-0"
                            title="Edit Address"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleAutoGeocodeItem(sale)}
                          disabled={geocodingId === sale.id || isBatchGeocoding}
                          className={`w-full py-1 text-center rounded font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs ${successGeocodeId === sale.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40'
                            }`}
                        >
                          {geocodingId === sale.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Geocoding...</span>
                            </>
                          ) : successGeocodeId === sale.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Pinned!</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>Geocode Coordinates</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Manual / Interactive Location Search */
                      <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                        {manualAddressInput?.id === sale.id ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                              <input
                                type="text"
                                placeholder="Search town, city, or address..."
                                value={manualAddressInput.address}
                                onChange={(e) => handleAddressInputChange(sale.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleManualSave(sale.id);
                                }}
                                className="w-full pl-8 pr-7 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                autoFocus={typeof window !== 'undefined' ? window.innerWidth >= 768 : false}
                              />
                              {isFetchingSuggestions && (
                                <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
                              )}
                            </div>

                            {/* Live Suggestions Dropdown */}
                            {drawerSuggestions.length > 0 && (
                              <div className="max-h-36 overflow-y-auto space-y-1 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 rounded-lg p-1">
                                {drawerSuggestions.map((s, idx) => (
                                  <button
                                    key={`${s.lat}-${s.lng}-${idx}`}
                                    onClick={() => handleSelectSuggestionAndSave(sale.id, s.displayName, s.lat, s.lng)}
                                    className="w-full text-left px-2 py-1 rounded hover:bg-white dark:hover:bg-neutral-800 text-[11px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span className="truncate">{s.displayName}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-1.5 pt-1">
                              <button
                                onClick={() => handleManualSave(sale.id)}
                                disabled={geocodingId === sale.id}
                                className="flex-1 py-1.5 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {geocodingId === sale.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>Save & Pin</span>
                              </button>
                              <button
                                onClick={() => {
                                  setManualAddressInput(null);
                                  setDrawerSuggestions([]);
                                }}
                                className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddressInputChange(sale.id, '')}
                            className="w-full py-1 text-center bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium transition-colors cursor-pointer text-xs"
                          >
                            + Assign Location
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
