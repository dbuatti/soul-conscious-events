import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { Event } from '@/types/event';
import { format, parseISO } from 'date-fns';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeafletMapProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
  className?: string;
  zoom?: number;
  center?: [number, number];
  userLocation?: [number, number];
  interactive?: boolean;
  showWatermark?: boolean;
}

type PlottedEvent = Event & { lat: number; lng: number };

// Category colours shared with the map legend and the MarkerClusterMap.
const categoryColours: Record<string, string> = {
  Meditation: '#7C3AED',
  'Sound Bath': '#0EA5E9',
  Workshop: '#F59E0B',
  'Community Gathering': '#10B981',
  Foraging: '#65A30D',
  Music: '#EC4899',
  'Open Mic': '#9333EA',
  Other: '#B34629',
};

// One icon per category, shared by every marker of that category.
const markerIcons: Record<string, L.DivIcon> = Object.fromEntries(
  Object.entries(categoryColours).map(([category, colour]) => [
    category,
    L.divIcon({
      html: `<div style="width: 24px; height: 24px; background-color: ${colour}; border: 2px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-div-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
  ]),
);

const iconFor = (event: Event) => markerIcons[event.event_type || 'Other'] ?? markerIcons.Other;

// Plain DOM rather than a React root per marker.
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
  userLocation,
  interactive = true,
  showWatermark = true,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const initCenterRef = useRef(center);
  const initZoomRef = useRef(zoom);
  const initInteractiveRef = useRef(interactive);
  const initUserLocationRef = useRef(userLocation);

  const [tileError, setTileError] = useState<string | null>(null);

  const onViewDetailsRef = useRef(onViewDetails);
  useEffect(() => { onViewDetailsRef.current = onViewDetails; });

  // Events we already hold coordinates for plot on the map.
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

  // Identity of the plotted set.
  const plottedKey = useMemo(() => plotted.map((e) => e.id).join(','), [plotted]);
  const plottedRef = useRef<PlottedEvent[]>(plotted);
  useEffect(() => { plottedRef.current = plotted; }, [plotted]);

  // 1. Map init (runs once)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let map: L.Map;
    try {
      map = L.map(mapRef.current, {
        center: initUserLocationRef.current ?? initCenterRef.current,
        zoom: initUserLocationRef.current ? 13 : initZoomRef.current,
        scrollWheelZoom: initInteractiveRef.current,
        dragging: initInteractiveRef.current,
        touchZoom: initInteractiveRef.current,
        zoomControl: false,
        attributionControl: false,
      });
    } catch (err) {
      console.error('[LeafletMap] Failed to initialise Leaflet map:', err);
      setTileError('Map failed to load. Try refreshing the page.');
      return;
    }

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    });

    tileLayer.on('tileerror', () => {
      setTileError('Map tiles failed to load. Check your connection and refresh.');
    });

    tileLayer.addTo(map);

    // Marker cluster group with spiderfy on click.
    const clusters = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
      animateAddingMarkers: true,
      disableClusteringAtZoom: 16,
      maxClusterRadius: 50,
    }).addTo(map);

    clusterGroupRef.current = clusters;
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
      clusterGroupRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Markers: rebuilt only when the plotted set changes.
  useEffect(() => {
    const clusters = clusterGroupRef.current;
    if (!clusters) return;

    clusters.clearLayers();
    const current = plottedRef.current;

    current.forEach((event) => {
      const marker = L.marker([event.lat, event.lng], { icon: iconFor(event) });
      marker.bindPopup(
        buildPopup(
          event,
          (e) => onViewDetailsRef.current(e),
          () => mapInstanceRef.current?.closePopup()
        ),
        { className: 'custom-leaflet-popup', maxWidth: 300 }
      );
      clusters.addLayer(marker);
    });

    // User location marker (not clustered, always visible).
    if (initUserLocationRef.current) {
      const [uLat, uLng] = initUserLocationRef.current;
      const userMarker = L.circleMarker([uLat, uLng], {
        radius: 8,
        color: '#B34629',
        fillColor: '#B34629',
        fillOpacity: 0.6,
        weight: 2,
      }).addTo(mapInstanceRef.current!);
      userMarker.bindPopup("You're here", { className: 'custom-leaflet-popup', maxWidth: 150 });
    }

    // Frame the view once per change of set.
    if (current.length > 0) {
      const bounds = L.latLngBounds(
        current.map((e) => [e.lat, e.lng] as [number, number])
      );
      if (bounds.isValid()) {
        mapInstanceRef.current?.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: false });
      }
    }
  }, [plottedKey]);

  const ready = plotted.length;
  const total = events.length;
  const missing = total - ready;

  return (
    <div className={`w-full relative overflow-hidden rounded-[2rem] sm:rounded-[1.75rem] shadow-2xl bg-[#fdfbf7] border-none ${className || 'h-[500px] sm:h-[600px]'}`}>
      {tileError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
          <AlertCircle className="h-12 w-12 text-destructive mb-3" />
          <p className="text-center text-sm text-destructive max-w-xs px-4">{tileError}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh map
          </Button>
        </div>
      )}

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

          {total > 0 && ready > 0 && (
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-border shadow-lg max-w-[190px] sm:max-w-none">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Pins by category</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {[
                  'Meditation',
                  'Sound Bath',
                  'Workshop',
                  'Community Gathering',
                  'Foraging',
                  'Music',
                  'Open Mic',
                  'Other',
                ]
                  .filter((cat) => plotted.some((e) => e.event_type === cat))
                  .map((category) => (
                    <span key={category} className="inline-flex items-center gap-1.5 text-[9px] font-bold text-foreground">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: categoryColours[category] }}
                        aria-hidden="true"
                      />
                      {category}
                    </span>
                  ))}
              </div>
            </div>
          )}
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
