import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay, isSameMonth } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, PlusCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EventCardV2 from '@/components/v2/EventCardV2';
import EventDetailDialog from '@/components/EventDetailDialog';
import { Event } from '@/types/event';
import FilterDropdownsV2, { FilterDropdownsV2Props } from '@/components/v2/FilterDropdownsV2';
import { useSession } from '@/components/SessionContextProvider';
import AdvancedEventCalendar from '@/components/AdvancedEventCalendar';
import { generateRecurringInstances } from '@/utils/event-utils';

const EVENTS_PER_LOAD = 6;

const EventsListV2 = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [availableVenues, setAvailableVenues] = useState<string[]>([]);
  const [favouriteVenues, setFavouriteVenues] = useState<string[]>([]);

  const [filters, setFilters] = useState<FilterDropdownsV2Props['currentFilters']>({
    date: 'All Upcoming',
    category: [],
    venue: [],
    price: [],
    state: [],
  });

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const fetchFavouriteVenues = useCallback(async () => {
    if (!user) {
      setFavouriteVenues([]);
      return;
    }
    const { data } = await supabase
      .from('user_favourite_venues')
      .select('place_name')
      .eq('user_id', user.id);

    if (data) {
      setFavouriteVenues(data.map(item => item.place_name));
    }
  }, [user]);

  const fetchInitialEvents = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('approval_status', 'approved')
      .eq('is_deleted', false)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events.');
    } else {
      const validEvents = (data || []).filter(event => event.id && event.id.length > 30);
      
      let combinedEvents: Event[] = [];
      validEvents.forEach(event => {
        if (!isPast(parseISO(event.event_date)) || isToday(parseISO(event.event_date))) {
          combinedEvents.push(event);
        }
        if (event.recurring_pattern) {
          combinedEvents = combinedEvents.concat(generateRecurringInstances(event));
        }
      });

      combinedEvents.sort((a, b) => parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime());
      setAllEvents(combinedEvents);
      
      const uniqueVenues = Array.from(new Set(validEvents.map(event => event.place_name).filter(Boolean))) as string[];
      setAvailableVenues(uniqueVenues.sort());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInitialEvents();
    if (!isSessionLoading) {
      fetchFavouriteVenues();
    }
  }, [fetchInitialEvents, fetchFavouriteVenues, isSessionLoading]);

  const getFilteredEvents = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = addDays(now, 1);

    return allEvents.filter(event => {
      const eventDate = parseISO(event.event_date);

      switch (filters.date) {
        case 'Today': if (!isToday(eventDate)) return false; break;
        case 'Tomorrow': if (!isSameDay(eventDate, tomorrow)) return false; break;
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
          if (isPast(eventDate) && !isToday(eventDate)) return false;
          break;
      }

      if (filters.category.length > 0 && !filters.category.includes(event.event_type || '')) return false;
      if (filters.venue.length > 0 && !filters.venue.includes(event.place_name || '')) return false;
      
      if (filters.price.length > 0) {
        const lowerCasePrice = event.price?.toLowerCase() || '';
        const isFree = lowerCasePrice.includes('free');
        const isDonation = lowerCasePrice.includes('donation');
        const isPaid = !isFree && !isDonation && !!lowerCasePrice;

        let priceMatch = false;
        if (filters.price.includes('Free') && isFree) priceMatch = true;
        if (filters.price.includes('Paid') && isPaid) priceMatch = true;
        if (filters.price.includes('Donation') && isDonation) priceMatch = true;
        if (!priceMatch) return false;
      }
      
      if (filters.state.length > 0 && !filters.state.includes(event.geographical_state || '')) return false;
      
      return true;
    });
  }, [allEvents, filters]);

  useEffect(() => {
    const filtered = getFilteredEvents();
    setDisplayedEvents(filtered.slice(0, EVENTS_PER_LOAD));
    setOffset(EVENTS_PER_LOAD);
    setHasMore(filtered.length > EVENTS_PER_LOAD);
  }, [getFilteredEvents]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    const filtered = getFilteredEvents();
    const nextEvents = filtered.slice(offset, offset + EVENTS_PER_LOAD);
    setDisplayedEvents(prevEvents => [...prevEvents, ...nextEvents]);
    setOffset(prevOffset => prevOffset + nextEvents.length);
    setHasMore(filtered.length > offset + nextEvents.length);
    setLoadingMore(false);
  };

  const handleToggleFavouriteVenue = async (placeName: string, isFavourited: boolean) => {
    if (!user) {
      toast.info('Please log in to favourite venues.');
      return;
    }

    if (isFavourited) {
      await supabase.from('user_favourite_venues').delete().eq('user_id', user.id).eq('place_name', placeName);
    } else {
      await supabase.from('user_favourite_venues').insert([{ user_id: user.id, place_name: placeName }]);
    }
    fetchFavouriteVenues();
  };

  const handleShare = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseId = event.id.split('-')[0];
    navigator.clipboard.writeText(`${window.location.origin}/events/${baseId}`)
      .then(() => toast.success('Event link copied!'))
      .catch(() => toast.error('Failed to copy link.'));
  };

  const handleDelete = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseId = eventId.split('-')[0];
    if (baseId.length < 30) return;

    if (window.confirm('Are you sure you want to delete this event?')) {
      const { error } = await supabase.from('events').update({ is_deleted: true }).eq('id', baseId);
      if (!error) {
        toast.success('Event moved to trash.');
        fetchInitialEvents();
      }
    }
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const allFilteredEvents = getFilteredEvents();
  const selectedDayEvents = allFilteredEvents.filter(event => isSameDay(parseISO(event.event_date), selectedDay));
  const currentMonthEvents = allFilteredEvents.filter(event => isSameMonth(parseISO(event.event_date), currentMonth) && !isSameDay(parseISO(event.event_date), selectedDay));

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <FilterDropdownsV2
          currentFilters={filters}
          onFilterChange={setFilters}
          availableVenues={availableVenues}
          favouriteVenues={favouriteVenues}
          onToggleFavouriteVenue={handleToggleFavouriteVenue}
          isUserLoggedIn={!!user}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <section className="mb-12">
              <h2 className="text-3xl font-heading font-bold text-foreground mb-6 border-b pb-2 border-border">Events</h2>
              <div className="grid grid-cols-1 gap-6">
                {displayedEvents.map(event => (
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
                  <Button onClick={handleLoadMore} disabled={loadingMore} className="bg-primary hover:bg-primary/80 text-primary-foreground">
                    {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Load More Events'}
                  </Button>
                </div>
              )}
            </section>
          ) : (
            <div>
              <AdvancedEventCalendar
                events={allFilteredEvents}
                onEventSelect={handleViewDetails}
                selectedDay={selectedDay}
                onDayClick={setSelectedDay}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
              <div className="mt-8">
                <h3 className="text-2xl font-heading font-bold text-foreground mb-4 border-b pb-2 border-border">Events for {format(selectedDay, 'MMMM d, yyyy')}</h3>
                {selectedDayEvents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {selectedDayEvents.map(event => (
                      <EventCardV2 key={event.id} event={event} onShare={handleShare} onDelete={handleDelete} onViewDetails={handleViewDetails} />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-secondary rounded-xl border border-border text-center">
                    <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground">No events scheduled for this day.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />
    </div>
  );
};

export default EventsListV2;