import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isPast, isSameDay, isSameMonth } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, Loader2, PlusCircle, FilterX, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import EventCardV2 from '@/components/v2/EventCardV2';
import EventDetailDialog from '@/components/EventDetailDialog';
import { Event } from '@/types/event';
import FilterDropdownsV2 from '@/components/v2/FilterDropdownsV2';
import { useSession } from '@/components/SessionContextProvider';
import AdvancedEventCalendar from '@/components/AdvancedEventCalendar';
import { generateRecurringInstances } from '@/utils/event-utils';
import { useEventFilters } from '@/hooks/use-event-filters';

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

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { filters, setFilters, searchTerm, setSearchTerm, filteredEvents } = useEventFilters(allEvents);

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

  useEffect(() => {
    setDisplayedEvents(filteredEvents.slice(0, EVENTS_PER_LOAD));
    setOffset(EVENTS_PER_LOAD);
    setHasMore(filteredEvents.length > EVENTS_PER_LOAD);
  }, [filteredEvents]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    const nextEvents = filteredEvents.slice(offset, offset + EVENTS_PER_LOAD);
    setDisplayedEvents(prevEvents => [...prevEvents, ...nextEvents]);
    setOffset(prevOffset => prevOffset + nextEvents.length);
    setHasMore(filteredEvents.length > offset + nextEvents.length);
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({
      date: 'All Upcoming',
      category: [],
      venue: [],
      price: [],
      state: [],
    });
  };

  const selectedDayEvents = filteredEvents.filter(event => isSameDay(parseISO(event.event_date), selectedDay));
  const hasActiveFilters = searchTerm !== '' || filters.date !== 'All Upcoming' || filters.category.length > 0 || filters.venue.length > 0 || filters.price.length > 0 || filters.state.length > 0;

  return (
    <div className="w-full max-w-2xl px-4">
      <div className="mb-16 text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase mb-2">
          <Sparkles className="h-3 w-3 mr-2" /> Discover Your Flow
        </div>
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground leading-[1.1]">
          Soulful Gatherings <br />
          <span className="text-primary italic font-normal">Across Australia</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          Find workshops, meditations, and community events that nourish your spirit.
        </p>
      </div>

      <div className="mb-12 space-y-6 glass-card p-8 rounded-[2.5rem] shadow-2xl border-white/40 dark:border-white/5">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search events, venues, or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 h-14 rounded-2xl border-none bg-secondary/50 focus-visible:ring-primary text-lg placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
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
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-12">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-6">
              <Skeleton className="h-[300px] w-full rounded-[2rem]" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <section className="mb-24">
              <div className="flex items-center justify-between mb-10 border-b pb-4 border-border/40">
                <h2 className="text-3xl font-heading font-bold text-foreground tracking-tight">Upcoming Events</h2>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground hover:text-primary font-bold rounded-full">
                    <FilterX className="mr-2 h-4 w-4" /> Clear All
                  </Button>
                )}
              </div>
              
              {displayedEvents.length > 0 ? (
                <div className="grid grid-cols-1 gap-12">
                  {displayedEvents.map(event => (
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
              ) : (
                <div className="p-20 glass-card rounded-[3rem] text-center border-dashed border-primary/20">
                  <Frown className="h-20 w-20 text-primary/20 mx-auto mb-8" />
                  <h3 className="text-3xl font-heading font-bold text-foreground mb-4">No events found</h3>
                  <p className="text-muted-foreground mb-10 text-lg max-w-xs mx-auto">Try adjusting your filters or share your own soulful event.</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={handleClearFilters} className="rounded-2xl px-8 py-7 text-lg font-bold">
                        Clear Filters
                      </Button>
                    )}
                    <Link to="/submit-event">
                      <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-10 py-7 text-lg font-bold shadow-2xl transition-transform hover:scale-105">
                        <PlusCircle className="mr-2 h-6 w-6" /> Add Your Event
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {hasMore && displayedEvents.length > 0 && (
                <div className="flex justify-center mt-16">
                  <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline" className="min-w-[280px] h-14 rounded-2xl transition-all hover:bg-primary hover:text-primary-foreground font-bold text-lg shadow-xl">
                    {loadingMore ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Load More Events'}
                  </Button>
                </div>
              )}
            </section>
          ) : (
            <div className="animate-in fade-in duration-1000">
              <AdvancedEventCalendar
                events={filteredEvents}
                onEventSelect={handleViewDetails}
                selectedDay={selectedDay}
                onDayClick={setSelectedDay}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
              <div className="mt-16">
                <h3 className="text-3xl font-heading font-bold text-foreground mb-10 border-b pb-4 border-border/40 tracking-tight">Events for {format(selectedDay, 'MMMM d, yyyy')}</h3>
                {selectedDayEvents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-12">
                    {selectedDayEvents.map(event => (
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
                ) : (
                  <div className="p-20 glass-card rounded-[3rem] text-center border-dashed border-primary/20">
                    <Frown className="h-16 w-16 text-primary/20 mx-auto mb-6" />
                    <p className="text-xl font-medium text-muted-foreground">No events scheduled for this day.</p>
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