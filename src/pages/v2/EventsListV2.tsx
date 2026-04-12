import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isPast, isSameDay, subDays } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, Loader2, PlusCircle, FilterX, Search, Sparkles, Bookmark, CalendarCheck, Share2, X, Map as MapIcon } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import LeafletMap from '@/components/v2/LeafletMap';

const EVENTS_PER_LOAD = 8;

const QUICK_FILTERS = [
  { label: 'Wellness', value: 'Wellness' },
  { label: 'Music', value: 'Music' },
  { label: 'Meditation', value: 'Meditation' },
  { label: 'Dance', value: 'Dance & Movement' },
  { label: 'Social', value: 'Community & Social' },
];

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

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('list');
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
    if (!isSessionLoading) fetchFavouriteVenues();
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
    setFilters({ date: 'All Upcoming', category: [], venue: [], price: [], state: [] });
  };

  const removeFilter = (type: keyof typeof filters, value?: string) => {
    if (type === 'date') {
      setFilters({ ...filters, date: 'All Upcoming' });
    } else if (Array.isArray(filters[type])) {
      setFilters({
        ...filters,
        [type]: (filters[type] as string[]).filter(v => v !== value)
      });
    }
  };

  const toggleQuickFilter = (category: string) => {
    const isSelected = filters.category.includes(category);
    setFilters({
      ...filters,
      category: isSelected 
        ? filters.category.filter(c => c !== category)
        : [...filters.category, category]
    });
  };

  const selectedDayEvents = filteredEvents.filter(event => isSameDay(parseISO(event.event_date), selectedDay));
  const hasActiveFilters = searchTerm !== '' || filters.date !== 'All Upcoming' || filters.category.length > 0 || filters.venue.length > 0 || filters.price.length > 0 || filters.state.length > 0;

  return (
    <div className="w-full max-w-6xl px-4">
      <div className="mb-12 sm:mb-20 text-center space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="inline-flex items-center px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-primary/10 text-primary text-[10px] sm:text-[11px] font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-1 sm:mb-2">
          <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-2 sm:mr-2.5" /> Discover Your Flow
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black font-heading tracking-tight text-foreground leading-[1.1] sm:leading-[1.05]">
          Soulful Gatherings <br />
          <span className="text-primary italic font-normal">Across Australia</span>
        </h1>
        <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium px-4">
          Find workshops, meditations, and community events that nourish your spirit and connect you with like-minded souls.
        </p>
      </div>

      <div className="mb-10 sm:mb-16 space-y-6 sm:space-y-8 organic-card p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem]">
        <div className="space-y-4 sm:space-y-6">
          <div className="relative group">
            <Search className="absolute left-5 sm:left-8 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-14 sm:pl-20 pr-12 sm:pr-16 h-14 sm:h-20 rounded-2xl sm:rounded-[2rem] border-none bg-secondary/50 focus-visible:ring-primary text-lg sm:text-2xl placeholder:text-muted-foreground/40 font-medium"
            />
            {searchTerm && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-2 sm:px-4">
            <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mr-1 sm:mr-2">Quick Filters:</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((qf) => (
                <button
                  key={qf.value}
                  onClick={() => toggleQuickFilter(qf.value)}
                  className={cn(
                    "px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 border",
                    filters.category.includes(qf.value)
                      ? "bg-primary border-primary text-white shadow-lg scale-105"
                      : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                  )}
                >
                  {qf.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-4 sm:space-y-6">
          <FilterDropdownsV2
            currentFilters={filters}
            onFilterChange={setFilters}
            availableVenues={availableVenues}
            favouriteVenues={favouriteVenues}
            onToggleFavouriteVenue={handleToggleFavouriteVenue}
            isUserLoggedIn={!!user}
            viewMode={viewMode === 'map' ? 'list' : viewMode}
            onViewModeChange={(mode) => setViewMode(mode)}
          />
          
          <div className="flex justify-center lg:justify-start">
            <Button 
              variant={viewMode === 'map' ? 'default' : 'outline'}
              onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
              className="rounded-xl gap-2 h-10 px-6 font-bold transition-all w-full sm:w-auto"
            >
              <MapIcon className="h-4 w-4" /> {viewMode === 'map' ? 'Show List' : 'Show Map'}
            </Button>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-bottom-2">
              <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mr-1 sm:mr-2">Active:</span>
              {filters.date !== 'All Upcoming' && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 text-[10px] sm:text-xs">
                  {filters.date}
                  <X className="h-3 w-3 cursor-pointer hover:text-primary/60" onClick={() => removeFilter('date')} />
                </Badge>
              )}
              {filters.category.map(cat => (
                <Badge key={cat} variant="secondary" className="bg-primary/10 text-primary border-none px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 text-[10px] sm:text-xs">
                  {cat}
                  <X className="h-3 w-3 cursor-pointer hover:text-primary/60" onClick={() => removeFilter('category', cat)} />
                </Badge>
              ))}
              {filters.venue.map(v => (
                <Badge key={v} variant="secondary" className="bg-primary/10 text-primary border-none px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 text-[10px] sm:text-xs">
                  {v}
                  <X className="h-3 w-3 cursor-pointer hover:text-primary/60" onClick={() => removeFilter('venue', v)} />
                </Badge>
              ))}
              {filters.price.map(p => (
                <Badge key={p} variant="secondary" className="bg-primary/10 text-primary border-none px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 text-[10px] sm:text-xs">
                  {p}
                  <X className="h-3 w-3 cursor-pointer hover:text-primary/60" onClick={() => removeFilter('price', p)} />
                </Badge>
              ))}
              {filters.state.map(s => (
                <Badge key={s} variant="secondary" className="bg-primary/10 text-primary border-none px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 text-[10px] sm:text-xs">
                  {s}
                  <X className="h-3 w-3 cursor-pointer hover:text-primary/60" onClick={() => removeFilter('state', s)} />
                </Badge>
              ))}
              <Button variant="link" size="sm" onClick={handleClearFilters} className="text-[9px] sm:text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest p-0 h-auto ml-1 sm:ml-2">
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-6 sm:space-y-8">
              <Skeleton className="h-[250px] sm:h-[400px] w-full rounded-[2rem] sm:rounded-[2.5rem]" />
              <div className="space-y-3 sm:space-y-4 px-2 sm:px-4">
                <Skeleton className="h-8 sm:h-10 w-3/4 rounded-xl" />
                <Skeleton className="h-5 sm:h-6 w-1/2 rounded-lg" />
                <Skeleton className="h-5 sm:h-6 w-2/3 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <section className="mb-20 sm:mb-32">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-12 border-b pb-6 sm:pb-8 border-border/40 gap-4">
                <h2 className="text-3xl sm:text-5xl font-heading font-bold text-foreground tracking-tight">Upcoming Events</h2>
                <div className="flex items-center gap-3">
                  {searchTerm && <span className="text-[10px] sm:text-xs font-black text-primary/60 uppercase tracking-widest animate-pulse">Searching...</span>}
                  <div className={cn(
                    "text-[10px] sm:text-sm font-black text-muted-foreground/60 uppercase tracking-widest bg-secondary/50 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full transition-all duration-500",
                    filteredEvents.length > 0 && "text-primary/80"
                  )}>
                    {filteredEvents.length} {filteredEvents.length === 1 ? 'Event' : 'Events'} Found
                  </div>
                </div>
              </div>
              
              {displayedEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
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
                <div className="p-12 sm:p-24 organic-card rounded-[2.5rem] sm:rounded-[4rem] text-center border-dashed border-primary/20">
                  <Frown className="h-16 w-16 sm:h-24 sm:w-24 text-primary/20 mx-auto mb-6 sm:mb-10" />
                  <h3 className="text-2xl sm:text-4xl font-heading font-bold text-foreground mb-4 sm:mb-6">No events found</h3>
                  <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-sm mx-auto font-medium">Try adjusting your filters or share your own soulful event.</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={handleClearFilters} className="rounded-2xl px-8 py-6 sm:px-10 sm:py-8 text-lg sm:text-xl font-black">
                        Clear Filters
                      </Button>
                    )}
                    <Link to="/submit-event">
                      <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-8 py-6 sm:px-12 sm:py-8 text-lg sm:text-xl font-black shadow-2xl transition-transform hover:scale-105">
                        <PlusCircle className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7" /> Add Your Event
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {hasMore && displayedEvents.length > 0 && (
                <div className="flex justify-center mt-16 sm:mt-24">
                  <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline" className="w-full sm:min-w-[340px] h-16 sm:h-20 rounded-2xl sm:rounded-[2rem] transition-all hover:bg-primary hover:text-primary-foreground font-black text-xl sm:text-2xl shadow-2xl">
                    {loadingMore ? <Loader2 className="mr-3 h-5 w-5 sm:h-6 sm:w-6 animate-spin" /> : 'Load More Events'}
                  </Button>
                </div>
              )}
            </section>
          ) : viewMode === 'calendar' ? (
            <div className="animate-in fade-in duration-1000">
              <AdvancedEventCalendar
                events={filteredEvents}
                onEventSelect={handleViewDetails}
                selectedDay={selectedDay}
                onDayClick={setSelectedDay}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
              <div className="mt-16 sm:mt-24">
                <h3 className="text-3xl sm:text-5xl font-heading font-bold text-foreground mb-8 sm:mb-12 border-b pb-6 sm:pb-8 border-border/40 tracking-tight">Events for {format(selectedDay, 'MMMM d, yyyy')}</h3>
                {selectedDayEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
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
                  <div className="p-12 sm:p-24 organic-card rounded-[2.5rem] sm:rounded-[4rem] text-center border-dashed border-primary/20">
                    <Frown className="h-16 w-16 sm:h-20 sm:w-20 text-primary/20 mx-auto mb-6 sm:mb-8" />
                    <p className="text-xl sm:text-2xl font-bold text-muted-foreground">No events scheduled for this day.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-1000 mb-20 sm:mb-32">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-12 border-b pb-6 sm:pb-8 border-border/40 gap-4">
                <h2 className="text-3xl sm:text-5xl font-heading font-bold text-foreground tracking-tight">Event Map</h2>
                <div className="text-[10px] sm:text-sm font-black text-muted-foreground/60 uppercase tracking-widest bg-secondary/50 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full w-fit">
                  {filteredEvents.length} Locations Found
                </div>
              </div>
              <LeafletMap events={filteredEvents} onViewDetails={handleViewDetails} />
            </div>
          )}
        </>
      )}

      {!user && !loading && (
        <section className="mt-20 sm:mt-40 mb-16 sm:mb-24 organic-card p-8 sm:p-20 rounded-[2.5rem] sm:rounded-[4rem] text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
          <h2 className="text-3xl sm:text-5xl font-heading font-bold text-foreground mb-8 sm:mb-12">Join the SoulFlow Community</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 mb-12 sm:mb-16">
            <div className="space-y-4 sm:space-y-6">
              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto">
                <Bookmark className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="font-black text-xl sm:text-2xl">Save Favourites</h3>
              <p className="text-muted-foreground text-sm sm:text-base font-medium">Bookmark events you love and never miss a soulful gathering.</p>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto">
                <CalendarCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="font-black text-xl sm:text-2xl">Share Events</h3>
              <p className="text-muted-foreground text-sm sm:text-base font-medium">Submit your own workshops or circles to our growing community.</p>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto">
                <Share2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="font-black text-xl sm:text-2xl">Manage Listings</h3>
              <p className="text-muted-foreground text-sm sm:text-base font-medium">Easily edit or update your event details at any time.</p>
            </div>
          </div>
          <Link to="/login">
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl sm:rounded-[2rem] px-10 py-8 sm:px-16 sm:py-10 text-xl sm:text-2xl font-black shadow-2xl transition-transform hover:scale-105">
              Sign Up for Free
            </Button>
          </Link>
        </section>
      )}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />
    </div>
  );
};

export default EventsListV2;