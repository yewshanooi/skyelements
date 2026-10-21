"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { FC, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
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

import { geocodeAddress, type LocationSuggestion } from '@/sales/lib/geocoder';
import { photonReverse } from '@/sales/lib/photon';
import { useLocationSearch } from '@/sales/hooks/useLocationSearch';
import { normalizeCoordinates, extractEmbeddedCoordinates } from '@/sales/lib/locationParser';
import { MAP_STYLE, createPinElement } from '@/sales/lib/mapShared';
import type { SaleItem } from '@/sales/types';

interface TableLocationPickerProps {
  sale: SaleItem;
  onSaveLocation: (location: string, lat?: number, lng?: number) => void;
  onOpenFullMap?: () => void;
  onClose: () => void;
}

interface PopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  placement: 'bottom' | 'top';
}

export const TableLocationPicker: FC<TableLocationPickerProps> = ({
  sale,
  onSaveLocation,
  onOpenFullMap,
  onClose,
}) => {
  // Memoised so effects keyed on it do not re-run on every render.
  const pinCoords = useMemo(
    () => normalizeCoordinates(sale.latitude, sale.longitude) || extractEmbeddedCoordinates(sale.location),
    [sale.latitude, sale.longitude, sale.location]
  );
  const hasValidCoords = !!sale.location && pinCoords !== null;

  const [viewMode, setViewMode] = useState<'preview' | 'search'>(hasValidCoords ? 'preview' : 'search');
  const [searchQuery, setSearchQuery] = useState(sale.location || '');
  const [hasTyped, setHasTyped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  // Offline matches show instantly; the network is only hit once the user actually types.
  const { suggestions, isLoading } = useLocationSearch(searchQuery, viewMode === 'search' && hasTyped);
  const highlighted = Math.min(activeIndex, suggestions.length - 1);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const hasTypedRef = useRef(false);
  const onSaveRef = useRef(onSaveLocation);
  useEffect(() => {
    onSaveRef.current = onSaveLocation;
  });

  // Background auto-geocode when the sale has location text but no coordinates yet.
  // Runs once per location text (not on every parent re-render) and never overrides what the user is typing.
  useEffect(() => {
    const loc = sale.location?.trim();
    if (pinCoords || !loc || loc.length < 3) return;

    const controller = new AbortController();
    geocodeAddress(loc, { signal: controller.signal }).then((res) => {
      if (controller.signal.aborted || hasTypedRef.current || !res) return;
      const norm = normalizeCoordinates(res.lat, res.lng);
      if (norm) {
        onSaveRef.current(loc, norm.lat, norm.lng);
        setViewMode('preview');
      }
    });
    return () => controller.abort();
  }, [sale.location, pinCoords]);

  const computePosition = useCallback(() => {
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

    const next: PopoverPosition =
      placement === 'top'
        ? { bottom: viewportHeight - parentRect.top + 4, left, placement }
        : { top: parentRect.bottom + 4, left, placement };

    // Scroll events fire constantly; skip the re-render when nothing moved.
    setPosition((prev) =>
      prev &&
      prev.placement === next.placement &&
      prev.left === next.left &&
      prev.top === next.top &&
      prev.bottom === next.bottom
        ? prev
        : next
    );
  }, []);

  useLayoutEffect(() => {
    computePosition();
  }, [computePosition, viewMode, suggestions.length]);

  useEffect(() => {
    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', computePosition, true);
    return () => {
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
    };
  }, [computePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (anchorRef.current?.parentElement?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Mini map. maplibre-gl is loaded on demand so it is not part of the table / modal bundle.
  const isPositioned = position !== null;
  useEffect(() => {
    const container = miniMapRef.current;
    if (viewMode !== 'preview' || !isPositioned || !pinCoords || !container) return;

    let disposed = false;
    let map: MapLibreMap | null = null;
    let observer: ResizeObserver | null = null;

    import('maplibre-gl').then(({ Map, Marker }) => {
      if (disposed) return;
      map = new Map({
        container,
        style: MAP_STYLE,
        center: [pinCoords.lng, pinCoords.lat],
        zoom: 14,
        attributionControl: false,
      });
      new Marker({ element: createPinElement(), anchor: 'bottom' })
        .setLngLat([pinCoords.lng, pinCoords.lat])
        .addTo(map);

      // The popover animates in; keep the canvas in sync with its real size.
      observer = new ResizeObserver(() => map?.resize());
      observer.observe(container);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [viewMode, isPositioned, pinCoords]);

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    setActiveIndex(-1);
    setLocateError(null);
    if (!hasTypedRef.current) {
      hasTypedRef.current = true;
      setHasTyped(true);
    }
  };

  const handleSearchAndSelect = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isSearching) return;
    setIsSearching(true);
    try {
      const coords = await geocodeAddress(text);
      const norm = coords ? normalizeCoordinates(coords.lat, coords.lng) : null;
      if (norm) onSaveLocation(text, norm.lat, norm.lng);
      else onSaveLocation(text);
    } catch {
      onSaveLocation(text);
    } finally {
      setIsSearching(false);
      onClose();
    }
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    const norm = normalizeCoordinates(suggestion.lat, suggestion.lng);
    onSaveLocation(suggestion.displayName, norm?.lat ?? suggestion.lat, norm?.lng ?? suggestion.lng);
    onClose();
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((highlighted + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex(highlighted <= 0 ? suggestions.length - 1 : highlighted - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0) handleSelectSuggestion(suggestions[highlighted]);
      else handleSearchAndSelect(searchQuery);
    }
  };

  const handleUseCurrentLocation = () => {
    if (isLocating) return;
    if (!navigator.geolocation) {
      setLocateError('Location is not supported by this browser.');
      return;
    }
    setIsLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        // Raw GPS values: normalizeCoordinates() is tuned for lat/lng mix-ups in typed data, not sensors.
        const lat = Number(coords.latitude.toFixed(5));
        const lng = Number(coords.longitude.toFixed(5));
        const label = (await photonReverse(lat, lng)) ?? `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        onSaveLocation(label, lat, lng);
        onClose();
      },
      (err) => {
        setIsLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied.'
            : 'Could not get your current location.'
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  };

  const handleCopy = () => {
    if (sale.location) {
      navigator.clipboard.writeText(sale.location);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const showNoResults = hasTyped && !isLoading && suggestions.length === 0 && searchQuery.trim().length >= 3;

  return (
    <>
      <span ref={anchorRef} className="contents pointer-events-none" />
      {position &&
        createPortal(
          <div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              ...(position.placement === 'top'
                ? { bottom: `${position.bottom}px` }
                : { top: `${position.top}px` }),
              left: `${position.left}px`,
              zIndex: 99999,
            }}
            className="w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 text-xs select-none"
          >
            {viewMode === 'preview' ? (
              /* Preview Mini-Map Card */
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
                  {isSearching || isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  )}
                  <input
                    type="text"
                    role="combobox"
                    aria-expanded={suggestions.length > 0}
                    aria-controls="location-suggestions"
                    aria-activedescendant={highlighted >= 0 ? `location-option-${highlighted}` : undefined}
                    aria-autocomplete="list"
                    placeholder="Search for a location..."
                    value={searchQuery}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500/40"
                    autoFocus={typeof window !== 'undefined' ? window.innerWidth >= 768 : false}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleQueryChange('')}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Location Suggestions */}
                {(suggestions.length > 0 || isLoading || showNoResults) && (
                  <>
                    <div className="border-t border-neutral-100 dark:border-neutral-800" />
                    <div
                      id="location-suggestions"
                      role="listbox"
                      className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin"
                    >
                      {suggestions.length === 0 ? (
                        <div className="flex items-center gap-2 px-2.5 py-2 text-neutral-400">
                          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span className="text-[11px]">
                            {isLoading ? 'Searching locations...' : 'No matches. Press Enter to use it as typed.'}
                          </span>
                        </div>
                      ) : (
                        suggestions.map((s, idx) => (
                          <button
                            key={`${s.lat}-${s.lng}-${idx}`}
                            id={`location-option-${idx}`}
                            role="option"
                            aria-selected={idx === highlighted}
                            ref={idx === highlighted ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                            onClick={() => handleSelectSuggestion(s)}
                            className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition-colors group/loc ${
                              idx === highlighted ? 'bg-neutral-100 dark:bg-neutral-800' : ''
                            }`}
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
                  disabled={isLocating}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors text-left cursor-pointer text-xs disabled:opacity-60"
                >
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                  )}
                  <span>{isLocating ? 'Locating...' : 'Current Location'}</span>
                </button>
                {locateError && (
                  <p className="px-2.5 pb-1 text-[11px] text-amber-600 dark:text-amber-400">{locateError}</p>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
