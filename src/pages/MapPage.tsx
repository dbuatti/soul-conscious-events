import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  place_name?: string;
  full_address?: string;
  description?: string;
  ticket_link?: string;
  price?: string;
  special_notes?: string;
  organizer_contact?: string;
  event_type?: string;
  state?: string;
  image_url?: string;
}

const MapPage = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .not('full_address', 'is', null) // Only fetch events with an address
        .order('event_date', { ascending: true });

      if (error) {
        console.error('MapPage Debug: Error fetching events for map:', error);
        toast.error('Failed to load events for the map.');
      } else {
        console.log('MapPage Debug: Events fetched:', data);
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (mapRef.current && !mapLoaded && window.google && window.google.maps) {
      console.log('MapPage Debug: Google Maps API is available. Initializing map.');
      setMapLoaded(true);
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: -37.8136, lng: 144.9631 }, // Centered around Melbourne, Australia
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const geocoder = new window.google.maps.Geocoder();
      const infoWindow = new window.google.maps.InfoWindow();

      events.forEach((event) => {
        if (event.full_address) {
          geocoder.geocode({ address: event.full_address }, (results, status) => {
            console.log(`MapPage Debug: Geocoding for "${event.full_address}" status: ${status}`);
            if (status === 'OK' && results && results[0]) {
              const marker = new window.google.maps.Marker({
                map: map,
                position: results[0].geometry.location,
                title: event.event_name,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#8B5CF6', // Purple color for the beacon
                  fillOpacity: 0.9,
                  strokeWeight: 0,
                },
              });

              const contentString = `
                <div class="p-2">
                  <h3 class="text-lg font-semibold text-purple-700 mb-1">${event.event_name}</h3>
                  <p class="text-sm text-gray-600 flex items-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar mr-1 text-blue-500"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                    ${event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBD'}
                    ${event.event_time ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock ml-2 mr-1 text-green-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${event.event_time}` : ''}
                  </p>
                  ${event.place_name ? `<p class="text-sm text-gray-600 flex items-center mb-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin mr-1 text-red-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${event.place_name}</p>` : ''}
                  ${event.full_address ? `<p class="text-sm text-gray-600 flex items-center mb-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin mr-1 text-red-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${event.full_address}</p>` : ''}
                  ${event.price ? `<p class="text-sm text-gray-600 flex items-center mb-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-dollar-sign mr-1 text-green-600"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>${event.price}</p>` : ''}
                  ${event.ticket_link ? `<p class="text-sm text-blue-600 hover:underline flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link mr-1 text-purple-600"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L9.5 3.5"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07L14.5 20.5"/></svg><a href="${event.ticket_link}" target="_blank" rel="noopener noreferrer">Ticket Link</a></p>` : ''}
                  <a href="/events/${event.id}" class="text-blue-600 hover:underline text-sm mt-2 block">View Details</a>
                </div>
              `;

              marker.addListener('click', () => {
                infoWindow.setContent(contentString);
                infoWindow.open(map, marker);
              });
            } else {
              console.warn(`MapPage Debug: Geocoding failed for address: "${event.full_address}", status: ${status}`);
            }
          });
        }
      });
    } else if (mapRef.current && !mapLoaded && (!window.google || !window.google.maps)) {
      console.warn('MapPage Debug: Google Maps API not yet loaded or available.');
    }
  }, [events, mapLoaded]); // Re-run when events or mapLoaded state changes

  if (loading) {
    return (
      <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl border border-gray-200 flex flex-col items-center justify-center min-h-[500px]">
        <Skeleton className="h-10 w-1/2 mb-6" />
        <Skeleton className="w-full h-96 rounded-lg" />
        <Skeleton className="h-6 w-1/4 mt-6" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
      <h1 className="text-4xl font-bold mb-4 text-gray-800 text-center">Event Map</h1>
      <p className="text-xl text-gray-600 mb-6 text-center">
        Explore soulful events near you on the map.
      </p>
      <div ref={mapRef} className="w-full h-[600px] rounded-lg shadow-md border border-gray-300" />
      {events.length === 0 && (
        <p className="text-center text-gray-600 mt-6">No events with addresses found to display on the map.</p>
      )}
    </div>
  );
};

export default MapPage;