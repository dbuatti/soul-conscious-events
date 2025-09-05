import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isSameDay, isSameMonth } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Globe, Share2, List, CalendarDays, X, Edit, Trash2, Lightbulb, Loader2, PlusCircle, Frown, Filter as FilterIcon, Map } from 'lucide-react'; // Added Map icon
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
import heroBackground from '@/assets/phil-hero-background.jpeg'; // Corrected import for the image
import EventFilterBar from '@/components/EventFilterBar'; // Import the EventFilterBar component
import EventCardList from '@/components/EventCardList'; // Import EventCardList

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
  approval_status?: string; // Added approval_status to Event interface
}

const EventsList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Upcoming');

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const { user, isLoading: isSessionLoading } = useSession();
  const isAdmin = user?.email === 'daniele.buatti@gmail.com';
  const location = useLocation();

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      let query = supabase.from('events').select('*');
      query = query.eq('approval_status', 'approved');
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
    now.setHours(0, 0, 0, 0); // Set to the beginning of today for accurate comparison

    switch (dateFilter) {
      case 'Today':
        filtered = filtered.filter(event => format(parseISO(event.event_date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'));
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
        filtered = filtered.filter(event => parseISO(event.event_date) < now);
        break;
      case 'All Upcoming':
        filtered = filtered.filter(event => parseISO(event.event_date) >= now);
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

  return (
    <div className="w-full max-w-screen-lg">
      <div 
        className="relative text-center mb-12 px-4 py-8 sm:px-6 sm:py-12 rounded-xl shadow-xl text-white overflow-hidden bg-center bg-cover" // Added bg-center bg-cover
        style={{ backgroundImage: `url(${heroBackground})` }} // Set background image
      >
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

      {/* Integrated EventFilterBar */}
      <EventFilterBar
        searchTerm={searchTerm}
        eventType={eventType}
        stateFilter={stateFilter}
        dateFilter={dateFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onApplyFilters={handleApplyFilters}
        onClearAllFilters={handleClearAllFilters}
      />

      {(loading || isSessionLoading) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-lg rounded-lg"><CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <EventCardList
              events={filteredEventsForList}
              onShare={handleShare}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearAllFilters}
            />
          ) : viewMode === 'calendar' ? (
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
                <h3 className="text-2xl font-bold text-foreground mb-4 border-b pb-2 border-border">Events for {format(selectedDay, 'MMMM d, yyyy')}</h3> {/* Styled heading */}
                {selectedDayEvents.length > 0 ? (
                  <EventCardList
                    events={selectedDayEvents}
                    onShare={handleShare}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                  />
                ) : (
                  <div className="text-center py-8 px-4 bg-secondary rounded-lg">
                    <p className="text-muted-foreground">No events scheduled for this day.</p>
                  </div>
                )}
              </div>
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-foreground mb-4 border-b pb-2 border-border">More events in {format(currentMonth, 'MMMM')}</h3> {/* Styled heading */}
                {currentMonthEvents.length > 0 ? (
                  <EventCardList
                    events={currentMonthEvents}
                    onShare={handleShare}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                  />
                ) : (
                  <div className="text-center py-8 px-4 bg-secondary rounded-lg">
                    <p className="text-muted-foreground">No upcoming events found for this month.</p>
                  </div>
                )}
              </div>
            </div>
          ) : ( // This block is for 'map' view
            <div className="p-8 bg-secondary rounded-lg border border-border text-center">
              <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-4">Map view temporarily disabled.</p>
              <p className="text-muted-foreground">This feature requires paid credits, which have been exhausted.</p>
            </div>
          )}
        </>
      )}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} cameFromCalendar={viewMode === 'calendar'} />
    </div>
  );
};

export default EventsList;