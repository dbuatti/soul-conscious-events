import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Event } from '@/types/event';
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GeocodedEvent extends Event {
  lat: number;
  lng: number;
}

// Sub-component to handle map view updates (centering/zooming)
const MapController = ({ events }: { events: GeocodedEvent[] }) => {
  const map = useMap();

  useEffect(() => {
    if (events.length === 0) {
      // Default view of Australia if no events
      map.setView([-25.2744, 133.7751], 4);
      return;
    }

    try {
      // Create bounds object from all event coordinates
      const bounds = L.latLngBounds(events.map(event => [event.lat, event.lng]));
      
      if (bounds.isValid()) {
        // Fit the map to these bounds with padding
        map.fitBounds(bounds, { 
          padding: [50, 50], 
          maxZoom: 13, // Prevent zooming in too far for single events
          animate: true 
        });
      }
    } catch (error) {
      console.error('Error fitting map bounds:', error);
    }
  }, [events, map]);

  return null;
};

interface LeafletMapProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ events, onViewDetails }) => {
  const [geocodedEvents, setGeocodedEvents] = useState<GeocodedEvent[]>([]);

  // Geocoding Logic with caching
  useEffect(() => {
    const geocodeEvents = async () => {
      const results: GeocodedEvent[] = [];
      const eventsToGeocode = events.filter(e => e.full_address);

      for (const event of eventsToGeocode) {
        const cacheKey = `geo_${event.full_address}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            const { lat, lng } = JSON.parse(cached);
            results.push({ ...event, lat, lng });
            continue;
          } catch (e) {
            sessionStorage.removeItem(cacheKey);
          }
        }

        try {
          // Using Nominatim (OpenStreetMap) for free geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.full_address!)}&limit=1`
          );
          const data = await response.json();
          
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            results.push({ ...event, lat, lng });
            sessionStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
          }
        } catch (error) {
          console.error('Geocoding error:', event.full_address, error);
        }
      }
      setGeocodedEvents(results);
    };

    if (events.length > 0) {
      geocodeEvents();
    } else {
      setGeocodedEvents([]);
    }
  }, [events]);

  // Custom marker icon - memoized for stability
  const customIcon = useMemo(() => L.divIcon({
    html: '<div class="marker-pin"></div>',
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  }), []);

  return (
    <div className="w-full h-[500px] sm:h-[600px] relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border border-border shadow-2xl bg-secondary/10">
      <MapContainer
        center={[-25.2744, 133.7751]}
        zoom={4}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController events={geocodedEvents} />

        {geocodedEvents.map((event) => (
          <Marker 
            key={event.id} 
            position={[event.lat, event.lng]} 
            icon={customIcon}
          >
            <Popup className="custom-popup">
              <div className="p-3 min-w-[180px] space-y-2">
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
                  onClick={() => onViewDetails(event)}
                >
                  View Details →
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-[1000] bg-white/90 dark:bg-black/80 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-border shadow-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground pointer-events-none">
        Free Map Coverage via OpenStreetMap
      </div>
    </div>
  );
};

export default LeafletMap;