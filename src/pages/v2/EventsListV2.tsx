import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { format, parseISO, isToday, isSameDay, addDays, startOfToday } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, Loader2, Plus, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import EventCardV2 from '@/components/v2/EventCardV2';
import EventDetailDialog from '@/components/EventDetailDialog';
import { Event } from '@/types/event';
import EventsHero from '@/components/v2/EventsHero';
import EventsToolbar, { type FilterBadge } from '@/components/v2/EventsToolbar';
import EventDayGroups from '@/components/v2/EventDayGroups';
import HostCTA from '@/components/v2/HostCTA';
import { useSession } from '@/components/SessionContextProvider';
import { expandRecurringEvents, getAvailableVenues, getBaseEventId } from '@/utils/event-utils';
import { useEventFilters } from '@/hooks/use-event-filters';
import { useDeleteEvent, useEvents, useFavouriteVenues, useToggleFavouriteVenue } from '@/hooks/use-events';
import SEO from '@/components/SEO';

// Heavy, view-specific code is split out so it only loads when its view is opened.
const AdvancedEventCalendar = lazy(() => import('@/components/AdvancedEventCalendar'));
const LeafletMap = lazy(() => import('@/components/v2/LeafletMap'));

const ViewLoadingFallback = () => (
  <div className="py-16 flex justify-center" aria-busy="true" aria-label="Loading view">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const EVENTS_PER_LOAD = 8;

const EventsListV2 = () => {
  const { user } = useSession();
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const eventsQuery = useEvents();
  const deleteEvent = useDeleteEvent();
  const toggleFavouriteVenue = useToggleFavouriteVenue(user?.id);
  const { data: favouriteVenues = [] } = useFavouriteVenues(user?.id);

  const allEvents = useMemo(() => expandRecurringEvents(eventsQuery.data ?? []), [eventsQuery.data]);
  const availableVenues = useMemo(() => getAvailableVenues(eventsQuery.data ?? []), [eventsQuery.data]);

  const loading = eventsQuery.isLoading;

  const { filters, setFilters, searchTerm, setSearchTerm, filteredEvents, totalCount } = useEventFilters(allEvents);

  // Deduplicate recurring series for the list view: keep only the next upcoming instance per series.
  // Calendar and map views still receive the full filteredEvents so all instances are visible.
  const { listSource, extraCountMap } = useMemo(() => {
    const seenBaseIds = new Set<string>();
    const extraCountMap: Record<string, number> = {};
    const listSource: Event[] = [];
    for (const event of filteredEvents) {
      const baseId = getBaseEventId(event.id);
      if (seenBaseIds.has(baseId)) {
        extraCountMap[baseId] = (extraCountMap[baseId] || 0) + 1;
      } else {
        seenBaseIds.add(baseId);
        listSource.push(event);
      }
    }
    return { listSource, extraCountMap };
  }, [filteredEvents]);

  // Pagination source switches between deduplicated (list) and full (calendar/map)
  const paginationSource = viewMode === 'list' ? listSource : filteredEvents;

  useEffect(() => {
    setDisplayedEvents(paginationSource.slice(0, EVENTS_PER_LOAD));
    setOffset(EVENTS_PER_LOAD);
    setHasMore(paginationSource.length > EVENTS_PER_LOAD);
  }, [paginationSource]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    const nextEvents = paginationSource.slice(offset, offset + EVENTS_PER_LOAD);
    setDisplayedEvents(prevEvents => [...prevEvents, ...nextEvents]);
    setOffset(prevOffset => prevOffset + nextEvents.length);
    setHasMore(paginationSource.length > offset + nextEvents.length);
    setLoadingMore(false);
  };

  const handleToggleFavouriteVenue = (placeName: string, isFavourited: boolean) => {
    if (!user) {
      toast.info('Please log in to favourite venues.');
      return;
    }
    toggleFavouriteVenue.mutate(
      { placeName, isFavourited },
      { onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update favourites.') },
    );
  };

  const handleShare = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseId = getBaseEventId(event.id);
    navigator.clipboard.writeText(`${window.location.origin}/events/${baseId}`)
      .then(() => toast.success('Event link copied!'))
      .catch(() => toast.error('Failed to copy link.'));
  };

  const handleDelete = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseId = getBaseEventId(eventId);
    if (baseId.length < 30) return;
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    deleteEvent.mutate(baseId, {
      onSuccess: () => toast.success('Event moved to trash.'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete event.'),
    });
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

  const comingUp = useMemo(() => listSource.slice(0, 3), [listSource]);

  const nextWeekCount = useMemo(() => {
    const today = startOfToday();
    const weekOut = addDays(today, 7);
    return listSource.filter((e) => {
      const d = parseISO(e.event_date);
      return d >= today && d < weekOut;
    }).length;
  }, [listSource]);

  const filterBadges: FilterBadge[] = [
    ...(filters.date !== 'All Upcoming' ? [{ type: 'date' as const, label: filters.date }] : []),
    ...filters.category.map((v) => ({ type: 'category' as const, value: v, label: v })),
    ...filters.venue.map((v) => ({ type: 'venue' as const, value: v, label: v })),
    ...filters.price.map((v) => ({ type: 'price' as const, value: v, label: v })),
    ...filters.state.map((v) => ({ type: 'state' as const, value: v, label: v })),
  ];

  const statusPanel = (Icon: React.ElementType, title: string, message: React.ReactNode, action: React.ReactNode) => (
    <div className="py-16 sm:py-24 px-6 organic-card rounded-[2rem] text-center">
      <Icon className="h-12 w-12 text-primary/30 mx-auto mb-6" />
      <h3 className="text-3xl font-heading font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">{message}</p>
      {action}
    </div>
  );

  return (
    <div className="w-full max-w-6xl px-2 sm:px-4">
      <SEO
        title="SoulFlow | Discover Soulful Events in Australia"
        description="Connect with events that nourish your mind, body, and spirit across Australia. Find workshops, meditations, sound baths, and conscious gatherings."
      />

      <EventsHero
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedCategories={filters.category}
        onToggleQuickFilter={toggleQuickFilter}
        showNextWeekCount={!loading && !eventsQuery.isError}
        nextWeekCount={nextWeekCount}
        comingUp={comingUp}
        onViewDetails={handleViewDetails}
      />

      <EventsToolbar
        filters={filters}
        onFilterChange={setFilters}
        availableVenues={availableVenues}
        favouriteVenues={favouriteVenues}
        onToggleFavouriteVenue={handleToggleFavouriteVenue}
        isUserLoggedIn={!!user}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode)}
        hasActiveFilters={hasActiveFilters}
        searchTerm={searchTerm}
        onClearSearch={() => setSearchTerm('')}
        badges={filterBadges}
        onRemoveBadge={removeFilter}
        onClearFilters={handleClearFilters}
        shownCount={paginationSource.length}
        totalCount={totalCount}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6" aria-busy="true" aria-label="Loading events">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="organic-card rounded-[var(--radius)] overflow-hidden">
              <Skeleton className="aspect-[3/2] rounded-none" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : eventsQuery.isError ? (
        statusPanel(Database, 'We couldn’t load events',
          'We’re having trouble reaching the database. Please check your connection and try again.',
          <Button onClick={() => eventsQuery.refetch()} className="rounded-full px-6">Try again</Button>)
      ) : (
        <>
          {viewMode === 'list' ? (
            <section aria-label="Upcoming events">
              {displayedEvents.length > 0 ? (
                <EventDayGroups
                  events={displayedEvents}
                  onShare={handleShare}
                  onDelete={handleDelete}
                  onViewDetails={handleViewDetails}
                  extraCountMap={extraCountMap}
                />
              ) : (
                statusPanel(Frown, 'Nothing matches… yet',
                  'Try widening your filters, or be the first to list a gathering like this.',
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={handleClearFilters} className="rounded-full px-6">Clear filters</Button>
                    )}
                    <Button asChild className="rounded-full px-6">
                      <Link to="/submit-event"><Plus className="mr-1.5 h-4 w-4" /> List an event</Link>
                    </Button>
                  </div>)
              )}

              {hasMore && displayedEvents.length > 0 && (
                <div className="flex flex-col items-center gap-2 mt-12">
                  <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline" className="rounded-full h-12 px-8 font-semibold bg-card">
                    {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Show more events
                  </Button>
                  <span className="text-xs text-muted-foreground">Showing {displayedEvents.length} of {paginationSource.length}</span>
                </div>
              )}
            </section>
          ) : viewMode === 'calendar' ? (
            <div className="animate-in fade-in duration-500">
              <Suspense fallback={<ViewLoadingFallback />}>
                <AdvancedEventCalendar
                  events={filteredEvents}
                  onEventSelect={handleViewDetails}
                  selectedDay={selectedDay}
                  onDayClick={setSelectedDay}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                />
              </Suspense>
              <div className="mt-12">
                <div className="flex items-baseline gap-3 mb-5">
                  <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-foreground">{format(selectedDay, 'EEEE')}</h2>
                  <span className="text-sm text-muted-foreground">{format(selectedDay, 'd MMMM yyyy')}</span>
                  <span className="flex-1 h-px bg-border/70 translate-y-[-0.3rem]" />
                </div>
                {selectedDayEvents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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
                  <p className="py-12 text-center text-muted-foreground organic-card rounded-[var(--radius)]">No events on this day. Pick another date in the calendar.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-foreground">On the map</h2>
                <span className="text-sm text-muted-foreground">{filteredEvents.length} events</span>
                <span className="flex-1 h-px bg-border/70 translate-y-[-0.3rem]" />
              </div>
              <Suspense fallback={<ViewLoadingFallback />}>
                <LeafletMap events={filteredEvents} onViewDetails={handleViewDetails} />
              </Suspense>
            </div>
          )}
        </>
      )}

      {!loading && <HostCTA hasUser={!!user} />}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />
    </div>
  );
};

export default EventsListV2;
