import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { format, parseISO, isSameDay, isToday, addDays, startOfToday } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import EventCardV2 from '@/components/v2/EventCardV2';
import EventDetailDialog from '@/components/EventDetailDialog';
import { Event } from '@/types/event';
import { useLocation, useNavigate } from 'react-router-dom';
import EventsHero from '@/components/v2/EventsHero';
import FeaturedEvents from '@/components/v2/FeaturedEvents';
import EventsToolbar, { type FilterBadge } from '@/components/v2/EventsToolbar';
import EventDayGroups from '@/components/v2/EventDayGroups';
import HostCTA from '@/components/v2/HostCTA';
import { NoEventsEmptyState, NoSearchResultsEmptyState, NoCalendarEventsEmptyState } from '@/components/v2/EmptyState';
import DateWheel from '@/components/v2/DateWheel';
import StateChips from '@/components/v2/StateChips';
import { useSession } from '@/components/SessionContextProvider';
import { expandRecurringEvents, getAvailableVenues, getBaseEventId } from '@/utils/event-utils';
import { logSearch, logUiAction } from '@/lib/analytics';
import { useEventFilters } from '@/hooks/use-event-filters';
import { useDeleteEvent, useEvents, useFavouriteVenues, useToggleFavouriteVenue } from '@/hooks/use-events';
import SEO from '@/components/SEO';
import WeeklyPicksSignup from '@/components/WeeklyPicksSignup';

// Heavy, view-specific code is split out so it only loads when its view is opened.
const AdvancedEventCalendar = lazy(() => import('@/components/AdvancedEventCalendar'));
const LeafletMap = lazy(() => import('@/components/v2/LeafletMap'));

