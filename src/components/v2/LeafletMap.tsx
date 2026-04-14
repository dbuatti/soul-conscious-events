import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Event } from '@/types/event';
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createRoot } from 'react-dom/client';

interface GeocodedEvent extends Event {
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
  className?: string;
  zoom?: number;
  center?: [number, number];
  interactive?: boolean;
  showWatermark?: boolean;
}

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
  const [geocodedEvents, setGeocodedEvents] = useState<GeocodedEvent[]>([]);
  const [geocodingStatus, setGeocodingStatus] = useState<{
    total: number;
    completed: number;
    failed: number;
    isProcessing: boolean;
  }>({ total: 0, completed: 0, failed: 0, isProcessing: false });

  // 1. Geocoding Logic with Fallback and Incremental Updates
  useEffect(() => {
    let isMounted = true;
    const results: GeocodedEvent[] = [];
    const eventsWithAddress = events.filter(e => e.full_address);
    
    setGeocodedEvents([]); // Reset on new events list
    setGeocodingStatus({
      total: eventsWithAddress.length,
      completed: 0,
      failed: 0,
      isProcessing: true
    });

    const geocodeEvents = async () => {
      for (const event of eventsWithAddress) {
        if (!isMounted) break;

        const cacheKey = `geo_v6_${event.full_address}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            const { lat, lng } = JSON.parse(cached);
            if (!isNaN(lat) && !isNaN(lng)) {
              results.push({ ...event, lat, lng });
              if (isMounted) {
                setGeocodedEvents([...results]);
                setGeocodingStatus(prev => ({ ...prev, completed: prev.completed + 1 }));
              }
              continue;
            }
          } catch (e) {
            sessionStorage.removeItem(cacheKey);
          }
        }

        try {
          // Respect Nominatim's usage policy
          await new Promise(resolve => setTimeout(resolve, 1100));
          
          // Try full address first
          let response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.full_address!)}&limit=1`,
            { headers: { 'User-Agent': 'SoulFlow-Australia-Community-App-v2' } }
          );
          
          let data = await response.json();
          
          // Fallback: If full address fails, try a broader search (Suburb, State, Australia)
          if ((!data || data.length === 0) && event.full_address?.includes(',')) {
            const parts = event.full_address.split(',');
            if (parts.length > 1) {
              const fallbackAddress = parts.slice(1).join(',').trim();
              console.log(`[LeafletMap] Retrying with fallback: ${fallbackAddress}`);
              await new Promise(resolve => setTimeout(resolve, 1100));
              response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}&limit=1`,
                { headers: { 'User-Agent': 'SoulFlow-Australia-Community-App-v2' } }
              );
              data = await response.json();
            }
          }
          
          if (data && data.length > 0 && isMounted) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              results.push({ ...event, lat, lng });
              sessionStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
              if (isMounted) {
                setGeocodedEvents([...results]);
                setGeocodingStatus(prev => ({ ...prev, completed: prev.completed + 1 }));
              }
            } else {
              setGeocodingStatus(prev => ({ ...prev, failed: prev.failed + 1 }));
            }
          } else {
            setGeocodingStatus(prev => ({ ...prev, failed: prev.failed + 1 }));
          }
        } catch (error) {
          console.error('[LeafletMap] Geocoding error:', error);
          setGeocodingStatus(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }
      
      if (isMounted) {
        setGeocodingStatus(prev => ({ ...prev, isProcessing: false }));
      }
    };

    if (events.length > 0) {
      geocodeEvents();
    } else {
      setGeocodingStatus({ total: 0, completed: 0, failed: 0, isProcessing: false });
    }

    return () => { isMounted = false; };
  }, [events]);

  // 2. Map Initialization
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      scrollWheelZoom: interactive,
      zoomControl: false,
      dragging: interactive,
      touchZoom: interactive,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(mapRef.current);

    setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 500);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    
    if (geocodedEvents.length === 0) return;

    const bounds = L.latLngBounds([]);

    geocodedEvents.forEach((event) => {
      const customIcon = L.divIcon({
        html: `<div style="width: 24px; height: 24px; background-color: #B34629; border: 2px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([event.lat, event.lng], { icon: customIcon });
      
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3 min-w-[180px] space-y-2';
      
      const root = createRoot(popupContent);
      root.render(
        <div className="space-y-2">
          <h3 className="font-black text-primary text-base leading-tight">{event.event_name}</h3>
          <div className="space-y-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-primary/60" />
              <span>{format(parseISO(event.event_date), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-primary/60" />
              <span className="truncate">{event.place_name || 'Location'}</span>
            </div>
          </div>
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0 text-primary font-black text-[11px] mt-1"
            onClick={() => {
              map.closePopup();
              onViewDetails(event);
            }}
          >
            View Details →
          </Button>
        </div>
      );

      marker.bindPopup(popupContent, { className: 'custom-leaflet-popup', maxWidth: 300 });
      markersLayer.addLayer(marker);
      bounds.extend([event.lat, event.lng]);
    });

    // Only auto-zoom if we have multiple events or if it's the initial load
    if (bounds.isValid() && geocodedEvents.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
    }
  }, [geocodedEvents, onViewDetails]);

  return (
    <div className={`w-full relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl bg-[#fdfbf7] border-none ${className || 'h-[500px] sm:h-[600px]'}`}>
      <div ref={mapRef} className="w-full h-full z-0" />
      
      {interactive && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-[1000] flex flex-col gap-2">
          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-border shadow-lg flex items-center gap-3">
            {geocodingStatus.isProcessing ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : geocodingStatus.failed > 0 ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                {geocodingStatus.isProcessing ? 'Locating Events...' : 'Map Ready'}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground">
                {geocodedEvents.length} of {geocodingStatus.total} events found
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