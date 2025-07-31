import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  getYear,
  getMonth,
  setMonth,
  setYear,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, CalendarIcon, MapPin, Clock, DollarSign, LinkIcon, Info, User, Tag, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EventDetailDialog from '@/components/EventDetailDialog';
import EventSidebar from '@/components/EventSidebar'; // Import the new sidebar
import { eventTypes } from '@/lib/constants'; // Import eventTypes from constants

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string;
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

const CalendarView = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
  const [isDayDetailDialogOpen, setIsDayDetailDialogOpen] = useState(false);
  const [selectedDayForDialog, setSelectedDayForDialog] = useState<Date | null>(null);
  const [selectedEventType, setSelectedEventType] = useState('All'); // New state for event type filter

  // State for EventDetailDialog
  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchEvents = async () => {
    setLoading(true);
    let query = supabase
      .from('events')
      .select('*')
      .eq('state', 'approved')
      .order('event_date', { ascending: true });

    if (selectedEventType !== 'All') {
      query = query.eq('event_type', selectedEventType);
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

  useEffect(() => {
    fetchEvents();
  }, [selectedEventType]); // Re-fetch events when selectedEventType changes

  const startOfCurrentMonth = startOfMonth(currentMonth);
  const endOfCurrentMonth = endOfMonth(currentMonth);

  // Adjust start of week to Monday (getDay returns 0 for Sunday, 1 for Monday)
  const startDay = startOfWeek(startOfCurrentMonth, { weekStartsOn: 1 });
  const endDay = endOfWeek(endOfCurrentMonth, { weekStartsOn: 1 });

  const daysInMonthView = eachDayOfInterval({ start: startDay, end: endDay });

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleThisMonth = () => {
    setCurrentMonth(new Date());
  };

  const handleMonthChange = (value: string) => {
    setCurrentMonth(setMonth(currentMonth, parseInt(value)));
  };

  const handleYearChange = (value: string) => {
    setCurrentMonth(setYear(currentMonth, parseInt(value)));
  };

  const years = Array.from({ length: 10 }, (_, i) => getYear(new Date()) - 5 + i); // 5 years back, 4 years forward

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStartDate = parseISO(event.event_date);
      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
      return (isSameDay(eventStartDate, day) || (day >= eventStartDate && day <= eventEndDate));
    }).sort((a, b) => {
      // Sort by time if available, otherwise by name
      const timeA = a.event_time || '';
      const timeB = b.event_time || '';
      if (timeA && timeB) return timeA.localeCompare(timeB);
      return a.event_name.localeCompare(b.event_name);
    });
  };

  const openDayDetailDialog = (day: Date) => {
    setSelectedDayForDialog(day);
    setSelectedDayEvents(getEventsForDay(day));
    setIsDayDetailDialogOpen(true);
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
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
      <Card key={event.id} className="group shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200 border border-border">
        {event.image_url && (
          <div className="relative w-full h-32 overflow-hidden rounded-t-lg">
            <img
              src={event.image_url}
              alt={event.event_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-base font-semibold text-primary line-clamp-1">{event.event_name}</CardTitle>
          <CardDescription className="flex items-center text-muted-foreground text-xs mt-1">
            <CalendarIcon className="mr-1 h-3 w-3 text-accent-foreground" />
            {dateDisplay}
            {event.event_time && (
              <>
                <Clock className="ml-2 mr-1 h-3 w-3 text-accent-foreground" />
                {event.event_time}
              </>
            )}
          </CardDescription>
          {(event.place_name || event.full_address) && (
            <CardDescription className="flex items-center text-muted-foreground text-xs mt-1">
              <MapPin className="mr-1 h-3 w-3 text-accent-foreground" />
              {event.place_name || event.full_address}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-2">
          {event.description && (
            <p className="text-foreground text-sm line-clamp-2 mb-2">{event.description}</p>
          )}
          <div className="flex justify-end">
            <Button variant="link" size="sm" className="p-0 h-auto text-primary text-xs" onClick={() => handleViewDetails(event)}>View Details</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-full bg-white p-8 rounded-xl shadow-lg border border-border flex flex-col lg:flex-row gap-8">
      {/* Sidebar */}
      <EventSidebar selectedEventType={selectedEventType} onSelectEventType={setSelectedEventType} />

      {/* Main Calendar Content */}
      <div className="flex-grow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-foreground text-center flex-grow">Event Calendar</h1>
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary-foreground text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
            </Button>
          </Link>
        </div>

        {/* Calendar Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-5 bg-gradient-to-r from-muted to-background rounded-xl shadow-lg border border-border">
          <div className="flex items-center space-x-2 mb-4 sm:mb-0">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleThisMonth} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              This Month
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <Select onValueChange={handleMonthChange} value={getMonth(currentMonth).toString()}>
              <SelectTrigger className="w-[140px] focus-visible:ring-primary">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {format(setMonth(new Date(), i), 'MMMM')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={handleYearChange} value={getYear(currentMonth).toString()}>
              <SelectTrigger className="w-[100px] focus-visible:ring-primary">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-2 text-center p-2">
            {daysOfWeek.map(day => (
              <div key={day} className="font-semibold text-foreground py-2">{day}</div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-48 border rounded-md p-2 flex flex-col items-center justify-center bg-muted">
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3 mt-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2 text-center p-2">
            {daysOfWeek.map(day => (
              <div key={day} className="font-semibold text-foreground py-2">{day}</div>
            ))}
            {daysInMonthView.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const displayEvents = dayEvents.slice(0, 2); // Show up to 2 events

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "group h-48 border rounded-md p-1 flex flex-col relative cursor-pointer transition-all duration-300 ease-in-out",
                    isCurrentMonth ? "bg-white shadow-sm hover:bg-muted hover:shadow-md" : "bg-muted text-muted-foreground",
                    isTodayDate && "border-2 border-primary bg-primary/10 shadow-lg",
                    dayEvents.length > 0 && isCurrentMonth && "border-primary/50 bg-primary/5 hover:bg-primary/10 shadow-md"
                  )}
                  onClick={() => openDayDetailDialog(day)}
                >
                  <span className={cn(
                    "font-bold text-base mb-1",
                    isTodayDate && "text-primary",
                    dayEvents.length > 0 && isCurrentMonth && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex-grow overflow-hidden space-y-1">
                    {displayEvents.map(event => (
                      <Badge
                        key={event.id}
                        className={cn(
                          "w-full text-left px-2 py-1 rounded-md font-medium cursor-pointer h-auto flex flex-col items-start whitespace-normal shadow-xs",
                          isTodayDate ? "bg-primary text-primary-foreground hover:bg-primary-foreground" : "bg-primary text-primary-foreground hover:bg-primary-foreground"
                        )}
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(event); }} // Stop propagation to prevent opening day dialog
                      >
                        {event.event_time && <span className="text-xs text-primary-foreground/80">{event.event_time}</span>}
                        <span className="text-xs font-semibold leading-snug">{event.event_name}</span>
                      </Badge>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-xs text-muted-foreground mt-1 block font-semibold">
                        +{dayEvents.length - 2} More
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Detail Dialog (remains for listing all events on a day) */}
      <Dialog open={isDayDetailDialogOpen} onOpenChange={setIsDayDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Events on {selectedDayForDialog ? format(selectedDayForDialog, 'PPP') : ''}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              All events scheduled for this day.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedDayEvents.length === 0 ? (
              <p className="text-center text-foreground">No events on this day.</p>
            ) : (
              <div className="space-y-4">
                {selectedDayEvents.map(event => (
                  <Card key={event.id} className="shadow-sm rounded-lg border border-border">
                    {event.image_url && (
                      <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={event.image_url}
                          alt={event.event_name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      </div>
                    )}
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xl font-semibold text-primary">{event.event_name}</CardTitle>
                      <CardDescription className="flex items-center text-muted-foreground text-sm mt-1">
                        <CalendarIcon className="mr-2 h-4 w-4 text-accent-foreground" />
                        {event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBD'}
                        {event.end_date && event.event_date !== event.end_date && ` - ${format(new Date(event.end_date), 'PPP')}`}
                        {event.event_time && (
                          <>
                            <Clock className="ml-4 mr-2 h-4 w-4 text-accent-foreground" />
                            {event.event_time}
                          </>
                        )}
                      </CardDescription>
                      {(event.place_name || event.full_address) && (
                        <CardDescription className="flex items-center text-muted-foreground text-sm mt-1">
                          <MapPin className="mr-2 h-4 w-4 text-accent-foreground" />
                          {event.place_name || event.full_address}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                      {event.description && (
                        <p className="text-foreground text-sm">{event.description}</p>
                      )}
                      {event.price && (
                        <p className="flex items-center text-foreground text-sm">
                          <DollarSign className="mr-2 h-4 w-4 text-accent-foreground" />
                          Price: {event.price}
                        </p>
                      )}
                      {event.ticket_link && (
                        <div className="flex items-center">
                          <LinkIcon className="mr-2 h-4 w-4 text-accent-foreground" />
                          <Button asChild variant="link" className="p-0 h-auto text-primary text-sm">
                            <a href={event.ticket_link} target="_blank" rel="noopener noreferrer">
                              Ticket/Booking Link
                            </a>
                          </Button>
                        </div>
                      )}
                      {event.special_notes && (
                        <p className="flex items-start text-foreground text-sm">
                          <Info className="mr-2 h-4 w-4 text-accent-foreground mt-1" />
                          Special Notes: {event.special_notes}
                        </p>
                      )}
                      {event.organizer_contact && (
                        <p className="flex items-center text-foreground text-sm">
                          <User className="mr-2 h-4 w-4 text-accent-foreground" />
                          Organizer: {event.organizer_contact}
                        </p>
                      )}
                      {event.event_type && (
                        <p className="flex items-center text-foreground text-sm">
                          <Tag className="mr-2 h-4 w-4 text-accent-foreground" />
                          Type: {event.event_type}
                        </p>
                      )}
                      <div className="flex justify-end mt-2">
                        <Button size="sm" onClick={() => { setIsDayDetailDialogOpen(false); handleViewDetails(event); }} className="transition-all duration-300 ease-in-out transform hover:scale-105 bg-primary hover:bg-primary-foreground text-primary-foreground">View Details</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog (for individual event details) */}
      <EventDetailDialog
        event={selectedEvent}
        isOpen={isEventDetailDialogOpen}
        onClose={() => setIsEventDetailDialogOpen(false)}
        cameFromCalendar={true} // Indicate that it's opened from calendar context
      />
    </div>
  );
};

export default CalendarView;