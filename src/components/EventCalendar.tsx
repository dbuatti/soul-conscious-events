import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, isAfter, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { MapPin, Clock, DollarSign, LinkIcon, Info, User, Tag, Share2, Globe, Calendar as CalendarIcon, PlusCircle, Frown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string; // Added end_date
  event_time?: string;
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
}

interface EventCalendarProps {
  events: Event[];
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onEventSelect: (event: Event) => void; // New prop to handle event selection
}

const EventCalendar: React.FC<EventCalendarProps> = ({ events, selectedDate, onDateSelect, onEventSelect }) => {
  // Debugging logs
  console.log('EventCalendar Debug: All events passed:', events);
  console.log('EventCalendar Debug: Selected date:', selectedDate);

  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = format(new Date(event.event_date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const modifiers = {
    events: events.map(event => parseISO(event.event_date)),
  };

  const modifiersStyles = {
    events: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      borderRadius: '0.25rem',
    },
  };

  const eventsOnSelectedDate = selectedDate
    ? events.filter(event => isSameDay(parseISO(event.event_date), selectedDate))
    : [];

  const moreUpcomingEvents = selectedDate
    ? events
        .filter(event => isAfter(parseISO(event.event_date), selectedDate))
        .sort((a, b) => {
          const dateA = parseISO(a.event_date);
          const dateB = parseISO(b.event_date);
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          const timeA = a.event_time || '';
          const timeB = b.event_time || '';
          return timeA.localeCompare(timeB);
        })
    : [];

  // Debugging logs for filtered events
  console.log('EventCalendar Debug: Events on selected date:', eventsOnSelectedDate);
  console.log('EventCalendar Debug: More upcoming events:', moreUpcomingEvents);

  const handleShare = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    navigator.clipboard.writeText(eventUrl)
      .then(() => toast.success('Event link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link. Please try again.'));
  };

  const renderEventCard = (event: Event) => {
    const googleMapsLink = event.full_address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.full_address)}`
      : '#';

    const formattedStartDate = event.event_date
      ? format(new Date(event.event_date), 'PPP')
      : 'Date TBD';
    const formattedEndDate = event.end_date
      ? format(new Date(event.end_date), 'PPP')
      : '';

    const dateDisplay =
      event.end_date && event.event_date !== event.end_date
        ? `${formattedStartDate} - ${formattedEndDate}`
        : formattedStartDate;

    return (
      <Card
        key={event.id}
        className="group flex flex-col justify-between shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden"
        onClick={() => onEventSelect(event)}
      >
        {event.image_url && (
          <div className="relative w-full h-48 overflow-hidden">
            <img
              src={event.image_url}
              alt={`Image for ${event.event_name}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-2xl font-bold text-purple-700 mb-2">{event.event_name}</CardTitle>
          <CardDescription className="flex items-center text-gray-600 text-base">
            <CalendarIcon className="mr-2 h-5 w-5 text-blue-500" />
            {dateDisplay}
            {event.event_time && (
              <>
                <Clock className="ml-4 mr-2 h-5 w-5 text-green-500" />
                {event.event_time}
              </>
            )}
          </CardDescription>
          {(event.place_name || event.full_address || event.state) && (
            <CardDescription className="flex flex-col items-start text-gray-600 mt-2">
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
              {/* Removed event.state display */}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-2">
          {event.description && (
            <div>
              <p className="text-gray-700 leading-relaxed line-clamp-3">{event.description}</p>
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
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" size="icon" onClick={(e) => handleShare(event, e)} title="Share Event" className="transition-all duration-300 ease-in-out transform hover:scale-105">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
      <div className="lg:w-1/2 flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className="rounded-xl border shadow-lg"
        />
      </div>
      <div className="lg:w-1/2">
        <h3 className="text-2xl font-bold text-foreground mb-4 text-center lg:text-left">
          Events on {selectedDate ? format(selectedDate, 'PPP') : 'Selected Date'}
        </h3>
        {eventsOnSelectedDate.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <Frown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-4">
              No events found on this date.
            </p>
            <Link to="/submit-event">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105">
                <PlusCircle className="mr-2 h-4 w-4" /> Add a New Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {eventsOnSelectedDate.map((event) => renderEventCard(event))}
          </div>
        )}

        {moreUpcomingEvents.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-xl font-bold text-foreground mb-4 text-center lg:text-left">
              More Upcoming Events
            </h4>
            <div className="space-y-4">
              {moreUpcomingEvents.map((event) => renderEventCard(event))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCalendar;