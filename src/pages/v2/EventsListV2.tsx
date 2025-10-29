import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isPast, isFuture, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, PlusCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EventCardV2 from '@/components/v2/EventCardV2'; // Import the new EventCardV2
import EventDetailDialog from '@/components/EventDetailDialog';
import { Event } from '@/types/event'; // Reusing existing Event type
import { v2EventCategories, v2PriceOptions, v2Venues, v2Areas } from '@/lib/v2/constants'; // Import V2 constants

const EventsListV2 = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'All',
    venue: 'All',
    price: 'All',
    area: 'All',
  });

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('events').select('*');
    query = query.eq('approval_status', 'approved');
    query = query.order('event_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events.');
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const applyFilters = (event: Event) => {
    const eventDate = parseISO(event.event_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Category filter
    if (filters.category !== 'All' && event.event_type !== filters.category) {
      return false;
    }

    // Venue filter (using place_name)
    if (filters.venue !== 'All' && event.place_name !== filters.venue) {
      return false;
    }

    // Price filter
    if (filters.price !== 'All') {
      const lowerCasePrice = event.price?.toLowerCase() || '';
      if (filters.price === 'Free' && !lowerCasePrice.includes('free')) return false;
      if (filters.price === 'Paid' && (lowerCasePrice.includes('free') || lowerCasePrice.includes('donation') || !lowerCasePrice)) return false;
      if (filters.price === 'Donation' && !lowerCasePrice.includes('donation')) return false;
    }

    // Area filter (using geographical_state)
    if (filters.area !== 'All' && event.geographical_state !== filters.area) {
      return false;
    }

    return true;
  };

  const getSectionEvents = (sectionType: 'highlights' | 'upcoming' | 'past') => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let sectionFilteredEvents = events.filter(applyFilters);

    if (sectionType === 'highlights') {
      // For highlights, show today's events first, then upcoming
      const todayEvents = sectionFilteredEvents.filter(event => isToday(parseISO(event.event_date)));
      const upcomingEvents = sectionFilteredEvents.filter(event => isFuture(parseISO(event.event_date)));
      return [...todayEvents, ...upcomingEvents].slice(0, 5); // Limit highlights
    } else if (sectionType === 'upcoming') {
      return sectionFilteredEvents.filter(event => isFuture(parseISO(event.event_date)) || isToday(parseISO(event.event_date)));
    } else if (sectionType === 'past') {
      return sectionFilteredEvents.filter(event => isPast(parseISO(event.event_date)) && !isToday(parseISO(event.event_date)));
    }
    return [];
  };

  const handleShare = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const eventUrl = `${window.location.origin}/v2/events/${event.id}`; // Adjust URL for V2
    navigator.clipboard.writeText(eventUrl)
      .then(() => toast.success('Event link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link. Please try again.'));
  };

  const handleDelete = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this event? It will be hidden from public view but can be restored from the Admin Panel.')) {
      const { error } = await supabase.from('events').update({ is_deleted: true }).eq('id', eventId);
      if (error) {
        toast.error('Failed to delete event.');
      } else {
        toast.success('Event moved to trash.');
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      }
    }
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const highlights = getSectionEvents('highlights');
  const upcomingEvents = getSectionEvents('upcoming');
  const pastEvents = getSectionEvents('past');

  return (
    <div className="w-full max-w-screen-lg">
      <h1 className="text-4xl font-bold text-foreground mb-8 text-center">SoulFlow V2 Events</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {highlights.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-6 border-b pb-2 border-border">Today's Highlights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {highlights.map(event => (
                  <EventCardV2
                    key={event.id}
                    event={event}
                    onShare={handleShare}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </section>
          )}

          {upcomingEvents.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-6 border-b pb-2 border-border">Upcoming Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingEvents.map(event => (
                  <EventCardV2
                    key={event.id}
                    event={event}
                    onShare={handleShare}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </section>
          )}

          {pastEvents.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-6 border-b pb-2 border-border">Past Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastEvents.map(event => (
                  <EventCardV2
                    key={event.id}
                    event={event}
                    onShare={handleShare}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </section>
          )}

          {events.length === 0 && (
            <div className="p-8 bg-secondary rounded-lg border border-border text-center">
              <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-4">No events found matching your criteria.</p>
              <Link to="/submit-event">
                <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add an Event
                </Button>
              </Link>
            </div>
          )}
        </>
      )}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />
    </div>
  );
};

export default EventsListV2;