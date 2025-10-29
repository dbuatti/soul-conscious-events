import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isPast, isFuture, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, PlusCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EventCardV2 from '@/components/v2/EventCardV2';
import EventDetailDialog from '@/components/EventDetailDialog';
import { Event } from '@/types/event';
import { v2EventCategories, v2PriceOptions, v2Venues, v2Areas, v2DateOptions } from '@/lib/v2/constants';
import FilterDropdownsV2 from '@/components/v2/FilterDropdownsV2'; // Import FilterDropdownsV2

const EVENTS_PER_LOAD = 6; // Number of events to load at a time

const EventsListV2 = () => {
  const [allEvents, setAllEvents] = useState<Event[]>([]); // Store all fetched events
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([]); // Events currently displayed after filtering/pagination
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [filters, setFilters] = useState({
    date: 'Today', // Default to 'Today'
    category: 'All',
    venue: 'All',
    price: 'All',
    area: 'All',
  });

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Function to fetch events from Supabase
  const fetchInitialEvents = useCallback(async () => {
    setLoading(true);
    setOffset(0); // Reset offset for initial fetch
    setHasMore(true); // Assume there's more data initially

    let query = supabase.from('events').select('*');
    query = query.eq('approval_status', 'approved');
    query = query.order('event_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events.');
      setAllEvents([]);
    } else {
      setAllEvents(data || []);
    }
    setLoading(false);
  }, []);

  // Effect to fetch initial events on component mount
  useEffect(() => {
    fetchInitialEvents();
  }, [fetchInitialEvents]);

  // Filter and paginate events whenever allEvents or filters change
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = addDays(now, 1);
    tomorrow.setHours(0, 0, 0, 0);

    let filtered = allEvents.filter(event => {
      const eventDate = parseISO(event.event_date);

      // Apply date filter
      switch (filters.date) {
        case 'Today':
          if (!isToday(eventDate)) return false;
          break;
        case 'Tomorrow':
          if (!isToday(eventDate) && !isSameDay(eventDate, tomorrow)) return false;
          break;
        case 'This Week':
          const startW = startOfWeek(now, { weekStartsOn: 1 });
          const endW = endOfWeek(now, { weekStartsOn: 1 });
          if (!(eventDate >= startW && eventDate <= endW)) return false;
          break;
        case 'This Month':
          const startM = startOfMonth(now);
          const endM = endOfMonth(now);
          if (!(eventDate >= startM && eventDate <= endM)) return false;
          break;
        case 'All Upcoming':
          if (isPast(eventDate) && !isToday(eventDate)) return false; // Only show future or today
          break;
        default:
          break;
      }

      // Apply category filter
      if (filters.category !== 'All' && event.event_type !== filters.category) {
        return false;
      }
      // Apply venue filter (using place_name)
      if (filters.venue !== 'All' && event.place_name !== filters.venue) {
        return false;
      }
      // Apply price filter
      if (filters.price !== 'All') {
        const lowerCasePrice = event.price?.toLowerCase() || '';
        if (filters.price === 'Free' && !lowerCasePrice.includes('free')) return false;
        if (filters.price === 'Paid' && (lowerCasePrice.includes('free') || lowerCasePrice.includes('donation') || !lowerCasePrice)) return false;
        if (filters.price === 'Donation' && !lowerCasePrice.includes('donation')) return false;
      }
      // Apply area filter (using geographical_state)
      if (filters.area !== 'All' && event.geographical_state !== filters.area) {
        return false;
      }
      return true;
    });

    setDisplayedEvents(filtered.slice(0, EVENTS_PER_LOAD));
    setOffset(EVENTS_PER_LOAD);
    setHasMore(filtered.length > EVENTS_PER_LOAD);
  }, [allEvents, filters]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = addDays(now, 1);
    tomorrow.setHours(0, 0, 0, 0);

    let filtered = allEvents.filter(event => {
      const eventDate = parseISO(event.event_date);

      // Apply date filter
      switch (filters.date) {
        case 'Today':
          if (!isToday(eventDate)) return false;
          break;
        case 'Tomorrow':
          if (!isToday(eventDate) && !isSameDay(eventDate, tomorrow)) return false;
          break;
        case 'This Week':
          const startW = startOfWeek(now, { weekStartsOn: 1 });
          const endW = endOfWeek(now, { weekStartsOn: 1 });
          if (!(eventDate >= startW && eventDate <= endW)) return false;
          break;
        case 'This Month':
          const startM = startOfMonth(now);
          const endM = endOfMonth(now);
          if (!(eventDate >= startM && eventDate <= endM)) return false;
          break;
        case 'All Upcoming':
          if (isPast(eventDate) && !isToday(eventDate)) return false; // Only show future or today
          break;
        default:
          break;
      }

      // Apply category filter
      if (filters.category !== 'All' && event.event_type !== filters.category) {
        return false;
      }
      // Apply venue filter (using place_name)
      if (filters.venue !== 'All' && event.place_name !== filters.venue) {
        return false;
      }
      // Apply price filter
      if (filters.price !== 'All') {
        const lowerCasePrice = event.price?.toLowerCase() || '';
        if (filters.price === 'Free' && !lowerCasePrice.includes('free')) return false;
        if (filters.price === 'Paid' && (lowerCasePrice.includes('free') || lowerCasePrice.includes('donation') || !lowerCasePrice)) return false;
        if (filters.price === 'Donation' && !lowerCasePrice.includes('donation')) return false;
      }
      // Apply area filter (using geographical_state)
      if (filters.area !== 'All' && event.geographical_state !== filters.area) {
        return false;
      }
      return true;
    });

    const nextEvents = filtered.slice(offset, offset + EVENTS_PER_LOAD);
    setDisplayedEvents(prevEvents => [...prevEvents, ...nextEvents]);
    setOffset(prevOffset => prevOffset + nextEvents.length);
    setHasMore(filtered.length > offset + nextEvents.length);
    setLoadingMore(false);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    // When filters change, reset pagination and re-apply filters
    setOffset(0);
    setHasMore(true);
  };

  const getSectionEvents = (sectionType: 'highlights' | 'upcoming') => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = addDays(now, 1);
    tomorrow.setHours(0, 0, 0, 0);

    let sectionFilteredEvents = allEvents.filter(event => {
      const eventDate = parseISO(event.event_date);

      // Apply date filter from main filters state
      switch (filters.date) {
        case 'Today':
          if (!isToday(eventDate)) return false;
          break;
        case 'Tomorrow':
          if (!isToday(eventDate) && !isSameDay(eventDate, tomorrow)) return false;
          break;
        case 'This Week':
          const startW = startOfWeek(now, { weekStartsOn: 1 });
          const endW = endOfWeek(now, { weekStartsOn: 1 });
          if (!(eventDate >= startW && eventDate <= endW)) return false;
          break;
        case 'This Month':
          const startM = startOfMonth(now);
          const endM = endOfMonth(now);
          if (!(eventDate >= startM && eventDate <= endM)) return false;
          break;
        case 'All Upcoming':
          if (isPast(eventDate) && !isToday(eventDate)) return false; // Only show future or today
          break;
        default:
          break;
      }

      // Apply other filters
      if (filters.category !== 'All' && event.event_type !== filters.category) return false;
      if (filters.venue !== 'All' && event.place_name !== filters.venue) return false;
      if (filters.price !== 'All') {
        const lowerCasePrice = event.price?.toLowerCase() || '';
        if (filters.price === 'Free' && !lowerCasePrice.includes('free')) return false;
        if (filters.price === 'Paid' && (lowerCasePrice.includes('free') || lowerCasePrice.includes('donation') || !lowerCasePrice)) return false;
        if (filters.price === 'Donation' && !lowerCasePrice.includes('donation')) return false;
      }
      if (filters.area !== 'All' && event.geographical_state !== filters.area) return false;
      return true;
    });

    if (sectionType === 'highlights') {
      const todayEvents = sectionFilteredEvents.filter(event => isToday(parseISO(event.event_date)));
      return todayEvents.slice(0, 3); // Limit highlights to 3 for a concise view
    } else if (sectionType === 'upcoming') {
      // Exclude today's highlights from upcoming to avoid duplication
      const highlightIds = getSectionEvents('highlights').map(e => e.id);
      return sectionFilteredEvents
        .filter(event => (isFuture(parseISO(event.event_date)) || isToday(parseISO(event.event_date))) && !highlightIds.includes(event.id));
    }
    return [];
  };

  const handleShare = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const eventUrl = `${window.location.origin}/v2/events/${event.id}`;
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
        fetchInitialEvents(); // Re-fetch all events to update the list
      }
    }
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const highlights = getSectionEvents('highlights');
  const upcomingEvents = getSectionEvents('upcoming');

  return (
    <div className="w-full max-w-screen-lg">
      {/* Filters below the header */}
      <div className="mb-8 flex justify-center">
        <FilterDropdownsV2 currentFilters={filters} onFilterChange={handleFilterChange} />
      </div>

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
              <div className="grid grid-cols-1 gap-6"> {/* Single column for highlights */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Grid for upcoming events */}
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
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading More...
                      </>
                    ) : (
                      'Load More Events'
                    )}
                  </Button>
                </div>
              )}
            </section>
          )}

          {highlights.length === 0 && upcomingEvents.length === 0 && (
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