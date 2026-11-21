import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Database, Frown, Loader2, MapPin, PlusCircle, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import LeafletMap from '@/components/v2/LeafletMap';
import { Event } from '@/types/event';
import EventDetailDialog from '@/components/EventDetailDialog';
import { useSession } from '@/components/SessionContextProvider';
import SEO from '@/components/SEO';

const MapPage = () => {
  const { defaultState } = useSession();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      
      try {
        // First, check if we can even reach the database with a simple count
        const { error: pingError } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true });

        if (pingError) {
          console.error('[MapPage] Database connection error:', pingError);
          setDbStatus('error');
          toast.error(`Database connection failed: ${pingError.message}`);
          setLoading(false);
          return;
        }

        setDbStatus('connected');

        // Now fetch the specific events for the map. Two things matter here:
        // a venue name alone is geocodable, so do not demand a full address --
        // and only ever plot upcoming events, since the geocoder only queues
        // future rows. Including past events inflated the denominator with
        // things that will never have coordinates.
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .or('full_address.not.is.null,place_name.not.is.null')
          .eq('approval_status', 'approved')
          .eq('is_deleted', false)
          .gte('event_date', new Date().toISOString().slice(0, 10))
          .order('event_date', { ascending: true });

        if (error) {
          console.error('[MapPage] Error fetching filtered events:', error);
          toast.error(`Failed to load event data: ${error.message}`);
        } else {
          setEvents(data || []);
        }
      } catch (err: unknown) {
        console.error('[MapPage] Unexpected error during fetch:', err);
        setDbStatus('error');
        toast.error(`An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const handleLocateMe = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported in this browser.');
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 5 * 60_000,
        });
      });
      setUserLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      toast.success('Map centred on your location.');
    } catch {
      toast.error('Could not access your location.');
    } finally {
      setLocating(false);
    }
  };

  // The home guide already honours the user's saved location; the standalone
  // map used to ignore it and show all of Australia. Keep both views aligned.
  const visibleEvents = useMemo(
    () => (defaultState ? events.filter((event) => event.geographical_state === defaultState) : events),
    [events, defaultState],
  );

  const hasPin = (event: Event) =>
    typeof event.latitude === 'number' && typeof event.longitude === 'number';
  const mappedEvents = visibleEvents.filter(hasPin);
  const unmappedEvents = visibleEvents.filter((event) => !hasPin(event));

  return (
    <div className="w-full max-w-6xl px-4">
      <SEO 
        title="Interactive Event Map | SoulFlow Australia"
        description="Explore soulful gatherings, workshops, meditations, and conscious events near you using our interactive community map."
      />
      <div className="mb-12 text-center space-y-4">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-[0.2em] uppercase">
          <Sparkles className="h-3 w-3 mr-2" /> Explore Nearby
        </div>
        <h1 className="text-5xl sm:text-6xl font-semibold font-heading tracking-tight text-foreground">Event Map</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
          Discover soulful gatherings vibrating in your local area.
        </p>
        {defaultState && (
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Showing {defaultState}
            <Link to="/account-settings" className="underline underline-offset-4 hover:text-foreground">
              change
            </Link>
          </div>
        )}
        {!userLocation && (
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary hover:border-primary/40 disabled:opacity-50"
          >
            {locating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Target className="mr-2 h-3.5 w-3.5" />}
            {locating ? 'Locating…' : 'Near me'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="w-full h-[600px] rounded-[3rem] bg-secondary/30 flex flex-col items-center justify-center border border-border">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
          <p className="text-2xl font-semibold font-heading text-foreground">
            {dbStatus === 'checking' ? 'Connecting to Database...' : 'Loading Map Data...'}
          </p>
        </div>
      ) : dbStatus === 'error' ? (
        <div className="p-24 organic-card rounded-[4rem] text-center border-destructive/20 bg-destructive/5">
          <Database className="h-20 w-20 text-destructive/20 mx-auto mb-8" />
          <h3 className="text-3xl font-heading font-bold text-foreground mb-4">Connection Issue</h3>
          <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto">
            We're having trouble reaching the database. This could be a temporary network issue or a configuration problem.
          </p>
          <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-12 py-8 text-xl font-black shadow-2xl transition-transform hover:scale-105">
            Try Again
          </Button>
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="p-24 organic-card rounded-[4rem] text-center border-dashed border-primary/20">
          <Frown className="h-20 w-20 text-primary/20 mx-auto mb-8" />
          <p className="text-2xl font-bold text-muted-foreground mb-8">
            {defaultState
              ? `No events with addresses found in ${defaultState} yet.`
              : 'No events with addresses found to display.'}
          </p>
          {defaultState && (
            <Link to="/" className="mb-4 inline-block text-sm font-semibold text-primary hover:underline">
              Show all of Australia instead
            </Link>
          )}
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-12 py-8 text-xl font-black shadow-2xl transition-transform hover:scale-105">
              <PlusCircle className="mr-3 h-7 w-7" /> Add the First Event!
            </Button>
          </Link>
        </div>
      ) : (
        <div className="animate-in fade-in duration-1000">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground">
              <strong className="text-foreground">{mappedEvents.length}</strong> of {visibleEvents.length} events have a pin
            </span>
            {unmappedEvents.length > 0 && (
              <button
                type="button"
                onClick={() => setShowUnmapped((shown) => !shown)}
                aria-expanded={showUnmapped}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary hover:border-primary/40"
              >
                {showUnmapped ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showUnmapped ? 'Hide' : 'Show'} {unmappedEvents.length} without a pin
              </button>
            )}
          </div>

          {showUnmapped && unmappedEvents.length > 0 && (
            <div className="organic-card rounded-[var(--radius)] p-5 sm:p-6 mb-6">
              <p className="text-sm text-muted-foreground mb-4">
                These events are in the guide but their location hasn’t been pinned yet. They’re listed here so they don’t disappear from the map view.
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {unmappedEvents.slice(0, 30).map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => handleViewDetails(event)}
                      className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                    >
                      <span className="block truncate text-sm font-semibold text-foreground">{event.event_name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {event.place_name || event.full_address || 'Location to be confirmed'}
                        {event.geographical_state ? ` · ${event.geographical_state}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {unmappedEvents.length > 30 && (
                <p className="mt-3 text-xs text-muted-foreground">Showing the first 30 of {unmappedEvents.length}.</p>
              )}
            </div>
          )}

          <LeafletMap events={visibleEvents} onViewDetails={handleViewDetails} userLocation={userLocation ? [userLocation.lat, userLocation.lng] : undefined} />
        </div>
      )}

      <div className="mt-12 p-8 bg-secondary/30 rounded-[2.5rem] border border-border/50 text-center max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-black text-foreground uppercase tracking-widest text-[10px] block mb-2">Note</span>
          This map uses OpenStreetMap data and Leaflet, providing a completely free and open-source experience for our community.
        </p>
      </div>

      <EventDetailDialog 
        event={selectedEvent} 
        isOpen={isEventDetailDialogOpen} 
        onClose={() => setIsEventDetailDialogOpen(false)} 
      />
    </div>
  );
};

export default MapPage;