const ViewLoadingFallback = () => (
  <div className="py-16 flex justify-center" aria-busy="true" aria-label="Loading view">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const EVENTS_PER_LOAD = 8;

interface EventsListV2Props {
  initialState?: string;
  cityName?: string;
  cityDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  signupCity?: string;
  signupSource?: string;
}

const EventsListV2: React.FC<EventsListV2Props> = ({
  initialState,
  cityName,
  cityDescription,
  seoTitle,
  seoDescription,
  signupCity,
  signupSource,
}) => {
  const { user, defaultState } = useSession();
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'calendar' || v === 'map') return v as 'calendar' | 'map';
    return 'list';
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const eventsQuery = useEvents();
  const deleteEvent = useDeleteEvent();
  const toggleFavouriteVenue = useToggleFavouriteVenue(user?.id);
  const { data: favouriteVenues = [] } = useFavouriteVenues(user?.id);

  const allEvents = useMemo(() => expandRecurringEvents(eventsQuery.data ?? []), [eventsQuery.data]);
  const eventDates = useMemo(() => new Set(allEvents.map((e) => e.event_date)), [allEvents]);
  const availableVenues = useMemo(() => getAvailableVenues(eventsQuery.data ?? []), [eventsQuery.data]);

  const loading = eventsQuery.isLoading;

  // Debounce search input so filtering doesn't run on every keystroke.
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(rawSearchTerm), 300);
    return () => clearTimeout(timer);
  }, [rawSearchTerm]);

  // Learn what people are actually looking for.
  useEffect(() => {
    if (debouncedSearchTerm.trim().length >= 2) {
      void logSearch(debouncedSearchTerm, user?.id ?? null);
    }
  }, [debouncedSearchTerm, user?.id]);

  // Track which view people use (list / calendar / map).
  useEffect(() => {
    void logUiAction(`view_mode:${viewMode}`, user?.id ?? null);
  }, [viewMode, user?.id]);

  // Compact search in the sticky toolbar: only while the hero search box is
  // scrolled out of view (the hero owns the search UI at the top of the page).
  const heroRef = React.useRef<HTMLDivElement>(null);
  const [heroSearchVisible, setHeroSearchVisible] = useState(true);
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroSearchVisible(entry.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px' } // account for the sticky filter toolbar
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  const { filters, setFilters, filteredEvents, totalCount } = useEventFilters(allEvents, defaultState, debouncedSearchTerm, initialState);

  // Keep the view mode in the URL so /map can redirect here with ?view=map.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (viewMode === 'list') params.delete('view');
    else params.set('view', viewMode);
    const next = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    if (next !== `${location.pathname}${location.search}`) {
      navigate(next, { replace: true });
    }
  }, [viewMode]);

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

  const handleDelete = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseId = getBaseEventId(eventId);
    if (baseId.length < 30) return;
    setPendingDeleteId(baseId);
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteEvent.mutate(pendingDeleteId, {
      onSuccess: () => toast.success('Event moved to trash.'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete event.'),
    });
    setPendingDeleteId(null);
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const handleClearFilters = () => {
    setRawSearchTerm('');
    setFilters({ date: 'All Upcoming', category: [], venue: [], price: [], state: initialState ? [initialState] : [] });
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
  // The input shows rawSearchTerm so keystrokes appear immediately; only the
  // filtering hook uses the debounced value.
  const hasActiveFilters = rawSearchTerm !== '' || filters.date !== 'All Upcoming' || filters.category.length > 0 || filters.venue.length > 0 || filters.price.length > 0 || filters.state.some((state) => state !== initialState);

  const comingUp = useMemo(() => listSource.slice(0, 3), [listSource]);

  // Featured events: upcoming events with images, prioritising today's events
  const featuredEvents = useMemo(() => {
    const withImages = listSource.filter((e) => e.image_url);
    return withImages
      .sort((a, b) => {
        const aToday = isToday(parseISO(a.event_date));
        const bToday = isToday(parseISO(b.event_date));
        if (aToday && !bToday) return -1;
        if (!aToday && bToday) return 1;
        return a.event_date.localeCompare(b.event_date);
      })
      .slice(0, 3);
  }, [listSource]);

  const nextWeekCount = useMemo(() => {
    const today = startOfToday();
    const weekOut = addDays(today, 7);
    return listSource.filter((e) => {
      const d = parseISO(e.event_date);
      return d >= today && d < weekOut;
    }).length;
  }, [listSource]);

  const dateBadgeLabel = (() => {
    if (filters.date === 'All Upcoming') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
      try {
        return format(parseISO(filters.date), 'EEE d MMM');
      } catch { return filters.date; }
    }
    return filters.date;
  })();
  const filterBadges: FilterBadge[] = [
    ...(dateBadgeLabel ? [{ type: 'date' as const, label: dateBadgeLabel }] : []),
    ...filters.category.map((v) => ({ type: 'category' as const, value: v, label: v })),
    ...filters.venue.map((v) => ({ type: 'venue' as const, value: v, label: v })),
    ...filters.price.map((v) => ({ type: 'price' as const, value: v, label: v })),
    ...filters.state.map((v) => ({
      type: 'state' as const,
      value: v,
      label: v === defaultState && !initialState ? `${v} · your default` : v,
    })),
  ];

  const statusPanel = (Icon: React.ElementType, title: string, message: React.ReactNode, action: React.ReactNode) => (
    <div className="py-16 sm:py-24 px-6 organic-card rounded-[2rem] text-center">
      <Icon className="h-12 w-12 text-primary/30 mx-auto mb-6" />
      <h3 className="text-3xl font-heading font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">{message}</p>
      {action}
    </div>
  );

  // Scroll to a hash anchor (e.g. #weekly-picks) once content has loaded, so
  // shared trial links land on the signup box instead of the top of the page.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [loading]);

  return (
    <div className="w-full max-w-7xl px-3 sm:px-6">
      <SEO
        title={seoTitle || 'SoulFlow | Discover Soulful Events in Australia'}
        description={seoDescription || 'Connect with events that nourish your mind, body, and spirit across Australia. Find workshops, meditations, sound baths, and conscious gatherings.'}
      />

      <div ref={heroRef}>
        <EventsHero
          searchTerm={rawSearchTerm}
          onSearchTermChange={setRawSearchTerm}
          selectedCategories={filters.category}
          onToggleQuickFilter={toggleQuickFilter}
          showNextWeekCount={!loading && !eventsQuery.isError}
          nextWeekCount={nextWeekCount}
          comingUp={comingUp}
          onViewDetails={handleViewDetails}
          eyebrow={cityName ? `${cityName} · conscious events` : undefined}
          title={cityName ? (
            <>Conscious events in <span className="italic font-medium text-primary">{cityName}</span>.</>
          ) : undefined}
          description={cityDescription}
        />
      </div>

      <div className="mb-3 py-2 border-b border-border/40">
        <DateWheel
          value={filters.date === 'All Upcoming' ? 'all' : filters.date}
          onChange={(v) => setFilters({ ...filters, date: v === 'all' ? 'All Upcoming' : v })}
          eventDates={eventDates}
        />
        {/* Archived: location (state) chip filter. Re-enable by setting ARCHIVE_FILTERS=false. */}
        {false && (
          <div className="mt-2">
            <StateChips
              value={filters.state}
              onChange={(states) => setFilters({ ...filters, state: states })}
            />
          </div>
        )}
      </div>

      {/* Archived: secondary filter dropdowns (category, venue, price, state). Re-enable if needed. */}
      {false && (
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
        searchTerm={rawSearchTerm}
        onClearSearch={() => setRawSearchTerm('')}
        badges={filterBadges}
        onRemoveBadge={removeFilter}
        onClearFilters={handleClearFilters}
        shownCount={paginationSource.length}
        totalCount={totalCount}
        showCompactSearch={!heroSearchVisible}
        onSearchTermChange={setRawSearchTerm}
      />
      )}

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
                  onDelete={handleDelete}
                  onViewDetails={handleViewDetails}
                  extraCountMap={extraCountMap}
                />
              ) : hasActiveFilters && rawSearchTerm !== '' ? (
                <NoSearchResultsEmptyState />
              ) : (
                <NoEventsEmptyState />
              )}

              {displayedEvents.length > 0 && featuredEvents.length > 0 && (
                <div className="mt-14">
                  <FeaturedEvents events={featuredEvents} onViewDetails={handleViewDetails} />
                </div>
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
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                ) : (
                  <NoCalendarEventsEmptyState />
                )}
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground organic-card rounded-[var(--radius)]">
              No events to show on the map. Try clearing a filter or choosing another date.
            </p>
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

      {signupCity && (
        <WeeklyPicksSignup
          defaultCity={signupCity}
          source={signupSource}
          className="mt-16"
        />
      )}

      {!loading && <HostCTA hasUser={!!user} />}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent className="rounded-[1.75rem] w-[90vw] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-2xl">Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed from SoulFlow for everyone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-full mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive rounded-full">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventsListV2;
