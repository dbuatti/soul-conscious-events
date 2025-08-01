import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Search, Globe, Share2, List, CalendarDays, X, Image as ImageIcon, Edit, Trash2, ChevronDown, Lightbulb, Loader2, PlusCircle, Frown, Filter as FilterIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import EventCalendar from '@/components/EventCalendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSession } from '@/components/SessionContextProvider'; // Import useSession
import EventDetailDialog from '@/components/EventDetailDialog'; // Import the new dialog component
import { eventTypes, australianStates } from '@/lib/constants'; // Import from constants
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import FilterOverlay from '@/components/FilterOverlay'; // Import FilterOverlay

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string; // Added end_date
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
  user_id?: string; // Added user_id to interface
}

const EventsList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Upcoming');

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list'); // Default to list view
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());

  const { user, isLoading: isSessionLoading } = useSession(); // Get user from context
  const isAdmin = user?.email === 'daniele.buatti@gmail.com';

  // State for EventDetailDialog
  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // State for FilterOverlay
  const [isFilterOverlayOpen, setIsFilterOverlayOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      let query = supabase.from('events').select('*');

      const now = new Date();
      const todayFormatted = format(now, 'yyyy-MM-dd');

      switch (dateFilter) {
        case 'Today':
          query = query.eq('event_date', todayFormatted);
          break;
        case 'This Week':
          query = query
            .gte('event_date', format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
            .lte('event_date', format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
          break;
        case 'This Month':
          query = query
            .gte('event_date', format(startOfMonth(now), 'yyyy-MM-dd'))
            .lte('event_date', format(endOfMonth(now), 'yyyy-MM-dd'));
          break;
        case 'Past Events':
          query = query.lt('event_date', todayFormatted).order('event_date', { ascending: false });
          break;
        case 'All Events':
          break;
        case 'All Upcoming':
        default:
          query = query.gte('event_date', todayFormatted);
          break;
      }

      if (eventType !== 'All') {
        query = query.eq('event_type', eventType);
      }

      if (stateFilter !== 'All') {
        query = query.eq('state', stateFilter);
      }

      // Always filter for 'approved' events for public view
      query = query.eq('state', 'approved');

      if (searchTerm) {
        query = query.or(
          `event_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,organizer_contact.ilike.%${searchTerm}%,full_address.ilike.%${searchTerm}%,place_name.ilike.%${searchTerm}%`
        );
      }

      if (dateFilter !== 'Past Events') {
        query = query.order('event_date', { ascending: true });
      }

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
  }, [searchTerm, eventType, stateFilter, dateFilter]);

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleApplyFilters = (filters: {
    searchTerm: string;
    eventType: string;
    state: string;
    dateFilter: string;
  }) => {
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
      case 'search':
        setSearchTerm('');
        break;
      case 'eventType':
        setEventType('All');
        break;
      case 'state':
        setStateFilter('All');
        break;
      default:
        break;
    }
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    eventType !== 'All' ||
    stateFilter !== 'All' ||
    dateFilter !== 'All Upcoming';

  const handleShare = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    navigator.clipboard.writeText(eventUrl)
      .then(() => toast.success('Event link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link. Please try again.'));
  };

  const handleDelete = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      const { error } = await supabase.from('events').delete().eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event.');
      } else {
        toast.success('Event deleted successfully!');
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId)); // Optimistically update UI
      }
    }
  };

  const handleEdit = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    // Navigate to edit page
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  return (
    <div className="w-full bg-white p-4 rounded-xl shadow-lg border border-gray-200 dark:bg-card dark:border-border">
      {/* Hero Section */}
      <div className="text-center mb-12 px-4 py-8 sm:px-6 sm:py-12 bg-gradient-to-br from-primary to-blue-800 rounded-xl shadow-xl text-white">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
          Discover Your Next Soulful Experience
        </h1>
        <p className="text-lg sm:text-xl font-light mb-8 opacity-90">
          Connect with events that nourish your mind, body, and spirit across Australia.
        </p>
        <Link to="/submit-event">
          <Button className="bg-white text-primary hover:bg-gray-100 text-base sm:text-lg font-semibold py-2 px-6 sm:py-3 sm:px-8 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105">
            Add Your Event
          </Button>
        </Link>
      </div>

      {/* App Description Clause */}
      <div className="mb-8 p-4 sm:p-6 bg-secondary border border-border rounded-lg shadow-lg text-center flex items-center justify-center">
        <Lightbulb className="mr-3 h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-primary" />
        <p className="text-sm sm:text-base leading-relaxed text-foreground">
          SoulFlow is a prototype app designed to help you discover and connect with soul-nourishing events across Australia.
          As this is a new project from an aspiring app developer, some features may not work as expected.
          Your feedback is invaluable! Please visit the <Link to="/contact" className="text-primary hover:underline font-medium">Contact Us</Link> page to share your suggestions or report any issues.
        </p>
      </div>

      {/* Filter and View Options Section */}
      <div className="mb-8 rounded-xl shadow-lg border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Filter Button */}
          <Button
            onClick={() => setIsFilterOverlayOpen(true)}
            className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-2 px-4 rounded-md shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base"
          >
            <FilterIcon className="mr-2 h-4 w-4" /> Filter Events
          </Button>

          {/* View Mode Toggle */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label htmlFor="view-mode" className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-right">View Mode</label>
            <ToggleGroup id="view-mode" type="single" value={viewMode} onValueChange={(value: 'list' | 'calendar') => value && setViewMode(value)} className="w-full sm:w-auto justify-center sm:justify-end">
              <ToggleGroupItem value="list" aria-label="List View" className="h-8 w-8 sm:h-9 sm:w-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="calendar" aria-label="Calendar View" className="h-8 w-8 sm:h-9 sm:w-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <CalendarDays className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-1 sm:gap-2 items-center">
            <span className="text-xs sm:text-sm font-medium text-foreground">Active Filters:</span>
            {searchTerm !== '' && (
              <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">
                Search: "{searchTerm}"
                <Button variant="ghost" size="sm" className="h-3 w-3 p-0 text-foreground hover:bg-accent/80 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('search')}>
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            {eventType !== 'All' && (
              <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">
                Type: {eventType}
                <Button variant="ghost" size="sm" className="h-3 w-3 p-0 text-foreground hover:bg-accent/80 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('eventType')}>
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            {stateFilter !== 'All' && (
              <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">
                State: {stateFilter}
                <Button variant="ghost" size="sm" className="h-3 w-3 p-0 text-foreground hover:bg-accent/80 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('state')}>
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            {dateFilter !== 'All Upcoming' && (
              <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">
                Date: {dateFilter}
                <Button variant="ghost" size="sm" className="h-3 w-3 p-0 text-foreground hover:bg-accent/80 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('dateFilter')}>
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearAllFilters} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base mt-2 sm:mt-0">
                Clear All Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Event Count Display */}
      <div className="text-center text-foreground mb-4 text-sm sm:text-base">
        {loading || isSessionLoading ? (
          <p className="text-lg font-semibold text-primary flex items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading events...
          </p>
        ) : events.length === 0 ? (
          <div className="p-8 bg-secondary rounded-lg border border-border text-center">
            <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-4">
              No events found matching your criteria.
            </p>
            {hasActiveFilters ? (
              <Button onClick={handleClearAllFilters} className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                Clear Filters to See More Events
              </Button>
            ) : (
              <Link to="/submit-event">
                <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                  <PlusCircle className="mr-2 h-4 w-4" /> Be the First to Add an Event!
                </Button>
              </Link>
            )}
          </div>
        ) : (
          `Showing ${events.length} event${events.length === 1 ? '' : 's'}.`
        )}
      </div>

      {loading || isSessionLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="flex flex-col justify-between shadow-lg rounded-lg dark:bg-card dark:border-border">
              <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-muted animate-pulse"></div>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="flex justify-end">
                <Skeleton className="h-8 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            events.length === 0 ? null : ( // This null will be replaced by the improved message above
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((event) => {
                  const googleMapsLink = event.full_address
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.full_address)}`
                    : '#';
                  const isCreatorOrAdmin = user?.id === event.user_id || isAdmin;

                  const formattedDate = event.event_date
                    ? format(new Date(event.event_date), 'PPP')
                    : 'Date TBD';
                  const formattedEndDate = event.end_date
                    ? format(new Date(event.end_date), 'PPP')
                    : '';

                  const dateDisplay =
                    event.end_date && event.event_date !== event.end_date
                      ? `${formattedDate} - ${formattedEndDate}`
                      : formattedDate;

                  return (
                    <Card
                      key={event.id}
                      className="group flex flex-col justify-between shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden dark:bg-card dark:border-border"
                      onClick={() => handleViewDetails(event)}
                    >
                      {event.image_url && (
                        <div className="relative w-full aspect-video overflow-hidden">
                          <img
                            src={event.image_url}
                            alt={`Image for ${event.event_name}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy" // Lazy load image
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        </div>
                      )}
                      <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
                        <CardTitle className="text-xl sm:text-2xl font-bold text-primary mb-1 sm:mb-2">{event.event_name}</CardTitle>
                        <CardDescription className="flex items-center text-muted-foreground text-sm sm:text-base">
                          <Calendar className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
                          {dateDisplay}
                          {event.event_time && (
                            <>
                              <Clock className="ml-2 sm:ml-4 mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
                              {event.event_time}
                            </>
                          )}
                        </CardDescription>
                        {(event.place_name || event.full_address) && (
                          <div className="flex flex-col items-start text-muted-foreground mt-1 sm:mt-2">
                            {event.place_name && (
                              <div className="flex items-center mb-0.5 sm:mb-1">
                                <MapPin className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
                                <Badge variant="secondary" className="bg-accent text-accent-foreground text-sm sm:text-base py-0.5 px-1 sm:py-1 sm:px-2 font-semibold">
                                  {event.place_name}
                                </Badge>
                              </div>
                            )}
                            {event.full_address && (
                              <div className="flex items-center">
                                {!event.place_name && <MapPin className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />}
                                <a
                                  href={googleMapsLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-sm sm:text-base"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {event.full_address}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2 space-y-1 sm:space-y-2">
                        {event.description && (
                          <div>
                            <p className="text-foreground leading-relaxed text-sm sm:text-base line-clamp-3">
                              {event.description}
                            </p>
                            {event.description.length > 150 && ( // Only show if description is long
                              <Button variant="link" onClick={(e) => { e.stopPropagation(); toggleDescription(event.id); }} className="p-0 h-auto text-primary transition-all duration-300 ease-in-out transform hover:scale-105 text-xs sm:text-sm">
                                {expandedDescriptions[event.id] ? 'Read Less' : 'Read More'}
                              </Button>
                            )}
                          </div>
                        )}
                        {event.price && (
                          <p className="flex items-center text-foreground text-sm sm:text-base">
                            <DollarSign className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
                            <span className="font-medium">Price:</span> {event.price}
                            {event.price.toLowerCase() === 'free' && (
                              <Badge variant="secondary" className="ml-1 sm:ml-2 bg-accent text-accent-foreground text-xs sm:text-sm">Free</Badge>
                            )}
                          </p>
                        )}
                        {event.ticket_link && (
                          <div className="flex items-center">
                            <LinkIcon className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
                            <Button asChild variant="link" className="p-0 h-auto text-primary text-sm sm:text-base transition-all duration-300 ease-in-out transform hover:scale-105">
                              <a href={event.ticket_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                Ticket/Booking Link
                              </a>
                            </Button>
                          </div>
                        )}
                        {event.special_notes && (
                          <p className="flex items-start text-foreground text-sm sm:text-base">
                            <Info className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 mt-0.5 sm:mt-1 text-primary" />
                            <span className="font-medium">Special Notes:</span> {event.special_notes}
                          </p>
                        )}
                        {event.organizer_contact && (
                          <p className="flex items-center text-foreground text-sm sm:text-base">
                            <User className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
                            <span className="font-medium">Organizer:</span> {event.organizer_contact}
                          </p>
                        )}
                        {event.event_type && (
                          <p className="flex items-center text-foreground text-sm sm:text-base">
                            <Tag className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
                            <span className="font-medium">Type:</span> {event.event_type}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="flex flex-col items-start pt-2 sm:pt-4">
                        <div className="flex justify-end w-full space-x-1 sm:space-x-2">
                          <Button variant="outline" size="icon" onClick={(e) => handleShare(event, e)} title="Share Event" className="h-7 w-7 sm:h-9 sm:w-9 transition-all duration-300 ease-in-out transform hover:scale-105">
                            <Share2 className="h-3.5 w-3.5 sm:h-4 w-4" />
                          </Button>
                          {isCreatorOrAdmin && (
                            <>
                              <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="icon" title="Edit Event" className="h-7 w-7 sm:h-9 sm:w-9 transition-all duration-300 ease-in-out transform hover:scale-105">
                                  <Edit className="h-3.5 w-3.5 sm:h-4 w-4" />
                                </Button>
                              </Link>
                              <Button variant="destructive" size="icon" onClick={(e) => handleDelete(event.id, e)} title="Delete Event" className="h-7 w-7 sm:h-9 sm:w-9 transition-all duration-300 ease-in-out transform hover:scale-105">
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )
          ) : (
            <EventCalendar
              events={events}
              selectedDate={selectedCalendarDate}
              onDateSelect={setSelectedCalendarDate}
              onEventSelect={handleViewDetails}
            />
          )}
        </>
      )}

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        isOpen={isEventDetailDialogOpen}
        onClose={() => setIsEventDetailDialogOpen(false)}
        cameFromCalendar={true}
      />

      {/* Filter Overlay */}
      <FilterOverlay
        isOpen={isFilterOverlayOpen}
        onClose={() => setIsFilterOverlayOpen(false)}
        currentFilters={{ searchTerm, eventType, state: stateFilter, dateFilter }}
        onApplyFilters={handleApplyFilters}
        onClearAllFilters={handleClearAllFilters}
      />
    </div>
  );
};

export default EventsList;