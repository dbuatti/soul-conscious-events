import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Globe, Loader2, Frown, PlusCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MapContainer from '@/components/MapContainer';
import { Event } from '@/types/event';

const MapPage = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

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
        .eq('approval_status', 'approved')
        .eq('is_deleted', false)
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

  useEffect(() => {
    if (mapInstance && events.length > 0) {
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);

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
                  scale: 10,
                  fillColor: 'hsl(var(--primary))',
                  fillOpacity: 0.9,
                  strokeWeight: 2,
                  strokeColor: '#ffffff',
                },
              });

              const contentString = `
                <div class="p-4 max-w-[280px] font-sans">
                  <h3 class="text-lg font-black text-primary mb-2 leading-tight">${event.event_name}</h3>
                  <div class="space-y-2 text-sm text-muted-foreground">
                    <p class="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                      ${event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBD'}
                    </p>
                    <p class="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      ${event.place_name || event.full_address}
                    </p>
                  </div>
                  <a href="/events/${event.id}" class="mt-4 block w-full text-center py-2 bg-primary text-white rounded-lg font-bold text-xs transition-opacity hover:opacity-90">View Details</a>
                </div>
              `;

              marker.addListener('click', () => {
                infoWindow.setContent(contentString);
                infoWindow.open(mapInstance, marker);
              });
              newMarkers.push(marker);
            }
          });
        }
      });
      setMarkers(newMarkers);

      return () => {
        newMarkers.forEach(marker => marker.setMap(null));
      };
    }
  }, [events, mapInstance]);

  return (
    <div className="w-full max-w-6xl px-4">
      <div className="mb-12 text-center space-y-4">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-[0.2em] uppercase">
          <Sparkles className="h-3 w-3 mr-2" /> Explore Nearby
        </div>
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground">Event Map</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
          Discover soulful gatherings vibrating in your local area.
        </p>
      </div>

      <div className="w-full h-[700px] rounded-[3rem] shadow-2xl border border-border relative overflow-hidden organic-card">
        <MapContainer
          onMapLoad={handleMapLoad}
          center={{ lat: -37.8136, lng: 144.9631 }}
          zoom={10}
        />
        {(loading || !mapInstance) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/90 backdrop-blur-sm z-10">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
            <p className="text-2xl font-black font-heading text-foreground">Loading Map...</p>
            <p className="text-muted-foreground font-medium mt-2">Fetching soulful locations across Australia.</p>
          </div>
        )}
      </div>

      <div className="mt-12 p-8 bg-secondary/30 rounded-[2.5rem] border border-border/50 text-center max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-black text-foreground uppercase tracking-widest text-[10px] block mb-2">Note</span>
          This map functionality relies on the Google Maps API. It is currently operating on free credits, so availability may vary. We appreciate your patience as we refine this feature!
        </p>
      </div>

      {!loading && events.length === 0 && (
        <div className="p-24 organic-card rounded-[4rem] text-center border-dashed border-primary/20 mt-12">
          <Frown className="h-20 w-20 text-primary/20 mx-auto mb-8" />
          <p className="text-2xl font-bold text-muted-foreground mb-8">No events with addresses found to display.</p>
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-12 py-8 text-xl font-black shadow-2xl transition-transform hover:scale-105">
              <PlusCircle className="mr-3 h-7 w-7" /> Add the First Event!
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default MapPage;