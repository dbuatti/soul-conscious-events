import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO, isToday, isSameDay, isWeekend, addDays, startOfToday, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, Loader2, Plus, Search, X, Database, ArrowRight, Link2, Wand2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import EventCardV2 from '@/components/v2/EventCardV2';
import EventDetailDialog from '@/components/EventDetailDialog';
import { Event } from '@/types/event';
import FilterDropdownsV2 from '@/components/v2/FilterDropdownsV2';
import { useSession } from '@/components/SessionContextProvider';
import AdvancedEventCalendar from '@/components/AdvancedEventCalendar';
import { expandRecurringEvents, getAvailableVenues, getBaseEventId } from '@/utils/event-utils';
import { useEventFilters } from '@/hooks/use-event-filters';
import { useDeleteEvent, useEvents, useFavouriteVenues, useToggleFavouriteVenue } from '@/hooks/use-events';
import { cn } from '@/lib/utils';
import LeafletMap from '@/components/v2/LeafletMap';
import SEO from '@/components/SEO';

const EVENTS_PER_LOAD = 8;

const QUICK_FILTERS = [
  { label: 'Music', value: 'Music' },
  { label: 'Meditation', value: 'Meditation' },
  { label: 'Sound Bath', value: 'Sound Bath' },
  { label: 'Workshops', value: 'Workshop' },
  { label: 'Community', value: 'Community Gathering' },
];

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

  // Group the visible list into time buckets so the page reads like a "what's on" guide.
  const dayGroups = useMemo(() => {
    const today = startOfToday();
    const tomorrow = addDays(today, 1);
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const nextWeekEnd = addDays(thisWeekEnd, 7);

    const bucketFor = (date: Date): { key: string; label: string; sublabel?: string } => {
      if (isSameDay(date, today)) return { key: 'today', label: 'Today', sublabel: format(date, 'EEEE d MMMM') };
      if (isSameDay(date, tomorrow)) return { key: 'tomorrow', label: 'Tomorrow', sublabel: format(date, 'EEEE d MMMM') };
      if (date <= thisWeekEnd) {
        return isWeekend(date)
          ? { key: 'weekend', label: 'This weekend' }
          : { key: 'week', label: 'Later this week' };
      }
      if (date <= nextWeekEnd) return { key: 'next-week', label: 'Next week' };
      const sameMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      return sameMonth
        ? { key: 'month', label: `Later in ${format(date, 'MMMM')}` }
        : { key: format(date, 'yyyy-MM'), label: format(date, 'MMMM'), sublabel: date.getFullYear() !== today.getFullYear() ? format(date, 'yyyy') : undefined };
    };

    const groups: { key: string; label: string; sublabel?: string; events: Event[] }[] = [];
    for (const event of displayedEvents) {
      const bucket = bucketFor(parseISO(event.event_date));
      const last = groups[groups.length - 1];
      if (last && last.key === bucket.key) last.events.push(event);
      else groups.push({ ...bucket, events: [event] });
    }
    return groups;
  }, [displayedEvents]);

  const comingUp = useMemo(() => listSource.slice(0, 3), [listSource]);

  const nextWeekCount = useMemo(() => {
    const today = startOfToday();
    const weekOut = addDays(today, 7);
    return listSource.filter((e) => {
      const d = parseISO(e.event_date);
      return d >= today && d < weekOut;
    }).length;
  }, [listSource]);

  const filterBadges: { type: keyof typeof filters; value?: string; label: string }[] = [
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

      {/* Hero */}
      <section className="hero-glow relative overflow-hidden rounded-[2rem] px-5 py-10 sm:px-12 sm:py-14 mb-6 animate-in fade-in duration-700 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-12 lg:items-center">
        <div>
        <div className="max-w-3xl">
          <p className="eyebrow mb-4">Conscious events across Australia</p>
          <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl xl:text-[4.25rem] font-heading font-semibold text-foreground">
            Find your people.
            <br />
            <span className="italic font-medium text-primary">Soulful gatherings</span> near you.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            Sound baths, breathwork, ecstatic dance, kirtan, circles and workshops, gathered in one calm place.
          </p>
        </div>

        <div className="mt-8 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search events, venues or suburbs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search events"
              className="h-14 pl-14 pr-12 rounded-full border-border/80 bg-card text-base shadow-[0_10px_30px_-12px_hsl(20_40%_25%/0.25)] focus-visible:ring-primary"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {QUICK_FILTERS.map((qf) => {
              const active = filters.category.includes(qf.value);
              return (
                <button
                  key={qf.value}
                  type="button"
                  onClick={() => toggleQuickFilter(qf.value)}
                  aria-pressed={active}
                  className={cn(
                    "whitespace-nowrap px-4 h-9 rounded-full text-sm font-medium transition-all border",
                    active
                      ? "bg-foreground border-foreground text-background"
                      : "bg-card/70 border-border/80 text-foreground/80 hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {qf.label}
                </button>
              );
            })}
          </div>
        </div>

        {!loading && !eventsQuery.isError && (
          <p className="mt-8 text-sm text-muted-foreground">
            <span className="font-heading text-2xl font-semibold text-foreground mr-1.5">{nextWeekCount}</span>
            gatherings in the next 7 days
          </p>
        )}
        </div>

        {comingUp.length > 0 && (
          <aside className="hidden lg:block" aria-label="Coming up">
            <p className="eyebrow mb-3">Coming up</p>
            <ul className="space-y-3">
              {comingUp.map((event) => {
                const date = parseISO(event.event_date);
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => handleViewDetails(event)}
                      className="group w-full flex items-center gap-3 rounded-2xl bg-card/80 backdrop-blur border border-border/60 p-2.5 pr-4 text-left shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                        {event.image_url && <img src={event.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-primary">
                          {isToday(date) ? 'Today' : format(date, 'EEE d MMM')}{event.event_time ? ` · ${event.event_time.split(/\s*[–-]\s*/)[0]}` : ''}
                        </span>
                        <span className="block font-heading text-lg font-semibold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {event.event_name}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </section>

      {/* Toolbar */}
      <div className="sticky top-16 z-30 -mx-2 sm:-mx-4 px-2 sm:px-4 py-3 mb-6 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <FilterDropdownsV2
          currentFilters={filters}
          onFilterChange={setFilters}
          availableVenues={availableVenues}
          favouriteVenues={favouriteVenues}
          onToggleFavouriteVenue={handleToggleFavouriteVenue}
          isUserLoggedIn={!!user}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode)}
        />

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-3 animate-in fade-in">
            {searchTerm && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary pl-3 pr-1.5 py-1 text-xs font-medium">
                “{searchTerm}”
                <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear search" className="rounded-full p-0.5 hover:bg-primary/15"><X className="h-3.5 w-3.5" /></button>
              </span>
            )}
            {filterBadges.map((b) => (
              <span key={`${b.type}-${b.label}`} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary pl-3 pr-1.5 py-1 text-xs font-medium">
                {b.label}
                <button type="button" onClick={() => removeFilter(b.type, b.value)} aria-label={`Remove ${b.label} filter`} className="rounded-full p-0.5 hover:bg-primary/15"><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
            <button type="button" onClick={handleClearFilters} className="text-xs font-medium text-muted-foreground hover:text-primary underline-offset-4 hover:underline ml-1">
              Clear all
            </button>
            <span className="ml-auto text-xs text-muted-foreground">
              {paginationSource.length} of {totalCount}
            </span>
          </div>
        )}
      </div>

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
                <div className="space-y-10 sm:space-y-14">
                  {dayGroups.map((group) => (
                    <div key={group.key}>
                      <div className="flex items-baseline gap-3 mb-4 sm:mb-5">
                        <h2 className={cn(
                          "text-3xl sm:text-4xl font-heading font-semibold",
                          group.label === 'Today' ? "text-primary" : "text-foreground"
                        )}>
                          {group.label}
                        </h2>
                        {group.sublabel && <span className="text-sm text-muted-foreground">{group.sublabel}</span>}
                        <span className="flex-1 h-px bg-border/70 translate-y-[-0.3rem]" />
                        <span className="text-xs text-muted-foreground">{group.events.length} {group.events.length === 1 ? 'event' : 'events'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {group.events.map((event) => (
                          <EventCardV2
                            key={event.id}
                            event={event}
                            onShare={handleShare}
                            onDelete={handleDelete}
                            onViewDetails={handleViewDetails}
                            isFeaturedToday={isToday(parseISO(event.event_date))}
                            additionalDatesCount={extraCountMap[getBaseEventId(event.id)] || 0}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
              <AdvancedEventCalendar
                events={filteredEvents}
                onEventSelect={handleViewDetails}
                selectedDay={selectedDay}
                onDayClick={setSelectedDay}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
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
              <LeafletMap events={filteredEvents} onViewDetails={handleViewDetails} />
            </div>
          )}
        </>
      )}

      {/* Host call to action */}
      {!loading && (
        <section className="night-band mt-20 rounded-[2rem] overflow-hidden px-6 py-12 sm:px-12 sm:py-16 grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent mb-4">For hosts &amp; facilitators</p>
            <h2 className="text-4xl sm:text-5xl font-heading font-semibold leading-[1.05] text-ink-foreground">
              Hosting a gathering?
              <br />
              <span className="italic font-medium text-accent">List it in under a minute.</span>
            </h2>
            <p className="mt-5 text-ink-foreground/70 max-w-md leading-relaxed">
              Paste your Humanitix, Eventbrite or Megatix link, or just your flyer text. Our assistant fills in the details for you. Free, always.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="rounded-full h-12 px-7 font-semibold bg-primary hover:bg-primary/90">
                <Link to="/submit-event">List your event <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              {!user && (
                <Button asChild size="lg" variant="ghost" className="rounded-full h-12 px-7 font-semibold text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
                  <Link to="/login">Create a free account</Link>
                </Button>
              )}
            </div>
          </div>

          <ol className="space-y-3">
            {[
              { icon: Link2, title: 'Paste a link or flyer', body: 'Ticketing page, Instagram caption or email. Anything works.' },
              { icon: Wand2, title: 'We fill in the details', body: 'Date, time, venue, price and a cover image, ready to review.' },
              { icon: Send, title: 'Publish & share', body: 'Your event appears in the guide and on the map straight away.' },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-4 items-start rounded-2xl bg-ink-foreground/[0.06] border border-ink-foreground/10 p-4 sm:p-5">
                <span className="h-10 w-10 shrink-0 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                  <step.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-ink-foreground"><span className="text-ink-foreground/40 mr-1.5">{i + 1}.</span>{step.title}</p>
                  <p className="text-sm text-ink-foreground/60 mt-0.5">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />
    </div>
  );
};

export default EventsListV2;
