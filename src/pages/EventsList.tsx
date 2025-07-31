import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Search, Globe, Share2, List, CalendarDays, X, Image as ImageIcon, Edit, Trash2, ChevronDown, Lightbulb } from 'lucide-react';
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

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const [draftSearchTerm, setDraftSearchTerm] = useState('');
  const [draftEventType, setDraftEventType] = useState('All');
  const [draftState, setDraftState] = useState('All');
  const [draftDateFilter, setDraftDateFilter] = useState('All Upcoming');

  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedEventType, setAppliedEventType] = useState('All');
  const [appliedState, setAppliedState] = useState('All');
  const [appliedDateFilter, setAppliedDateFilter] = useState('All Upcoming');

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [isFiltersOpen, setIsFiltersOpen] = useState(true); // State for collapsible filters

  const { user, isLoading: isSessionLoading } = useSession(); // Get user from context
  const isAdmin = user?.email === 'daniele.buatti@gmail.com';

  // State for EventDetailDialog
  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setAppliedSearchTerm(draftSearchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [draftSearchTerm]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      let query = supabase.from('events').select('*');

      const now = new Date();
      const todayFormatted = format(now, 'yyyy-MM-dd');

      switch (appliedDateFilter) {
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

      if (appliedEventType !== 'All') {
        query = query.eq('event_type', appliedEventType);
      }

      if (appliedState !== 'All') {
        query = query.eq('state', appliedState);
      }

      // Always filter for 'approved' events for public view
      query = query.eq('state', 'approved');

      if (appliedSearchTerm) {
        query = query.or(
          `event_name.ilike.%${appliedSearchTerm}%,description.ilike.%${appliedSearchTerm}%,organizer_contact.ilike.%${appliedSearchTerm}%,full_address.ilike.%${appliedSearchTerm}%,place_name.ilike.%${appliedSearchTerm}%`
        );
      }

      if (appliedDateFilter !== 'Past Events') {
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
  }, [appliedEventType, appliedState, appliedSearchTerm, appliedDateFilter]);

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleApplyFilters = () => {
    setAppliedEventType(draftEventType);
    setAppliedState(draftState);
    setAppliedDateFilter(draftDateFilter);
  };

  const handleClearFilters = () => {
    setDraftSearchTerm('');
    setAppliedSearchTerm('');
    setDraftEventType('All');
    setAppliedEventType('All');
    setDraftState('All');
    setAppliedState('All');
    setDraftDateFilter('All Upcoming');
    setAppliedDateFilter('All Upcoming');
  };

  const removeFilter = (filterType: 'search' | 'eventType' | 'state' | 'dateFilter') => {
    switch (filterType) {
      case 'search':
        setDraftSearchTerm('');
        setAppliedSearchTerm('');
        break;
      case 'eventType':
        setDraftEventType('All');
        setAppliedEventType('All');
        break;
      case 'state':
        setDraftState('All');
        setAppliedState('All');
        break;
      case 'dateFilter':
        setDraftDateFilter('All Upcoming');
        setAppliedDateFilter('All Upcoming');
        break;
      default:
        break;
    }
  };

  const hasActiveFilters =
    appliedSearchTerm !== '' ||
    appliedEventType !== 'All' ||
    appliedState !== 'All' ||
    appliedDateFilter !== 'All Upcoming';

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
    <div className="w-full max-w-7xl bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      {/* Hero Section */}
      <div className="text-center mb-12 py-12 px-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-xl text-white">
        <h1 className="text-5xl font-extrabold mb-4 leading-tight">
          Discover Your Next Soulful Experience
        </h1>
        <p className="text-xl font-light mb-8 opacity-90">
          Connect with events that nourish your mind, body, and spirit across Australia.
        </p>
        <Link to="/submit-event">
          <Button className="bg-white text-purple-700 hover:bg-gray-100 text-lg font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105">
            Add Your Event
          </Button>
        </Link>
      </div>

      {/* App Description Clause */}
      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-lg text-center flex items-center justify-center">
        <Lightbulb className="mr-3 h-6 w-6 text-blue-600 flex-shrink-0" />
        <p className="text-gray-700 text-base leading-relaxed">
          SoulFlow is a prototype app designed to help you discover and connect with soul-nourishing events across Australia.
          As this is a new project from an aspiring app developer, some features may not work as expected.
          Your feedback is invaluable! Please visit the <Link to="/contact" className="text-blue-600 hover:underline font-medium">Contact Us</Link> page to share your suggestions or report any issues.
        </p>
      </div>

      {/* Filter and View Options Section */}
      <Collapsible
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Filter Events</h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isFiltersOpen ? 'rotate-180' : ''}`} />
              <span className="sr-only">Toggle filters</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="CollapsibleContent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-start mt-6">
            {/* Search Input */}
            <div className="relative col-span-full">
              <label htmlFor="search-events" className="text-sm font-medium text-gray-700 mb-1 block">Search Events</label>
              <Input
                id="search-events"
                placeholder="Search events..."
                className="w-full focus-visible:ring-purple-500"
                value={draftSearchTerm}
                onChange={(e) => setDraftSearchTerm(e.target.value)}
              />
              {draftSearchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-500 hover:bg-gray-200 transition-all duration-300 ease-in-out transform hover:scale-105"
                  onClick={() => {
                    setDraftSearchTerm('');
                    setAppliedSearchTerm('');
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Event Type Select */}
            <div className="flex flex-col gap-1">
              <label htmlFor="event-type" className="text-sm font-medium text-gray-700">Event Type</label>
              <Select onValueChange={setDraftEventType} value={draftEventType}>
                <SelectTrigger id="event-type" className="w-full focus-visible:ring-purple-500">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State Select */}
            <div className="flex flex-col gap-1">
              <label htmlFor="event-state" className="text-sm font-medium text-gray-700">State</label>
              <Select onValueChange={setDraftState} value={draftState}>
                <SelectTrigger id="event-state" className="w-full focus-visible:ring-purple-500">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  {australianStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Select */}
            <div className="flex flex-col gap-1">
              <label htmlFor="date-range" className="text-sm font-medium text-gray-700">Date Range</label>
              <Select onValueChange={setDraftDateFilter} value={draftDateFilter}>
                <SelectTrigger id="date-range" className="w-full focus-visible:ring-purple-500">
                  <SelectValue placeholder="All Upcoming" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Upcoming">All Upcoming</SelectItem>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="This Week">This Week</SelectItem>
                  <SelectItem value="This Month">This Month</SelectItem>
                  <SelectItem value="Past Events">Past Events</SelectItem>
                  <SelectItem value="All Events">All Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons and View Mode Controls */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Left side: Add New Event Button */}
            <Link to="/submit-event">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 w-full sm:w-auto">
                Add New Event
              </Button>
            </Link>

            {/* Right side: Apply, Clear, View Mode */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {(
                draftEventType !== appliedEventType ||
                draftState !== appliedState ||
                draftDateFilter !== appliedDateFilter
              ) && (
                  <Button onClick={handleApplyFilters} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105">
                    Apply Filters
                  </Button>
                )}
              {(appliedSearchTerm !== '' || appliedEventType !== 'All' || appliedState !== 'All' || appliedDateFilter !== 'All Upcoming') && (
                <Button variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105">
                  Clear All Filters
                </Button>
              )}

              {/* View Mode Toggle */}
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label htmlFor="view-mode" className="text-sm font-medium text-gray-700">View Mode</label>
                <ToggleGroup id="view-mode" type="single" value={viewMode} onValueChange={(value: 'list' | 'calendar') => value && setViewMode(value)} className="w-full sm:w-auto justify-end">
                  <ToggleGroupItem value="list" aria-label="List View">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="calendar" aria-label="Calendar View">
                    <CalendarDays className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-6 flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">Active Filters:</span>
              {appliedSearchTerm && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 flex items-center gap-1">
                  Search: "{appliedSearchTerm}"
                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-purple-600 hover:bg-purple-200 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('search')}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {appliedEventType !== 'All' && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
                  Type: {appliedEventType}
                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-blue-600 hover:bg-blue-200 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('eventType')}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {appliedState !== 'All' && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
                  State: {appliedState}
                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-green-600 hover:bg-green-200 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('state')}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {appliedDateFilter !== 'All Upcoming' && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1">
                  Date: {appliedDateFilter}
                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-orange-600 hover:bg-orange-200 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('dateFilter')}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Event Count Display */}
      <div className="text-center text-gray-700 mb-4">
        {loading ? (
          <Skeleton className="h-5 w-48 mx-auto" />
        ) : events.length === 0 ? (
          'No events found matching your criteria.'
        ) : (
          `Showing ${events.length} event${events.length === 1 ? '' : 's'}.`
        )}
      </div>

      {loading || isSessionLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="flex flex-col justify-between shadow-lg rounded-lg">
              <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-gray-200 animate-pulse"></div>
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
            events.length === 0 ? null : (
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
                      className="group flex flex-col justify-between shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden"
                      onClick={() => handleViewDetails(event)}
                    >
                      {event.image_url && (
                        <div className="relative w-full aspect-video overflow-hidden">
                          <img
                            src={event.image_url}
                            alt={event.event_name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        </div>
                      )}
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-2xl font-bold text-purple-700 mb-2">{event.event_name}</CardTitle>
                        <CardDescription className="flex items-center text-gray-600 text-base">
                          <Calendar className="mr-2 h-5 w-5 text-blue-500" />
                          {dateDisplay}
                          {event.event_time && (
                            <>
                              <Clock className="ml-4 mr-2 h-5 w-5 text-green-500" />
                              {event.event_time}
                            </>
                          )}
                        </CardDescription>
                        {(event.place_name || event.full_address) && (
                          <div className="flex flex-col items-start text-gray-600 mt-2">
                            {event.place_name && (
                              <div className="flex items-center mb-1">
                                <MapPin className="mr-2 h-5 w-5 text-red-500" />
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-base py-1 px-2 font-semibold">
                                  {event.place_name}
                                </Badge>
                              </div>
                            )}
                            {event.full_address && (
                              <div className="flex items-center">
                                {!event.place_name && <MapPin className="mr-2 h-5 w-5 text-red-500" />}
                                <a
                                  href={googleMapsLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-base"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {event.full_address}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-2">
                        {event.description && (
                          <div>
                            <p className="text-gray-700 leading-relaxed">
                              {expandedDescriptions[event.id] || event.description.length < 150
                                ? event.description
                                : `${event.description.substring(0, 150)}...`}
                            </p>
                            {event.description.length >= 150 && (
                              <Button variant="link" onClick={(e) => { e.stopPropagation(); toggleDescription(event.id); }} className="p-0 h-auto text-blue-600 transition-all duration-300 ease-in-out transform hover:scale-105">
                                {expandedDescriptions[event.id] ? 'Read Less' : 'Read More'}
                              </Button>
                            )}
                          </div>
                        )}
                        {event.price && (
                          <p className="flex items-center text-gray-700 text-base">
                            <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                            <span className="font-medium">Price:</span> {event.price}
                            {event.price.toLowerCase() === 'free' && (
                              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Free</Badge>
                            )}
                          </p>
                        )}
                        {event.ticket_link && (
                          <div className="flex items-center">
                            <LinkIcon className="mr-2 h-5 w-5 text-purple-600" />
                            <Button asChild variant="link" className="p-0 h-auto text-blue-600 text-base transition-all duration-300 ease-in-out transform hover:scale-105">
                              <a href={event.ticket_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                Ticket/Booking Link
                              </a>
                            </Button>
                          </div>
                        )}
                        {event.special_notes && (
                          <p className="flex items-start text-gray-700 text-base">
                            <Info className="mr-2 h-5 w-5 text-orange-500 mt-1" />
                            <span className="font-medium">Special Notes:</span> {event.special_notes}
                          </p>
                        )}
                        {event.organizer_contact && (
                          <p className="flex items-center text-gray-700 text-base">
                            <User className="mr-2 h-5 w-5 text-indigo-500" />
                            <span className="font-medium">Organizer:</span> {event.organizer_contact}
                          </p>
                        )}
                        {event.event_type && (
                          <p className="flex items-center text-gray-700 text-base">
                            <Tag className="mr-2 h-5 w-5 text-pink-500" />
                            <span className="font-medium">Type:</span> {event.event_type}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="flex flex-col items-start pt-4">
                        <div className="flex justify-end w-full space-x-2">
                          <Button variant="outline" size="icon" onClick={(e) => handleShare(event, e)} title="Share Event" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                            <Share2 className="h-4 w-4" />
                          </Button>
                          {isCreatorOrAdmin && (
                            <>
                              <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="icon" title="Edit Event" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button variant="destructive" size="icon" onClick={(e) => handleDelete(event.id, e)} title="Delete Event" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                                <Trash2 className="h-4 w-4" />
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
      />
    </div>
  );
};

export default Index;