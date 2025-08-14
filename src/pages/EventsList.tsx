import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isSameDay, isSameMonth } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Globe, Share2, List, CalendarDays, X, Edit, Trash2, Lightbulb, Loader2, PlusCircle, Frown, Filter as FilterIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSession } from '@/components/SessionContextProvider';
import EventDetailDialog from '@/components/EventDetailDialog';
import { eventTypes, australianStates } from '@/lib/constants';
import FilterOverlay from '@/components/FilterOverlay';
import { useLocation } from 'react-router-dom';
import AdvancedEventCalendar from '@/components/AdvancedEventCalendar';
import heroBackground from '@/assets/phil-hero-background.jpeg'; // Corrected import to .jpeg

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string;
  event_time?: string;
  location?: string;
  place_name?: string;
  full_address?: string;
  description?: string;
  ticket_link?: string;
  price?: string;
  special_notes?: string;
  organizer_contact?: string;
  event_type?: string;
  state?: string;
  image_url?: string;
  user_id?: string;
  is_deleted?: boolean;
}

const EventsList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Upcoming');

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const { user, isLoading: isSessionLoading } = useSession();
  const isAdmin = user?.email === 'daniele.buatti@gmail.com';
  const location = useLocation();

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [isFilterOverlayOpen, setIsFilterOverlayOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      let query = supabase.from('events').select('*');
      query = query.eq('state', 'approved');
      query = query.order('event_date', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events.');
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const getFilteredEventsForList = () => {
    let filtered = events;

    const now = new Date();
    const todayFormatted = format(now, 'yyyy-MM-dd');

    switch (dateFilter) {
      case 'Today':
        filtered = filtered.filter(event => format(parseISO(event.event_date), 'yyyy-MM-dd') === todayFormatted);
        break;
      case 'This Week':
        const startW = startOfWeek(now, { weekStartsOn: 1 });
        const endW = endOfWeek(now, { weekStartsOn: 1 });
        filtered = filtered.filter(event => {
          const eventDate = parseISO(event.event_date);
          return eventDate >= startW && eventDate <= endW;
        });
        break;
      case 'This Month':
        const startM = startOfMonth(now);
        const endM = endOfMonth(now);
        filtered = filtered.filter(event => {
          const eventDate = parseISO(event.event_date);
          return eventDate >= startM && eventDate <= endM;
        });
        break;
      case 'Past Events':
        filtered = filtered.filter(event => format(parseISO(event.event_date), 'yyyy-MM-dd') < todayFormatted);
        break;
      case 'All Upcoming':
        filtered = filtered.filter(event => format(parseISO(event.event_date), 'yyyy-MM-dd') >= todayFormatted);
        break;
      case 'All Events':
      default:
        break;
    }

    if (eventType !== 'All') {
      filtered = filtered.filter(event => event.event_type === eventType);
    }

    if (stateFilter !== 'All') {
      filtered = filtered.filter(event => event.state === stateFilter);
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.event_name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (event.description?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (event.organizer_contact?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (event.full_address?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (event.place_name?.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }
    return filtered;
  };

  const filteredEventsForList = getFilteredEventsForList();

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to the beginning of today for accurate comparison

  const selectedDayEvents = events.filter(event => isSameDay(parseISO(event.event_date), selectedDay));

  const currentMonthEvents = events.filter(event => {
    const eventStartDate = parseISO(event.event_date);
    // Use end_date for multi-day events, otherwise use event_date
    const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
    
    // Show event if it's in the current month AND it hasn't ended yet
    return isSameMonth(eventStartDate, currentMonth) && eventEndDate >= now;
  });

  const handleApplyFilters = (filters: { searchTerm: string; eventType: string; state: string; dateFilter: string; }) => {
    setSearchTerm(filters.searchTerm);
    setEventType(filters.eventType);
    setStateFilter(filters.state);
    setDateFilter(filters.dateFilter);
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setEventType('All');
    setStateFilter('All');
    setDateFilter('All Upcoming');
  };

  const removeFilter = (filterType: 'search' | 'eventType' | 'state' | 'dateFilter') => {
    switch (filterType) {
      case 'search': setSearchTerm(''); break;
      case 'eventType': setEventType('All'); break;
      case 'state': setStateFilter('All'); break;
    }
  };

  const hasActiveFilters = searchTerm !== '' || eventType !== 'All' || stateFilter !== 'All' || dateFilter !== 'All Upcoming';

  const handleShare = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const eventUrl = `${window.location.origin}/events/${event.id}`;
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

  const renderEventCard = (event: Event) => {
    const isCreatorOrAdmin = user?.id === event.user_id || isAdmin;
    const dateDisplay = event.end_date && event.event_date !== event.end_date ? `${format(parseISO(event.event_date), 'PPP')} - ${format(parseISO(event.end_date), 'PPP')}` : format(parseISO(event.event_date), 'PPP');

    return (
      <Card key={event.id} className="group flex flex-col justify-between shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden" onClick={() => handleViewDetails(event)}>
        {event.image_url && <div className="relative w-full aspect-video overflow-hidden"><img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" /><div className="absolute inset-0 bg-black/30"></div></div>}
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2"><CardTitle className="text-xl sm:text-2xl font-bold text-primary mb-1 sm:mb-2">{event.event_name}</CardTitle><CardDescription className="flex items-center text-muted-foreground text-sm sm:text-base"><Calendar className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />{dateDisplay}{event.event_time && <><Clock className="ml-2 sm:ml-4 mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />{event.event_time}</>}</CardDescription></CardHeader>
        <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2 space-y-1 sm:space-y-2">
          {event.description && <p className="text-foreground leading-relaxed text-sm sm:text-base line-clamp-3">{event.description}</p>}
        </CardContent>
        <CardFooter className="flex flex-col items-start pt-2 sm:pt-4">
          <div className="flex justify-end w-full space-x-1 sm:space-x-2">
            <Button variant="outline" size="icon" onClick={(e) => handleShare(event, e)} title="Share Event" className="h-7 w-7 sm:h-9 sm:w-9"><Share2 className="h-3.5 w-3.5 sm:h-4 w-4" /></Button>
            {isCreatorOrAdmin && (
              <>
                <Link to={`/edit-event/${event.id}`} state={{ from: location.pathname }} onClick={(e) => e.stopPropagation()}><Button variant="outline" size="icon" title="Edit Event" className="h-7 w-7 sm:h-9 sm:w-9"><Edit className="h-3.5 w-3.5 sm:h-4 w-4" /></Button></Link>
                <Button variant="destructive" size="icon" onClick={(e) => handleDelete(event.id, e)} title="Delete Event" className="h-7 w-7 sm:h-9 sm:w-9"><Trash2 className="h-3.5 w-3.5 sm:h-4 w-4" /></Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-screen-lg">
      <div 
        className="relative text-center mb-12 px-4 py-8 sm:px-6 sm:py-12 rounded-xl shadow-xl text-white overflow-hidden"
      >
        {/* Image element for background */}
        <img 
          src={heroBackground} 
          alt="Hero Background" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">Discover Your Next Soulful Experience</h1>
          <p className="text-lg sm:text-xl font-light mb-8 opacity-90">Connect with events that nourish your mind, body, and spirit across Australia.</p>
          <Link to="/submit-event">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-base sm:text-lg font-semibold py-2 px-6 sm:py-3 sm:px-8 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105">
              Add Your Event
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 p-4 sm:p-6 bg-secondary border border-border rounded-lg shadow-lg text-center flex items-center justify-center">
        <Lightbulb className="mr-3 h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-primary" />
        <p className="text-sm sm:text-base leading-relaxed text-foreground">
          SoulFlow is a prototype app. Your feedback is invaluable! Please visit the <Link to="/contact" className="text-primary hover:underline font-medium">Contact Us</Link> page to share your suggestions.
        </p>
      </div>

      <div className="mb-8 rounded-xl shadow-lg border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Button onClick={() => setIsFilterOverlayOpen(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-2 px-4 rounded-md shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base">
            <FilterIcon className="mr-2 h-4 w-4" /> Filter Events
          </Button>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label htmlFor="view-mode" className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-right">View Mode</label>
            <ToggleGroup id="view-mode" type="single" value={viewMode} onValueChange={(value: 'list' | 'calendar') => value && setViewMode(value)} className="w-full sm:w-auto justify-center sm:justify-end">
              <ToggleGroupItem value="calendar" aria-label="Calendar View" className="h-8 w-8 sm:h-9 sm:w-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><CalendarDays className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List View" className="h-8 w-8 sm:h-9 sm:w-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><List className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {hasActiveFilters && viewMode === 'list' && (
          <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-1 sm:gap-2 items-center">
            <span className="text-xs sm:text-sm font-medium text-foreground">Active Filters:</span>
            {searchTerm && <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">Search: "{searchTerm}"<Button variant="ghost" size="sm" className="h-3 w-3 p-0" onClick={() => removeFilter('search')}><X className="h-2.5 w-2.5" /></Button></Badge>}
            {eventType !== 'All' && <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">Type: {eventType}<Button variant="ghost" size="sm" className="h-3 w-3 p-0" onClick={() => removeFilter('eventType')}><X className="h-2.5 w-2.5" /></Button></Badge>}
            {stateFilter !== 'All' && <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">State: {stateFilter}<Button variant="ghost" size="sm" className="h-3 w-3 p-0" onClick={() => removeFilter('state')}><X className="h-2.5 w-2.5" /></Button></Badge>}
            {dateFilter !== 'All Upcoming' && <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">Date: {dateFilter}<Button variant="ghost" size="sm" className="h-3 w-3 p-0" onClick={() => removeFilter('dateFilter')}><X className="h-2.5 w-2.5" /></Button></Badge>}
            {hasActiveFilters && <Button variant="outline" onClick={handleClearAllFilters} className="w-full sm:w-auto transition-all text-sm sm:text-base mt-2 sm:mt-0">Clear All</Button>}
          </div>
        )}
      </div>

      {(loading || isSessionLoading) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-lg rounded-lg"><CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            filteredEventsForList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredEventsForList.map(renderEventCard)}
              </div>
            ) : (
              <div className="p-8 bg-secondary rounded-lg border border-border text-center">
                <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground mb-4">No events found matching your criteria.</p>
                {hasActiveFilters ? <Button onClick={handleClearAllFilters} className="bg-primary hover:bg-primary/80 text-primary-foreground">Clear Filters</Button> :
                  <Link to="/submit-event"><Button className="bg-primary hover:bg-primary/80 text-primary-foreground"><PlusCircle className="mr-2 h-4 w-4" /> Add an Event</Button></Link>}
              </div>
            )
          ) : (
            <div>
              <AdvancedEventCalendar
                events={events}
                onEventSelect={handleViewDetails}
                selectedDay={selectedDay}
                onDayClick={setSelectedDay}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
              <div className="mt-8">
                <h3 className="text-2xl font-bold text-foreground mb-4">Events for {format(selectedDay, 'MMMM d, yyyy')}</h3>
                {selectedDayEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedDayEvents.map(renderEventCard)}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 bg-secondary rounded-lg">
                    <p className="text-muted-foreground">No events scheduled for this day.</p>
                  </div>
                )}
              </div>
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-foreground mb-4">More events in {format(currentMonth, 'MMMM')}</h3>
                {currentMonthEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentMonthEvents.map(renderEventCard)}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 bg-secondary rounded-lg">
                    <p className="text-muted-foreground">No upcoming events found for this month.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} cameFromCalendar={viewMode === 'calendar'} />
      <FilterOverlay isOpen={isFilterOverlayOpen} onClose={() => setIsFilterOverlayOpen(false)} currentFilters={{ searchTerm, eventType, state: stateFilter, dateFilter }} onApplyFilters={handleApplyFilters} onClearAllFilters={handleClearAllFilters} />
    </div>
  );
};

export default EventsList;