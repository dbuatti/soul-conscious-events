import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isPast, isFuture, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay, isSameMonth, addWeeks, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, PlusCircle, Loader2, CalendarDays } from 'lucide-react'; // Import CalendarDays
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EventCardV2 from '@/components/v2/EventCardV2';
import EventDetailDialog from '@/components/EventDetailDialog';
import { Event } from '@/types/event';
import { v2EventCategories, v2PriceOptions, v2Venues, v2States, v2DateOptions } from '@/lib/v2/constants';
import FilterDropdownsV2, { FilterDropdownsV2Props } from '@/components/v2/FilterDropdownsV2';
import { useSession } from '@/components/SessionContextProvider';
import AdvancedEventCalendar from '@/components/AdvancedEventCalendar';

const EVENTS_PER_LOAD = 6;
const MAX_RECURRENCE_INSTANCES = 10; // Limit generated instances for performance

// Helper function to generate recurring event instances
const generateRecurringInstances = (event: Event, maxInstances: number): Event[] => {
  if (!event.recurring_pattern) return [];

  const originalStartDate = parseISO(event.event_date);
  const originalEndDate = event.end_date ? parseISO(event.end_date) : originalStartDate;
  const duration = originalEndDate.getTime() - originalStartDate.getTime();
  
  const instances: Event[] = [];
  let currentDate = originalStartDate;
  let count = 0;

  while (count < maxInstances) {
    let nextDate: Date;

    switch (event.recurring_pattern) {
      case 'DAILY':
        nextDate = addDays(currentDate, 1);
        break;
      case 'WEEKLY':
        nextDate = addWeeks(currentDate, 1);
        break;
      case 'FORTNIGHTLY':
        nextDate = addWeeks(currentDate, 2);
        break;
      case 'MONTHLY':
        nextDate = addMonths(currentDate, 1);
        break;
      default:
        return instances;
    }

    // Stop generating if the next date is too far in the future (e.g., 3 months from now)
    if (nextDate > addMonths(new Date(), 3)) {
      break;
    }

    // Only generate instances that are in the future or today
    if (isFuture(nextDate) || isToday(nextDate)) {
      const newEvent: Event = {
        ...event,
        id: `${event.id}-${format(nextDate, 'yyyyMMdd')}`, // Unique ID for instance
        event_date: format(nextDate, 'yyyy-MM-dd'),
        end_date: event.end_date ? format(new Date(nextDate.getTime() + duration), 'yyyy-MM-dd') : undefined,
        // Mark as recurring instance
        is_recurring_instance: true,
      };
      instances.push(newEvent);
    }
    
    currentDate = nextDate;
    count++;
  }
  return instances;
};

