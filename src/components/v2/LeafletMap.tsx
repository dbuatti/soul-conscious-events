import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Event } from '@/types/event';
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createRoot } from 'react-dom/client';

interface GeocodedEvent extends Event {
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ events, onViewDetails }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [geocodedEvents, setGeocodedEvents] = useState<GeocodedEvent[]>([]);

  // 1. Geocoding Logic
  useEffect(() => {
    let isMounted = true;

    const geocodeEvents = async () => {
      const results: GeocodedEvent[] = [];
      const eventsWithAddress = events.filter(e => e.full_address);

      for (const event of eventsWithAddress) {
        const cacheKey = `geo_v2_${event.full_address}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            const { lat, lng } = JSON.parse(cached);
            if (!isNaN(lat) && !isNaN(lng)) {
              results.push({ ...event, lat, lng });
              continue;
            }
          } catch (e) {
            sessionStorage.removeItem(cacheKey);
          }
        }

        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.full_address!)}&limit=1`,
            {
              headers: {
                'User-Agent': 'SoulFlow-Australia-Community-App'
              }
            }
          );
          
          if (!response.ok) throw new Error('Geocoding service error');
          
          const data = await response.json();
          
          if (data && data.length > 0 && isMounted) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              results.push({ ...event, lat, lng });
              sessionStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
            }
          }
        } catch (error) {
          console.error('Geocoding error:', event.full_address, error);
        }
      }
      
      if (isMounted) {
        setGeocodedEvents(results);
      }
    };

    if (events.length > 0) {
      geocodeEvents();
    } else {
      setGeocodedEvents([]);
    }

    return () => {
      isMounted = false;
    };
  }, [events]);

  // 2. Map Initialization
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-25.2744, 133.7751],
      zoom: 4,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Update Markers and Bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (geocodedEvents.length === 0) return;

    const customIcon = L.divIcon({
      html: '<div class="marker-pin"></div>',
      className: 'custom-div-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const bounds = L.latLngBounds([]);

    geocodedEvents.forEach((event) => {
      const marker = L.marker([event.lat, event.lng], { icon: customIcon });
      
      const popupContent = document.createElement('div');
      popupContent.className = 'custom-popup-content p-3 min-w-[180px] space-y-2';
      
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
              if (mapInstanceRef.current) {
                mapInstanceRef.current.closePopup();
              }
              onViewDetails(event);
            }}
          >
            View Details →
          </Button>
        </div>
      );

      marker.bindPopup(popupContent, {
        className: 'custom-leaflet-popup',
        maxWidth: 300
      });
      
      markersLayer.addLayer(marker);
      bounds.extend([event.lat, event.lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { 
        padding: [50, 50], 
        maxZoom: 13,
        animate: true 
      });
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);

    return () => clearTimeout(timer);

  }, [geocodedEvents, onViewDetails]);

  return (
    <div className="w-full h-[500px] sm:h-[600px] relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border border-border shadow-2xl bg-secondary/10">
      <div ref={mapRef} className="w-full h-full z-0" />
      
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-[1000] bg-white/90 dark:bg-black/80 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-border shadow-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground pointer-events-none">
        Free Map Coverage via OpenStreetMap
      </div>
    </div>
  );
};

export default LeafletMap;