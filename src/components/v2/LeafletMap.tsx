import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Event } from '@/types/event';
import { format, parseISO } from 'date-fns';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface LeafletMapProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
  className?: string;
  zoom?: number;
  center?: [number, number];
  interactive?: boolean;
  showWatermark?: boolean;
}

type PlottedEvent = Event & { lat: number; lng: number };

// One icon shared by every marker. Building a fresh L.divIcon per marker per
// render makes Leaflet re-measure the same 24px circle dozens of times over.
const markerIcon = L.divIcon({
  html: `<div style="width: 24px; height: 24px; background-color: #B34629; border: 2px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`,
  className: 'custom-div-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Plain DOM rather than a React root per marker: with a single link in it, a
// root costs considerably more than the popup it renders, and it was previously
// remounted for every marker on every render without ever being unmounted.
const buildPopup = (
  event: Event,
  onViewDetails: (event: Event) => void,
  closePopup: () => void
): HTMLElement => {
  const wrap = document.createElement('div');
  wrap.className = 'p-3 min-w-[180px] space-y-2';

  const title = document.createElement('h3');
  title.className = 'font-black text-primary text-base leading-tight';
  title.textContent = event.event_name;

  const meta = document.createElement('div');
  meta.className = 'space-y-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider';

  const date = document.createElement('div');
  date.className = 'flex items-center gap-2';
  date.textContent = format(parseISO(event.event_date), 'MMM d, yyyy');

  const place = document.createElement('div');
  place.className = 'flex items-center gap-2 truncate';
  place.textContent = event.place_name || 'Location';

  meta.append(date, place);

  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'h-auto p-0 text-primary font-black text-[11px] mt-1';
  link.textContent = 'View Details →';
  link.addEventListener('click', () => {
    closePopup();
    onViewDetails(event);
  });

  wrap.append(title, meta, link);
  return wrap;
};

const LeafletMap: React.FC<LeafletMapProps> = ({
  events,
  onViewDetails,
  className,
  zoom = 4,
  center = [-25.2744, 133.7751],
  interactive = true,
  showWatermark = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const initCenterRef = useRef(center);
  const initZoomRef = useRef(zoom);
  const initInteractiveRef = useRef(interactive);

  // Read inside the marker effect but deliberately not a dependency of it: the
  // call sites pass a plain function, so depending on it rebuilt every marker on
  // every parent render.
  const onViewDetailsRef = useRef(onViewDetails);
  useEffect(() => { onViewDetailsRef.current = onViewDetails; });

  // Events we already hold coordinates for plot on the first frame, which is the
  // entire point of storing them. Anything the geocode-events function hasn't
  // reached yet is left off the map rather than geocoded in the browser, which
  // is what used to cost over a minute for seventy addresses.
  const plotted = useMemo(
    () =>
      events
        .filter(
          (e): e is Event & { latitude: number; longitude: number } =>
            typeof e.latitude === 'number' && typeof e.longitude === 'number'
        )
        .map((e) => ({ ...e, lat: e.latitude, lng: e.longitude })),
    [events]
  );

  // Identity of the plotted set, not the array: the parent may hand us a fresh
  // array on every render, and that must not rebuild the markers or re-frame.
  const plottedKey = useMemo(() => plotted.map((e) => e.id).join(','), [plotted]);
  const plottedRef = useRef<PlottedEvent[]>(plotted);
  useEffect(() => { plottedRef.current = plotted; }, [plotted]);

  // 1. Map init (runs once; center/zoom/interactive are captured at init)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: initCenterRef.current,
      zoom: initZoomRef.current,
      scrollWheelZoom: initInteractiveRef.current,
      zoomControl: false,
      dragging: initInteractiveRef.current,
      touchZoom: initInteractiveRef.current,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    resizeObserver.observe(mapRef.current);

    const settleTimer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 500);

    return () => {
      clearTimeout(settleTimer);
      resizeObserver.disconnect();
      markersLayerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Markers: built once per change of set, never once per geocoded address.
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();
    const current = plottedRef.current;

    current.forEach((event) => {
      const marker = L.marker([event.lat, event.lng], { icon: markerIcon });
      marker.bindPopup(
        buildPopup(
          event,
          (e) => onViewDetailsRef.current(e),
          () => mapInstanceRef.current?.closePopup()
        ),
        { className: 'custom-leaflet-popup', maxWidth: 300 }
      );
      markersLayer.addLayer(marker);
    });
  }, [plottedKey]);

  // 3. Frame the view once per change of set. This used to run on every marker
  // update, re-fitting bounds to a partial result and dragging the map back out
  // from under anyone who had zoomed in while locations were still arriving.
  const fittedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || plottedRef.current.length === 0 || fittedKeyRef.current === plottedKey) return;
    fittedKeyRef.current = plottedKey;

    // Give Leaflet a frame to lay the container out before measuring it.
    const timer = setTimeout(() => {
      map.invalidateSize();
      const bounds = L.latLngBounds(
        plottedRef.current.map((e) => [e.lat, e.lng] as [number, number])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: false });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [plottedKey]);

  const ready = plotted.length;
  const total = events.length;
  const missing = total - ready;

  return (
    <div className={`w-full relative overflow-hidden rounded-[2rem] sm:rounded-[1.75rem] shadow-2xl bg-[#fdfbf7] border-none ${className || 'h-[500px] sm:h-[600px]'}`}>
      <div ref={mapRef} className="w-full h-full z-0" />

      {interactive && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-[1000] flex flex-col gap-2">
          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-border shadow-lg flex items-center gap-3">
            {ready === 0 && total > 0 ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : missing > 0 ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                {ready === 0 ? 'No Locations Yet' : 'Map Ready'}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground">
                {ready} of {total} events on the map
              </span>
            </div>
          </div>
        </div>
      )}

      {showWatermark && (
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-[1000] bg-white/90 dark:bg-black/80 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-border shadow-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground pointer-events-none">
          Free Map Coverage via OpenStreetMap
        </div>
      )}
    </div>
  );
};

export default LeafletMap;