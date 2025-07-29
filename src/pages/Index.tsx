import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Search, Globe, Share2, List, CalendarDays, X } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import EventCalendar from '@/components/EventCalendar';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  location?: string;
  full_address?: string;
  description?: string;
  ticket_link?: string;
  price?: string;
  special_notes?: string;
  organizer_contact?: string;
  event_type?: string;
  state?: string;
}

const eventTypes = [
  'All',
  'Music',
  'Workshop',
  'Meditation',
  'Open Mic',
  'Sound Bath',
  'Foraging',
  'Community Gathering',
  'Other',
];

const australianStates = [
  'All',
  'ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'
];

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // States for filter inputs (draft values)
  const [draftSearchTerm, setDraftSearchTerm] = useState('');
  const [draftEventType, setDraftEventType] = useState('All');
  const [draftState, setDraftState] = useState('All');
  const [draftDateFilter, setDraftDateFilter] = useState('All Upcoming');

  // States for applied filters (trigger data fetch)
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedEventType, setAppliedEventType] = useState('All');
  const [appliedState, setAppliedState] = useState('All');
  const [appliedDateFilter, setAppliedDateFilter] = useState('All Upcoming');

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());

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
          // No date filter applied, will fetch all events
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

      if (appliedSearchTerm) {
        query = query.or(
          `event_name.ilike.%${appliedSearchTerm}%,description.ilike.%${appliedSearchTerm}%,organizer_contact.ilike.%${appliedSearchTerm}%,full_address.ilike.%${appliedSearchTerm}%`
        );
      }

      // Default order for upcoming/all events
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
    setAppliedSearchTerm(draftSearchTerm);
    setAppliedEventType(draftEventType);
    setAppliedState(draftState);
    setAppliedDateFilter(draftDateFilter);
  };

  const handleClearFilters = () => {
    setDraftSearchTerm('');
    setDraftEventType('All');
    setDraftState('All');
    setDraftDateFilter('All Upcoming');
    setAppliedSearchTerm('');
    setAppliedEventType('All');
    setAppliedState('All');
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

  const handleShare = (event: Event) => {
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    navigator.clipboard.writeText(eventUrl)
      .then(() => toast.success('Event link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link. Please try again.'));
  };

  return (
    <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
      <h1 className="text-4xl font-bold mb-4 text-gray-800 text-center">Welcome to SoulFlow</h1>
      <p className="text-xl text-gray-600 mb-6 text-center">
        Connect with soulful events in your community.
      </p>
      <div className="flex justify-center mb-8">
        <Link to="/submit-event">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105">
            Add New Event
          </Button>
        </Link>
      </div>

      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">SoulFlow Events</h2>

      {/* Filter and View Options Section */}
      <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-end">
          {/* Search Input */}
          <div className="relative col-span-full">
            <label htmlFor="search-events" className="text-sm font-medium text-gray-700 mb-1 block">Search Events</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              id="search-events"
              placeholder="Search by name, description, organizer, or address..."
              className="pl-9 w-full"
              value={draftSearchTerm}
              onChange={(e) => setDraftSearchTerm(e.target.value)}
            />
            {draftSearchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-500 hover:bg-gray-200"
                onClick={() => setDraftSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Event Type Select */}
          <div className="flex flex-col gap-1">
            <label htmlFor="event-type" className="text-sm font-medium text-gray-700">Event Type</label>
            <Select onValueChange={setDraftEventType} value={draftEventType}>
              <SelectTrigger id="event-type" className="w-full">
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
              <SelectTrigger id="event-state" className="w-full">
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
              <SelectTrigger id="date-range" className="w-full">
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

          {/* Action Buttons */}
          <div className="col-span-full flex flex-col sm:flex-row gap-4 justify-end items-end mt-4 md:mt-0">
            {(draftSearchTerm !== appliedSearchTerm ||
              draftEventType !== appliedEventType ||
              draftState !== appliedState ||
              draftDateFilter !== appliedDateFilter) && (
                <Button onClick={handleApplyFilters} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                  Apply Filters
                </Button>
              )}
            {(appliedSearchTerm !== '' || appliedEventType !== 'All' || appliedState !== 'All' || appliedDateFilter !== 'All Upcoming') && (
              <Button variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto">
                Clear All Filters
              </Button>
            )}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label htmlFor="view-mode" className="text-sm font-medium text-gray-700 sr-only sm:not-sr-only">View Mode</label>
              <ToggleGroup id="view-mode" type="single" value={viewMode} onValueChange={(value: 'list' | 'calendar') => value && setViewMode(value)} className="w-full sm:w-auto justify-end">
                <ToggleGroupItem value="list" aria-label="Toggle list view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="calendar" aria-label="Toggle calendar view">
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
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-purple-600 hover:bg-purple-200" onClick={() => removeFilter('search')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {appliedEventType !== 'All' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
                Type: {appliedEventType}
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-blue-600 hover:bg-blue-200" onClick={() => removeFilter('eventType')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {appliedState !== 'All' && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
                State: {appliedState}
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-green-600 hover:bg-green-200" onClick={() => removeFilter('state')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {appliedDateFilter !== 'All Upcoming' && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1">
                Date: {appliedDateFilter}
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-orange-600 hover:bg-orange-200" onClick={() => removeFilter('dateFilter')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="flex flex-col justify-between shadow-md">
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
            events.length === 0 ? (
              <p className="text-center text-gray-600">No events found matching your criteria.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((event) => (
                  <Card key={event.id} className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold text-purple-700">{event.event_name}</CardTitle>
                      <CardDescription className="flex items-center text-gray-600 mt-2">
                        <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                        {event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBD'}
                        {event.event_time && (
                          <>
                            <Clock className="ml-4 mr-2 h-4 w-4 text-green-500" />
                            {event.event_time}
                          </>
                        )}
                      </CardDescription>
                      {(event.full_address) && (
                        <CardDescription className="flex items-center text-gray-600 mt-1">
                          <MapPin className="mr-2 h-4 w-4 text-red-500" />
                          {event.full_address}
                        </CardDescription>
                      )}
                      {event.state && (
                        <CardDescription className="flex items-center text-gray-600 mt-1">
                          <Globe className="mr-2 h-4 w-4 text-orange-500" />
                          {event.state}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {event.description && (
                        <div>
                          <p className="text-gray-700">
                            {expandedDescriptions[event.id] || event.description.length < 150
                              ? event.description
                              : `${event.description.substring(0, 150)}...`}
                          </p>
                          {event.description.length >= 150 && (
                            <Button variant="link" onClick={() => toggleDescription(event.id)} className="p-0 h-auto text-blue-600">
                              {expandedDescriptions[event.id] ? 'Read Less' : 'Read More'}
                            </Button>
                          )}
                        </div>
                      )}
                      {event.price && (
                        <p className="flex items-center text-gray-700">
                          <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                          Price: {event.price}
                          {event.price.toLowerCase() === 'free' && (
                            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Free</Badge>
                          )}
                        </p>
                      )}
                      {event.ticket_link && (
                        <div className="flex items-center">
                          <LinkIcon className="mr-2 h-4 w-4 text-purple-600" />
                          <Button asChild variant="link" className="p-0 h-auto text-blue-600">
                            <a href={event.ticket_link} target="_blank" rel="noopener noreferrer">
                              Ticket/Booking Link
                            </a>
                          </Button>
                        </div>
                      )}
                      {event.special_notes && (
                        <p className="flex items-start text-gray-700">
                          <Info className="mr-2 h-4 w-4 text-orange-500 mt-1" />
                          Special Notes: {event.special_notes}
                        </p>
                      )}
                      {event.organizer_contact && (
                        <p className="flex items-center text-gray-700">
                          <User className="mr-2 h-4 w-4 text-indigo-500" />
                          Organizer: {event.organizer_contact}
                        </p>
                      )}
                      {event.event_type && (
                        <p className="flex items-center text-gray-700">
                          <Tag className="mr-2 h-4 w-4 text-pink-500" />
                          Type: {event.event_type}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleShare(event)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </Button>
                      <Link to={`/events/${event.id}`}>
                        <Button size="sm">View Details</Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <EventCalendar
              events={events}
              selectedDate={selectedCalendarDate}
              onDateSelect={setSelectedCalendarDate}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Index;