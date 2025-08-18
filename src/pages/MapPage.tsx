import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Globe, Loader2, Frown, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MapContainer from '@/components/MapContainer';
import { Event } from '@/types/event'; // Import the shared Event type

const MapPage = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // Callback to receive the map instance from MapContainer
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  // Effect to fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const now = new Date();
      const todayFormatted = format(now, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .not('full_address', 'is', null)
        .gte('event_date', todayFormatted)
        .eq('state', 'approved')
        .order('event_date', { ascending: true });

      if (error) {
        console.error('MapPage: Error fetching events for map:', error);
        toast.error('Failed to load events.');
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  // Effect to add/update markers when events or mapInstance change
  useEffect(() => {
    if (mapInstance && events.length > 0) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]); // Reset markers array

      const geocoder = new window.google.maps.Geocoder();
      const infoWindow = new window.google.maps.InfoWindow();
      const newMarkers: google.maps.Marker[] = [];

      events.forEach((event) => {
        if (event.full_address) {
          geocoder.geocode({ address: event.full_address }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const marker = new window.google.maps.Marker({
                map: mapInstance,
                position: results[0].geometry.location,
                title: event.event_name,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: 'hsl(var(--primary))',
                  fillOpacity: 0.9,
                  strokeWeight: 0,
                },
              });

              const contentString = `
                <div class="p-2 dark:bg-card dark:text-foreground">
                  <h3 class="text-lg font-semibold text-primary mb-1">${event.event_name}</h3>
                  <p class="text-sm text-muted-foreground flex items-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar mr-1 text-primary" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                    ${event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBD'}
                    ${event.event_time ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock ml-2 mr-1 text-primary" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${event.event_time}` : ''}
                  </p>
                  ${event.place_name ? `<p class="text-sm text-muted-foreground flex items-center mb-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin mr-1 text-primary" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${event.place_name}</p>` : ''}
                  ${event.full_address ? `<p class="text-sm text-muted-foreground flex items-center mb-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin mr-1 text-primary" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${event.full_address}</p>` : ''}
                  ${event.price ? `<p class="text-sm text-muted-foreground flex items-center mb-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-dollar-sign mr-1 text-primary" aria-hidden="true"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>${event.price}</p>` : ''}
                  ${event.ticket_link ? `<p class="text-sm text-primary hover:underline flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link mr-1 text-primary" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L9.5 3.5"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07L14.5 20.5"/></svg><a href="${event.ticket_link}" target="_blank" rel="noopener noreferrer">Ticket Link</a></p>` : ''}
                  <a href="/events/${event.id}" class="text-primary hover:underline text-sm mt-2 block">View Details</a>
                </div>
              `;

              marker.addListener('click', () => {
                infoWindow.setContent(contentString);
                infoWindow.open(mapInstance, marker);
              });
              newMarkers.push(marker);
            } else {
              console.warn(`MapPage: Geocoding failed for address: "${event.full_address}", status: ${status}`);
            }
          });
        }
      });
      setMarkers(newMarkers);

      // Cleanup function for markers
      return () => {
        newMarkers.forEach(marker => marker.setMap(null));
      };
    }
  }, [events, mapInstance]);

  return (
    <div className="w-full max-w-screen-lg">
      <h1 className="text-4xl font-bold text-foreground mb-4 text-center">Event Map</h1>
      <p className="text-xl text-muted-foreground mb-6 text-center">
        Explore soulful events near you on the map.
      </p>
      <div className="w-full h-[600px] rounded-lg shadow-md border border-border relative">
        {/* Always render MapContainer, and let it handle its own initialization */}
        <MapContainer
          onMapLoad={handleMapLoad}
          center={{ lat: -37.8136, lng: 144.9631 }}
          zoom={10}
        />
        {/* Show loading overlay if mapInstance is not yet available or events are loading */}
        {(loading || !mapInstance) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary z-10 rounded-lg">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-xl font-semibold text-foreground mb-2">Loading map and events...</p>
            <p className="text-muted-foreground text-center">This might take a moment as we fetch event locations.</p>
            <Skeleton className="w-3/4 h-48 mt-8 rounded-lg" />
          </div>
        )}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-4">
        <span className="font-semibold">Note:</span> This map functionality, including address lookups, relies on the Google Maps API.
        It is currently operating on free Google API credits, which means its availability and performance may vary
        and could stop working unexpectedly if usage limits are exceeded. This is a new feature and an ongoing learning experience!
      </p>
      {!loading && events.length === 0 && (
        <div className="p-8 bg-secondary rounded-lg border border-border text-center mt-6">
          <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-4">
            No events with addresses found to display on the map.
          </p>
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
              <PlusCircle className="mr-2 h-4 w-4" /> Add the First Event!
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default MapPage;