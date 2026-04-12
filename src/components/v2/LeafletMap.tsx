import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { Event } from '@/types/event';
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GeocodedEvent extends Event {
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ events, onViewDetails }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [geocodedEvents, setGeocodedEvents] = useState<GeocodedEvent[]>([]);

  // 1. Geocoding Logic
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

  // 2. Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
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
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Update Markers and View
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (geocodedEvents.length === 0) return;

    const bounds = L.latLngBounds([]);

    geocodedEvents.forEach((event) => {
      const customIcon = L.divIcon({
        html: '<div class="marker-pin"></div>',
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([event.lat, event.lng], { icon: customIcon });
      
      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'p-4 min-w-[200px] space-y-3';
      popupContent.innerHTML = `
        <h3 class="font-black text-primary text-lg leading-tight">${event.event_name}</h3>
        <div class="space-y-1 text-xs text-muted-foreground">
          <div class="flex items-center gap-2">
            <span class="font-bold">${format(parseISO(event.event_date), 'MMM d, yyyy')}</span>
          </div>
          <div class="flex items-center gap-2">
            <span>${event.place_name || 'Location'}</span>
          </div>
        </div>
      `;

      const viewBtn = document.createElement('button');
      viewBtn.className = 'text-primary font-bold text-xs mt-2 hover:underline flex items-center gap-1';
      viewBtn.innerText = 'View Details →';
      viewBtn.onclick = () => onViewDetails(event);
      popupContent.appendChild(viewBtn);

      marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup' });
      marker.addTo(layer);
      bounds.extend([event.lat, event.lng]);
    });

    if (geocodedEvents.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true });
    }
  }, [geocodedEvents, onViewDetails]);

  return (
    <div className="w-full h-[600px] relative overflow-hidden rounded-[2.5rem] border border-border shadow-2xl bg-secondary/10">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 dark:bg-black/80 backdrop-blur-md p-3 rounded-xl border border-border shadow-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Free Map Coverage via OpenStreetMap
      </div>
    </div>
  );
};

export default LeafletMap;