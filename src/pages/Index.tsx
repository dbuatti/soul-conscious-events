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
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      event_name: 'Mindful Meditation & Sound Bath',
      event_date: '2024-09-15',
      event_time: '6:00 PM - 7:30 PM',
      full_address: '123 Wellness Way, Fitzroy, VIC 3065, Australia',
      description: 'Join us for an evening of deep relaxation and inner peace with guided meditation followed by a soothing sound bath. All levels welcome.',
      ticket_link: 'https://example.com/meditation-soundbath',
      price: '$35',
      special_notes: 'Bring a yoga mat and blanket.',
      organizer_contact: 'Soulful Events',
      event_type: 'Meditation',
      state: 'VIC',
    },
    {
      id: '2',
      event_name: 'Community Garden Harvest Festival',
      event_date: '2024-10-05',
      event_time: '10:00 AM - 3:00 PM',
      full_address: '456 Green Lane, Brunswick, VIC 3056, Australia',
      description: 'Celebrate the bounty of our community garden! Enjoy fresh produce, live music, workshops on sustainable living, and activities for kids.',
      ticket_link: '',
      price: 'Free',
      special_notes: 'Family-friendly event. Donations welcome.',
      organizer_contact: 'Brunswick Community Gardens',
      event_type: 'Community Gathering',
      state: 'VIC',
    },
    {
      id: '3',
      event_name: 'Acoustic Open Mic Night',
      event_date: '2024-09-20',
      event_time: '7:00 PM - 10:00 PM',
      full_address: '789 Harmony Street, St Kilda, VIC 3182, Australia',
      description: 'Showcase your talent or simply enjoy an evening of local acoustic music and poetry. Sign-ups start at 6:30 PM.',
      ticket_link: '',
      price: 'Donation',
      special_notes: 'Drinks and snacks available for purchase.',
      organizer_contact: 'The St Kilda Cafe',
      event_type: 'Open Mic',
      state: 'VIC',
    },
    {
      id: '4',
      event_name: 'Urban Foraging Workshop: Edible Weeds',
      event_date: '2024-10-12',
      event_time: '9:00 AM - 12:00 PM',
      full_address: 'Royal Botanic Gardens Victoria, Birdwood Ave, Melbourne, VIC 3004, Australia',
      description: 'Learn to identify and safely forage for edible weeds in urban environments. Discover their nutritional benefits and how to incorporate them into your diet.',
      ticket_link: 'https://example.com/foraging-workshop',
      price: '$60',
      special_notes: 'Wear comfortable shoes and bring a basket.',
      organizer_contact: 'Green Thumbs Collective',
      event_type: 'Foraging',
      state: 'VIC',
    },
    {
      id: '5',
      event_name: 'Sunset Yoga & Live Music',
      event_date: '2024-09-25',
      event_time: '5:30 PM - 6:45 PM',
      full_address: 'Southbank Promenade, Melbourne, VIC 3006, Australia',
      description: 'Experience a rejuvenating yoga flow accompanied by live acoustic music as the sun sets over the Yarra River. All levels welcome.',
      ticket_link: 'https://example.com/sunset-yoga',
      price: '$25',
      special_notes: 'Bring your own yoga mat. Limited spots available.',
      organizer_contact: 'Flow State Yoga',
      event_type: 'Meditation',
      state: 'VIC',
    },
    {
      id: '6',
      event_name: 'Beginner Pottery Workshop',
      event_date: '2024-11-02',
      event_time: '1:00 PM - 4:00 PM',
      full_address: '88 Clay Street, Northcote, VIC 3070, Australia',
      description: 'Get your hands dirty and learn the basics of pottery. Create your own unique ceramic piece to take home.',
      ticket_link: 'https://example.com/pottery-workshop',
      price: '$95',
      special_notes: 'All materials provided. Wear old clothes.',
      organizer_contact: 'Northcote Arts Studio',
      event_type: 'Workshop',
      state: 'VIC',
    },
  ]);
  const [loading, setLoading] = useState(false); // Set to false as we have initial data
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

  // Debounce effect for search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setAppliedSearchTerm(draftSearchTerm);
    }, 300); // 300ms debounce

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
        // Only update if data is different from dummy data to avoid overwriting
        // In a real app, you'd always fetch from Supabase and not use dummy data here.
        // For this exercise, we'll keep the dummy data as a fallback/initial state.
        if (data && data.length > 0) {
          setEvents(data as Event[]);
        }
      }
      setLoading(false);
    };

    // Commenting out fetchEvents for now to rely on dummy data,
    // but keeping the function for future use if Supabase is populated.
    // fetchEvents();
  }, [appliedEventType, appliedState, appliedSearchTerm, appliedDateFilter]);

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleApplyFilters = () => {
    // Only apply dropdown filters here, search is handled by debounce
    setAppliedEventType(draftEventType);
    setAppliedState(draftState);
    setAppliedDateFilter(draftDateFilter);
  };

  const handleClearFilters = () => {
    setDraftSearchTerm('');
    setAppliedSearchTerm(''); // Clear applied search term immediately
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
                onClick={() => {
                  setDraftSearchTerm('');
                  setAppliedSearchTerm('');
                }}
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
            {(
              draftEventType !== appliedEventType ||
              draftState !== appliedState ||
              draftDateFilter !== appliedDateFilter
            ) && (
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