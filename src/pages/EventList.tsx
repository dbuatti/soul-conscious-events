import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input for search
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select for filtering
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Search } from 'lucide-react'; // Import Search icon
import { toast } from 'sonner';
import { MadeWithDyad } from '@/components/made-with-dyad';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  location?: string;
  description?: string;
  ticket_link?: string;
  price?: string;
  special_notes?: string;
  organizer_contact?: string;
  event_type?: string;
}

const eventTypes = [
  'All', // Option to show all event types
  'Music',
  'Workshop',
  'Meditation',
  'Open Mic',
  'Sound Bath',
  'Foraging',
  'Community Gathering',
  'Other',
];

const EventList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('All');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      let query = supabase.from('events').select('*');

      if (selectedEventType !== 'All') {
        query = query.eq('event_type', selectedEventType);
      }

      if (searchTerm) {
        query = query.or(
          `event_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,organizer_contact.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.order('event_date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events.');
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [selectedEventType, searchTerm]); // Re-fetch when filters change

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 p-4">
        <p className="text-xl text-gray-700">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 p-4">
      <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl border border-gray-200 mt-8 mb-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Upcoming SoulFlow Events</h2>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search events..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select onValueChange={setSelectedEventType} defaultValue={selectedEventType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
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

        {events.length === 0 ? (
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
                  {event.location && (
                    <CardDescription className="flex items-center text-gray-600 mt-1">
                      <MapPin className="mr-2 h-4 w-4 text-red-500" />
                      {event.location}
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
                    </p>
                  )}
                  {event.ticket_link && (
                    <p className="flex items-center text-gray-700">
                      <LinkIcon className="mr-2 h-4 w-4 text-purple-600" />
                      <a href={event.ticket_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Ticket/Booking Link
                      </a>
                    </p>
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
                <CardFooter className="flex justify-end">
                  {/* Future buttons like Save, Share, RSVP can go here */}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default EventList;