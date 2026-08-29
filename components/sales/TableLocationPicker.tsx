"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { FC } from 'react';
import { Map, Marker } from 'maplibre-gl';
import {
  Search,
  Navigation,
  Copy,
  ExternalLink,
  Check,
  X,
  Loader2,
  MapPin,
} from 'lucide-react';

import { geocodeAddress, searchLocations } from '@/services/sales/geocodeService';
import type { LocationSuggestion } from '@/services/sales/geocodeService';
import { normalizeCoordinates, extractEmbeddedCoordinates } from '@/lib/sales/locationParser';
import type { SaleItem } from '@/types/sales';
import { useTheme } from '@/lib/sales/useTheme';

interface TableLocationPickerProps {
  sale: SaleItem;
  onSaveLocation: (location: string, lat?: number, lng?: number) => void;
  onOpenFullMap?: () => void;
  onClose: () => void;
}

export const TableLocationPicker: FC<TableLocationPickerProps> = ({
  sale,
  onSaveLocation,
  onOpenFullMap,
  onClose,
}) => {
  const { isDarkMode } = useTheme();
  const validCoords = normalizeCoordinates(sale.latitude, sale.longitude) || extractEmbeddedCoordinates(sale.location);
  const hasValidCoords = !!sale.location && validCoords !== null;

  const [viewMode, setViewMode] = useState<'preview' | 'search'>(
    hasValidCoords ? 'preview' : 'search'
  );
  const [searchQuery, setSearchQuery] = useState(sale.location || '');
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    placement: 'bottom' | 'top';
  } | null>(null);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Background auto-geocode if sale has location text but missing coordinates
  useEffect(() => {
    const loc = sale.location;
    if (!validCoords && loc && loc.trim().length >= 3) {
      let isCancelled = false;
      geocodeAddress(loc).then((res) => {
        if (!isCancelled && res) {
          const norm = normalizeCoordinates(res.lat, res.lng);
          if (norm) {
            onSaveLocation(loc, norm.lat, norm.lng);
            setViewMode('preview');
          }
        }
      });
      return () => {
        isCancelled = true;
      };
    }
  }, [sale.location, validCoords, onSaveLocation]);

  const computePosition = () => {
    const anchor = anchorRef.current?.parentElement || anchorRef.current;
    if (!anchor) return;
    const parentRect = anchor.getBoundingClientRect();
    if (parentRect.width === 0 && parentRect.height === 0) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = containerRef.current?.offsetWidth || 320;
    const popoverHeight = containerRef.current?.offsetHeight || 320;

    const spaceBelow = viewportHeight - parentRect.bottom;
    const spaceAbove = parentRect.top;

    let placement: 'bottom' | 'top' = 'bottom';
    if (spaceBelow < Math.min(popoverHeight, 330) && (spaceAbove > spaceBelow || spaceAbove > 200)) {
      placement = 'top';
    }

    let left = parentRect.left;
    if (left + popoverWidth > viewportWidth - 12) {
      left = parentRect.right - popoverWidth;
    }
    left = Math.max(12, Math.min(left, viewportWidth - popoverWidth - 12));

    if (placement === 'top') {
      setCoords({
        bottom: viewportHeight - parentRect.top + 4,
        left,
        placement: 'top',
      });
    } else {
      setCoords({
        top: parentRect.bottom + 4,
        left,
        placement: 'bottom',
      });
    }
  };

  useLayoutEffect(() => {
    computePosition();
  }, [viewMode, suggestions]);

  useEffect(() => {
    computePosition();
    const handleScrollOrResize = () => {
      computePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }
      const anchor = anchorRef.current?.parentElement;
      if (anchor && anchor.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Mini Map setup
  useEffect(() => {
    const norm = normalizeCoordinates(sale.latitude, sale.longitude) || extractEmbeddedCoordinates(sale.location);
    if (
      viewMode !== 'preview' ||
      !coords ||
      !norm ||
      !miniMapRef.current
    ) {
      return;
    }

    const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const map = new Map({
      container: miniMapRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [norm.lng, norm.lat],
      zoom: 14,
      attributionControl: false,
      interactive: true,
    });

    const el = document.createElement('div');
    el.className = 'flex flex-col items-center select-none cursor-pointer z-10';
    el.innerHTML = `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 border-2 border-white dark:border-neutral-900 shadow-md flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3" fill="white"/>
          </svg>
        </div>
        <div class="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rotate-45 -mt-1.5 shadow-xs border-r-2 border-b-2 border-white dark:border-neutral-900 z-0"></div>
        <div class="w-2 h-1 bg-black/20 dark:bg-black/40 rounded-full mt-0.5 blur-[1px]"></div>
      </div>
    `;

    new Marker({ element: el, anchor: 'bottom' })
      .setLngLat([norm.lng, norm.lat])
      .addTo(map);

    map.on('load', () => {
      map.resize();
    });

    mapInstanceRef.current = map;

    const t1 = setTimeout(() => mapInstanceRef.current?.resize(), 60);
    const t2 = setTimeout(() => mapInstanceRef.current?.resize(), 200);
    const t3 = setTimeout(() => mapInstanceRef.current?.resize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [viewMode, sale.latitude, sale.longitude, sale.location, isDarkMode, !!coords]);

  // Debounced location search
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setIsFetchingSuggestions(true);
    try {
      const results = await searchLocations(query);
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(searchQuery);
      }, 300);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, fetchSuggestions]);

  const handleSearchAndSelect = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearching(true);
    try {
      const coords = await geocodeAddress(queryText);
      if (coords) {
        const norm = normalizeCoordinates(coords.lat, coords.lng);
        onSaveLocation(queryText, norm?.lat ?? coords.lat, norm?.lng ?? coords.lng);
      } else {
        onSaveLocation(queryText);
      }
      onClose();
    } catch {
      onSaveLocation(queryText);
      onClose();
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    const norm = normalizeCoordinates(suggestion.lat, suggestion.lng);
    onSaveLocation(suggestion.displayName, norm?.lat ?? suggestion.lat, norm?.lng ?? suggestion.lng);
    onClose();
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const norm = normalizeCoordinates(lat, lng);
          const finalLat = norm?.lat ?? lat;
          const finalLng = norm?.lng ?? lng;
          const label = `Lat: ${finalLat.toFixed(4)}, Lng: ${finalLng.toFixed(4)}`;
          onSaveLocation(label, finalLat, finalLng);
          onClose();
        },
        () => {
          // fallback
          onSaveLocation('Kuala Lumpur, Malaysia', 3.139, 101.6869);
          onClose();
        }
      );
    } else {
      onSaveLocation('Kuala Lumpur, Malaysia', 3.139, 101.6869);
      onClose();
    }
  };

  const handleCopy = () => {
    if (sale.location) {
      navigator.clipboard.writeText(sale.location);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };


  return (
    <>
      <span ref={anchorRef} className="contents pointer-events-none" />
      {coords &&
        createPortal(
          <div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              ...(coords.placement === 'top'
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            className="w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 text-xs select-none"
          >
            {viewMode === 'preview' ? (
              /* Preview Mini-Map Card (Screenshot 4) */
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 leading-snug">
                      {sale.location?.split(',')[0] || sale.location || 'Pinned Location'}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                      {sale.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                      title="Copy address"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {onOpenFullMap && (
                      <button
                        onClick={() => {
                          onOpenFullMap();
                          onClose();
                        }}
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                        title="Open in Map view"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Embedded Mini-Map */}
                <div className="w-full h-44 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 relative shadow-inner">
                  <div ref={miniMapRef} className="w-full h-full" />
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    onClick={() => setViewMode('search')}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Change location
                  </button>
                  <button
                    onClick={() => {
                      onSaveLocation('', undefined, undefined);
                      onClose();
                    }}
                    className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    Remove pin
                  </button>
                </div>
              </div>
            ) : (
              /* Search Location Popover */
              <div className="p-2.5 space-y-2">
                <div className="relative">
                  {isSearching ? (
                    <Loader2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  )}
                  <input
                    type="text"
                    placeholder="Search for a location..."
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (!val.trim() || val.trim().length < 2) {
                        setSuggestions([]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchAndSelect(searchQuery);
                    }}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500/40"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Location Suggestions */}
                {(suggestions.length > 0 || isFetchingSuggestions) && (
                  <>
                    <div className="border-t border-neutral-100 dark:border-neutral-800" />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin">
                      {isFetchingSuggestions && suggestions.length === 0 ? (
                        <div className="flex items-center gap-2 px-2.5 py-2 text-neutral-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[11px]">Searching locations...</span>
                        </div>
                      ) : (
                        suggestions.map((s, idx) => (
                          <button
                            key={`${s.lat}-${s.lng}-${idx}`}
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition-colors group/loc"
                          >
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5 group-hover/loc:text-blue-500 transition-colors" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                                {s.displayName.split(',')[0]}
                              </div>
                              {s.displayName.includes(',') && (
                                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                                  {s.displayName.split(',').slice(1).join(',').trim()}
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}

                <div className="border-t border-neutral-100 dark:border-neutral-800" />

                {/* Current Location Option */}
                <button
                  onClick={handleUseCurrentLocation}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors text-left cursor-pointer text-xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                  <span>Current Location</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
