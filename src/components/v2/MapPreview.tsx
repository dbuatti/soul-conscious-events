import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Event } from '@/types/event';

interface MapPreviewProps {
  event: Event;
}

/** Tiny inline map (200px tall) showing one event's pinned location. */
const MapPreview: React.FC<MapPreviewProps> = ({ event }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!event.latitude || !event.longitude) return;

    const map = L.map(mapRef.current, {
      center: [event.latitude, event.longitude],
      zoom: 15,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="width:24px;height:24px;background-color:#B34629;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-div-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([event.latitude, event.longitude], { icon }).addTo(map);
    marker.bindPopup(event.event_name, { maxWidth: 150 });
    markerRef.current = marker;

    mapInstanceRef.current = map;

    // Give Leaflet a frame to lay out.
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [mapRef.current, event.latitude, event.longitude, event.event_name]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[200px] rounded-xl bg-secondary overflow-hidden border border-border/50"
    />
  );
};

export default MapPreview;
