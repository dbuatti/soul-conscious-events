import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Event } from '@/types/event';
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix for default marker icons in Leaflet using a custom DivIcon
const createCustomIcon = () => {
  return new L.DivIcon({
    html: '<div class="marker-pin"></div>',
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface GeocodedEvent extends Event {
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
}

// Component to handle map centering and zooming
const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && map) {
      map.setView(center, zoom, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, zoom, map]);

  return null;
};

const LeafletMap: React.FC<LeafletMapProps> = ({ events, onViewDetails }) => {
  const [geocodedEvents, setGeocodedEvents] = useState<GeocodedEvent[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-25.2744, 133.7751]); // Center of Australia
  const [zoom, setZoom] = useState(4);
  
  const customIcon = useMemo(() => createCustomIcon(), []);

  useEffect(() => {
    const geocodeEvents = async () => {
      const results: GeocodedEvent[] = [];
      
      // Only geocode events that have a full address
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
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.full_address!)}&limit=1`
          );
          if (!response.ok) throw new Error('Geocoding request failed');
          const data = await response.json();
          
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            results.push({ ...event, lat, lng });
            sessionStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
          }
        } catch (error) {
          console.error('Geocoding error for address:', event.full_address, error);
        }
      }
      
      setGeocodedEvents(results);

      if (results.length > 0) {
        // Center on the first result or calculate bounds
        setMapCenter([results[0].lat, results[0].lng]);
        setZoom(12);
      }
    };

    if (events.length > 0) {
      geocodeEvents();
    } else {
      setGeocodedEvents([]);
    }
  }, [events]);

  return (
    <div className="w-full h-[600px] relative overflow-hidden rounded-[2.5rem] border border-border shadow-2xl bg-secondary/10">
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={mapCenter} zoom={zoom} />
        
        {geocodedEvents.map((event) => (
          <Marker 
            key={event.id} 
            position={[event.lat, event.lng]} 
            icon={customIcon}
          >
            <Popup closeButton={false} className="custom-popup">
              <div className="p-4 min-w-[200px] space-y-3">
                <h3 className="font-black text-primary text-lg leading-tight">{event.event_name}</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-primary/60" />
                    {format(parseISO(event.event_date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-primary/60" />
                    {event.place_name || 'Location'}
                  </div>
                </div>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-primary font-bold text-xs group"
                  onClick={() => onViewDetails(event)}
                >
                  View Details <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 dark:bg-black/80 backdrop-blur-md p-3 rounded-xl border border-border shadow-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Free Map Coverage via OpenStreetMap
      </div>
    </div>
  );
};

export default LeafletMap;