const EventsListV2 = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [baseEvents, setBaseEvents] = useState<Event[]>([]); // Stores non-recurring and original recurring events
  const [allEvents, setAllEvents] = useState<Event[]>([]); // Stores base events + generated recurring instances
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
    const { data, error } = await supabase
      .from('user_favourite_venues')
      .select('place_name')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching favourite venues:', error);
      setFavouriteVenues([]);
    } else {
      setFavouriteVenues(data.map(item => item.place_name));
    }
  }, [user]);

  const fetchInitialEvents = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);

    let query = supabase.from('events').select('*');
    query = query.eq('approval_status', 'approved');
    query = query.eq('is_deleted', false);
    query = query.order('event_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events.');
      setBaseEvents([]);
      setAllEvents([]);
      setAvailableVenues([]);
    } else {
      // Filter out corrupted IDs (IDs that are too short to be UUIDs)
      const validEvents = (data || []).filter(event => {
        if (event.id && event.id.length < 30) {
          console.error(`Corrupted event ID detected during fetch: ${event.id} (Length: ${event.id.length}). Filtering out.`);
          return false;
        }
        return true;
      });
      
      if (data && data.length !== validEvents.length) {
        console.warn(`Filtered out ${data.length - validEvents.length} events with corrupted IDs.`);
      }

      setBaseEvents(validEvents);
      
      // Generate recurring instances
      let combinedEvents: Event[] = [];
      const recurringEvents: Event[] = [];

      validEvents.forEach(event => {
        // Only include the original event if it's not in the past
        if (!isPast(parseISO(event.event_date)) || isToday(parseISO(event.event_date))) {
          combinedEvents.push(event);
        }

        if (event.recurring_pattern) {
          recurringEvents.push(event);
        }
      });

      // Generate instances for recurring events
      recurringEvents.forEach(event => {
        const instances = generateRecurringInstances(event, MAX_RECURRENCE_INSTANCES);
        combinedEvents = combinedEvents.concat(instances);
      });

      // Sort combined events by date
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
    tomorrow.setHours(0, 0, 0, 0);

    return allEvents.filter(event => {
      const eventDate = parseISO(event.event_date);

      // 1. Date Filter
      switch (filters.date) {
        case 'Today':
          if (!isToday(eventDate)) return false;
          break;
        case 'Tomorrow':
          if (!isSameDay(eventDate, tomorrow)) return false;
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
          // Filter out past events unless they are the original event and we are in list view (handled by fetchInitialEvents)
          // Since allEvents already filters out past base events, we just ensure we don't show instances that somehow slipped through
          if (isPast(eventDate) && !isToday(eventDate)) return false;
          break;
        default:
          break;
      }

      // 2. Category Filter
      if (filters.category.length > 0 && !filters.category.includes(event.event_type || '')) {
        return false;
      }
      
      // 3. Venue Filter
      if (filters.venue.length > 0 && !filters.venue.includes(event.place_name || '')) {
        return false;
      }
      
      // 4. Price Filter
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
      
      // 5. State Filter
      if (filters.state.length > 0 && !filters.state.includes(event.geographical_state || '')) {
        return false;
      }
      
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

  const handleFilterChange = (newFilters: FilterDropdownsV2Props['currentFilters']) => {
    setFilters(newFilters);
    setOffset(0);
    setHasMore(true);
  };

  const handleToggleFavouriteVenue = async (placeName: string, isFavourited: boolean) => {
    if (!user) {
      toast.info('Please log in to favourite venues.');
      return;
    }

    if (isFavourited) {
      const { error } = await supabase
        .from('user_favourite_venues')
        .delete()
        .eq('user_id', user.id)
        .eq('place_name', placeName);
      if (error) {
        console.error('Error unfavouriting venue:', error);
        toast.error('Failed to unfavourite venue.');
      } else {
        toast.success(`${placeName} removed from favourites.`);
        fetchFavouriteVenues();
      }
    } else {
      const { error } = await supabase
        .from('user_favourite_venues')
        .insert([{ user_id: user.id, place_name: placeName }]);
      if (error) {
        console.error('Error favouriting venue:', error);
        toast.error('Failed to favourite venue.');
      } else {
        toast.success(`${placeName} added to favourites!`);
        fetchFavouriteVenues();
      }
    }
  };

  const handleShare = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    // Use the base event ID for sharing, even if it's a recurring instance
    const baseId = event.id.split('-')[0];
    const eventUrl = `${window.location.origin}/events/${baseId}`;
    navigator.clipboard.writeText(eventUrl)
      .then(() => toast.success('Event link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link. Please try again.'));
  };

  const handleDelete = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // If it's a recurring instance, we need the base ID
    const baseId = eventId.split('-')[0];

    // CRITICAL CHECK: If the base ID is still the corrupted short string, we stop here.
    if (baseId.length < 30) {
      console.error('Deletion blocked: Corrupted base ID detected:', baseId);
      toast.error('Cannot delete: Event ID is corrupted. Please contact support.');
      return;
    }

    console.log('Attempting to delete event with base ID:', baseId); // <-- DIAGNOSTIC LOG

    if (window.confirm('Are you sure you want to delete this event? It will be hidden from public view but can be restored from the Admin Panel.')) {
      const { error } = await supabase.from('events').update({ is_deleted: true }).eq('id', baseId);
      if (error) {
        console.error('Supabase deletion error:', error); // <-- DIAGNOSTIC LOG
        toast.error('Failed to delete event.');
      } else {
        toast.success('Event moved to trash.');
        fetchInitialEvents(); // Re-fetch events after deletion
      }
    }
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const allFilteredEvents = getFilteredEvents();
  
  // For calendar view, we need all filtered events, not just the paginated ones
  const selectedDayEvents = allFilteredEvents.filter(event => isSameDay(parseISO(event.event_date), selectedDay));
  const currentMonthEvents = allFilteredEvents.filter(event => isSameMonth(parseISO(event.event_date), currentMonth) && !isSameDay(parseISO(event.event_date), selectedDay));

  const highlights = displayedEvents.filter(event => isToday(parseISO(event.event_date))).slice(0, 3);
  const upcomingEvents = displayedEvents.filter(event => (isFuture(parseISO(event.event_date)) || isToday(parseISO(event.event_date))) && !highlights.map(h => h.id).includes(event.id));

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <FilterDropdownsV2
          currentFilters={filters}
          onFilterChange={handleFilterChange}
          availableVenues={availableVenues}
          favouriteVenues={favouriteVenues}
          onToggleFavouriteVenue={handleToggleFavouriteVenue}
          isUserLoggedIn={!!user}
          viewMode={viewMode} // Pass viewMode
          onViewModeChange={setViewMode} // Pass onViewModeChange
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6">
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
          {viewMode === 'list' ? (
            <>
              {highlights.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-3xl font-heading font-bold text-foreground mb-6 border-b pb-2 border-border">Today's Highlights</h2> {/* Applied font-heading */}
                  <div className="grid grid-cols-1 gap-6">
                    {highlights.map(event => (
                      <EventCardV2
                        key={event.id}
                        event={event}
                        onShare={handleShare}
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                        isFeaturedToday={isToday(parseISO(event.event_date))}
                      />
                    ))}
                  </div>
                </section>
              )}

              {upcomingEvents.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-3xl font-heading font-bold text-foreground mb-6 border-b pb-2 border-border">Upcoming Events</h2> {/* Applied font-heading */}
                  <div className="grid grid-cols-1 gap-6">
                    {upcomingEvents.map(event => (
                      <EventCardV2
                        key={event.id}
                        event={event}
                        onShare={handleShare}
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                        isFeaturedToday={isToday(parseISO(event.event_date))}
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
          ) : ( // Calendar View
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
                <h3 className="text-2xl font-heading font-bold text-foreground mb-4 border-b pb-2 border-border">Events for {format(selectedDay, 'MMMM d, yyyy')}</h3> {/* Styled heading */}
                {selectedDayEvents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {selectedDayEvents.map(event => (
                      <EventCardV2
                        key={event.id}
                        event={event}
                        onShare={handleShare}
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-secondary rounded-xl border border-border text-center shadow-md">
                    <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground mb-4">No events scheduled for this day.</p>
                  </div>
                )}
              </div>
              <div className="mt-12">
                <h3 className="text-2xl font-heading font-bold text-foreground mb-4 border-b pb-2 border-border">More events in {format(currentMonth, 'MMMM')}</h3> {/* Styled heading */}
                {currentMonthEvents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {currentMonthEvents.map(event => (
                      <EventCardV2
                        key={event.id}
                        event={event}
                        onShare={handleShare}
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-secondary rounded-xl border border-border text-center shadow-md">
                    <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground mb-4">No upcoming events found for this month.</p>
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