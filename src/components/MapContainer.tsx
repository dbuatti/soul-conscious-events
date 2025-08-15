import React, { useEffect, useRef, useState } from 'react';

interface MapContainerProps {
  onMapLoad: (map: google.maps.Map) => void;
  center: google.maps.LatLngLiteral;
  zoom: number;
}

const MapContainer: React.FC<MapContainerProps> = ({ onMapLoad, center, zoom }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapApiLoaded, setMapApiLoaded] = useState(false);
  const mapInstanceRef = useRef<google.maps.Map | null>(null); // Use a ref to store the map instance

  useEffect(() => {
    const handleGoogleMapsApiReady = () => {
      setMapApiLoaded(true);
    };

    // Check immediately if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      setMapApiLoaded(true);
    } else {
      window.addEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    }

    return () => {
      window.removeEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    };
  }, []);

  useEffect(() => {
    // Only initialize the map if the API is loaded, the ref is available, and the map hasn't been initialized yet
    if (mapRef.current && mapApiLoaded && window.google && window.google.maps && !mapInstanceRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstanceRef.current = map; // Store the map instance in the ref
      onMapLoad(map); // Pass the map instance back to the parent
    }
  }, [mapApiLoaded, center, zoom, onMapLoad]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" />;
};

export default MapContainer;