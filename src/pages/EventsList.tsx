import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isSameDay, isSameMonth } from 'date-fns';
import { Lightbulb, Loader2, MapPin, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import EventDetailDialog from '@/components/EventDetailDialog';
import { useLocation } from 'react-router-dom';
import MapPage from './MapPage';
import { Event } from '@/types/event';
import EventFilterBar from '@/components/EventFilterBar';
import EventCardList from '@/components/EventCardList';
import EventCalendarView from '@/components/EventCalendarView';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const heroBackground = '/phil-hero-background.jpeg';

const EventsList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('All');
  const [geographicalStateFilter, setGeographicalStateFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Upcoming');

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const { user, isLoading: isSessionLoading } = useSession();
  const location = useLocation();

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(true);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

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
        console.log('EventsList: Fetched events data:', data); // Log fetched data
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const getFilteredEventsForList = () => {
    let filtered = events;

    console.log('EventsList: Filtering process started.');
    console.log('EventsList: Current events count (before filter):', events.length);
    console.log('EventsList: Current geographicalStateFilter:', geographicalStateFilter);

    switch (dateFilter) {
      case 'Today':
        filtered = filtered.filter(event => isSameDay(parseISO(event.event_date), now));
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
      case 'All Events': // Corrected from 'All Events':
      default:
        break;
    }

    if (eventType !== 'All') {
      filtered = filtered.filter(event => event.event_type === eventType);
    }

    if (geographicalStateFilter !== 'All') {
      console.log(`EventsList: Applying geographical state filter: "${geographicalStateFilter}"`);
      filtered = filtered.filter(event => {
        const eventState = event.geographical_state;
        const matches = eventState === geographicalStateFilter;
        console.log(`  Event ID: ${event.id}, Event State: "${eventState}", Filter: "${geographicalStateFilter}", Matches: ${matches}`);
        return matches;
      });
      console.log('EventsList: Filtered events by geographical state (count):', filtered.length);
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
    console.log('EventsList: Final filtered events count:', filtered.length);
    return filtered;
  };

  const filteredEventsForList = getFilteredEventsForList();

  const selectedDayEvents = events.filter(event => isSameDay(parseISO(event.event_date), selectedDay));

  const currentMonthEvents = events.filter(event => {
    const eventStartDate = parseISO(event.event_date);
    const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
    
    return isSameMonth(eventStartDate, currentMonth) && eventEndDate >= now;
  });

  const handleApplyFilters = (filters: { searchTerm: string; eventType: string; state: string; dateFilter: string; }) => {
    setSearchTerm(filters.searchTerm);
    setEventType(filters.eventType);
    setGeographicalStateFilter(filters.state);
    setDateFilter(filters.dateFilter);
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setEventType('All');
    setGeographicalStateFilter('All');
    setDateFilter('All Upcoming');
  };

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
        className="relative text-center mb-12 px-4 py-8 sm:px-6 sm:py-12 rounded-xl shadow-xl text-white overflow-hidden"
      >
        <img 
          src={heroBackground} 
          alt="Hero Background" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">Discover Your Next Soulful Experience</h1>
          <p className="text-lg sm:text-xl font-light mb-8 opacity-90">Connect with events that nourish your mind, body, and spirit across Australia.</p>
          <Link to="/submit-event">
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 text-base sm:text-lg font-semibold py-2 px-6 sm:py-3 sm:px-8 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105">
              Add Your Event
            </button>
          </Link>
        </div>
      </div>

      {!user && showSignUpPrompt && (
        <Card className="mb-8 p-4 sm:p-6 bg-gradient-to-r from-primary to-purple-500 text-white rounded-lg shadow-lg relative">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white/80 hover:bg-white/20" onClick={() => setShowSignUpPrompt(false)}>
            <X className="h-4 w-4" />
          </Button>
          <CardContent className="flex flex-col sm:flex-row items-center text-center sm:text-left p-0">
            <UserPlus className="mr-4 h-10 w-10 flex-shrink-0 text-white" />
            <div>
              <p className="font-bold text-xl mb-2">Unlock More Features!</p>
              <p className="text-base mb-4">
                Sign up to <strong>create your own events</strong>, <strong>bookmark your favorites</strong>, and <strong>manage your submissions</strong> easily.
              </p>
              <Link to="/login">
                <Button className="bg-white text-primary hover:bg-gray-100 font-semibold py-2 px-6 rounded-full shadow-md transition-all duration-300 ease-in-out transform hover:scale-105">
                  Sign Up / Log In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-8 p-4 sm:p-6 bg-secondary border border-border rounded-lg shadow-lg text-center flex items-center justify-center">
        <Lightbulb className="mr-3 h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-primary" />
        <p className="text-sm sm:text-base leading-relaxed text-foreground">
          SoulFlow is a prototype app. Your feedback is invaluable! Please visit the <Link to="/contact" className="text-primary hover:underline font-medium">Contact Us</Link> page to share your suggestions.
        </p>
      </div>

      <EventFilterBar
        searchTerm={searchTerm}
        eventType={eventType}
        stateFilter={geographicalStateFilter}
        dateFilter={dateFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onApplyFilters={handleApplyFilters}
        onClearAllFilters={handleClearAllFilters}
      />

      {(loading || isSessionLoading) ? (
        <EventCardList events={[]} loading={true} onShare={handleShare} onDelete={handleDelete} onViewDetails={handleViewDetails} />
      ) : (
        <>
          {viewMode === 'list' ? (
            <EventCardList
              events={filteredEventsForList}
              onShare={handleShare}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              hasActiveFilters={searchTerm !== '' || eventType !== 'All' || geographicalStateFilter !== 'All' || dateFilter !== 'All Upcoming'}
              onClearFilters={handleClearAllFilters}
            />
          ) : viewMode === 'calendar' ? (
            <EventCalendarView
              events={events}
              selectedDay={selectedDay}
              onDayClick={setSelectedDay}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onEventSelect={handleViewDetails}
              selectedDayEvents={selectedDayEvents}
              currentMonthEvents={currentMonthEvents}
              onShare={handleShare}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
            />
          ) : (
            <MapPage />
          )}
        </>
      )}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} cameFromCalendar={viewMode === 'calendar'} />
    </div>
  );
};

export default EventsList;