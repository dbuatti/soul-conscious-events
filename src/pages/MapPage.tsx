import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Frown, PlusCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import LeafletMap from '@/components/v2/LeafletMap';
import { Event } from '@/types/event';
import EventDetailDialog from '@/components/EventDetailDialog';

const MapPage = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .not('full_address', 'is', null)
        .eq('approval_status', 'approved')
        .eq('is_deleted', false)
        .order('event_date', { ascending: true });

      if (error) {
        console.error('MapPage: Error fetching events:', error);
        toast.error('Failed to load events.');
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

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

      {loading ? (
        <div className="w-full h-[600px] rounded-[3rem] bg-secondary/30 flex flex-col items-center justify-center border border-border">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
          <p className="text-2xl font-black font-heading text-foreground">Loading Map...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="p-24 organic-card rounded-[4rem] text-center border-dashed border-primary/20">
          <Frown className="h-20 w-20 text-primary/20 mx-auto mb-8" />
          <p className="text-2xl font-bold text-muted-foreground mb-8">No events with addresses found to display.</p>
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-12 py-8 text-xl font-black shadow-2xl transition-transform hover:scale-105">
              <PlusCircle className="mr-3 h-7 w-7" /> Add the First Event!
            </Button>
          </Link>
        </div>
      ) : (
        <div className="animate-in fade-in duration-1000">
          <LeafletMap events={events} onViewDetails={handleViewDetails} />
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