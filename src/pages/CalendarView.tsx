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

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchEvents = async () => {
    setLoading(true);
    // Fetch all approved events for now, filter by month client-side
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('state', 'approved')
      .order('event_date', { ascending: true });

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
  }, []);

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
      <Card key={event.id} className="group shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-base font-semibold text-purple-700 line-clamp-1">{event.event_name}</CardTitle>
          <CardDescription className="flex items-center text-gray-600 text-xs mt-1">
            <CalendarIcon className="mr-1 h-3 w-3 text-blue-500" />
            {dateDisplay}
            {event.event_time && (
              <>
                <Clock className="ml-2 mr-1 h-3 w-3 text-green-500" />
                {event.event_time}
              </>
            )}
          </CardDescription>
          {(event.place_name || event.full_address) && (
            <CardDescription className="flex items-center text-gray-600 text-xs mt-1">
              <MapPin className="mr-1 h-3 w-3 text-red-500" />
              {event.place_name || event.full_address}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-2">
          {event.description && (
            <p className="text-foreground text-sm line-clamp-2 mb-2">{event.description}</p>
          )}
          <div className="flex justify-end">
            <Link to={`/events/${event.id}`}>
              <Button variant="link" size="sm" className="p-0 h-auto text-blue-600 text-xs">View Details</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-6xl bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-foreground text-center flex-grow">Event Calendar</h1>
        <Link to="/submit-event">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
          </Button>
        </Link>
      </div>

      {/* Calendar Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
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
            <SelectTrigger className="w-[140px] focus-visible:ring-purple-500">
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
            <SelectTrigger className="w-[100px] focus-visible:ring-purple-500">
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
        <div className="grid grid-cols-7 gap-2 text-center">
          {daysOfWeek.map(day => (
            <div key={day} className="font-semibold text-gray-700 py-2">{day}</div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-32 border rounded-md p-2 flex flex-col items-center justify-center bg-gray-50">
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3 mt-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2 text-center">
          {daysOfWeek.map(day => (
            <div key={day} className="font-semibold text-gray-700 py-2">{day}</div>
          ))}
          {daysInMonthView.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            const displayEvents = dayEvents.slice(0, 2); // Show up to 2 events
            const moreEventsCount = dayEvents.length - displayEvents.length;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "h-40 border rounded-md p-2 flex flex-col overflow-hidden relative cursor-pointer transition-all duration-200 ease-in-out",
                  isCurrentMonth ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400",
                  isTodayDate && "border-2 border-purple-500 bg-purple-50 shadow-md",
                  dayEvents.length > 0 && isCurrentMonth && "border-blue-300 bg-blue-50 hover:bg-blue-100"
                )}
                onClick={() => openDayDetailDialog(day)}
              >
                <span className={cn(
                  "font-bold text-sm mb-1",
                  isTodayDate && "text-purple-700",
                  dayEvents.length > 0 && isCurrentMonth && "text-blue-700"
                )}>
                  {format(day, 'd')}
                </span>
                <div className="flex-grow overflow-hidden space-y-1">
                  {displayEvents.map(event => (
                    <Link to={`/events/${event.id}`} key={event.id} className="block">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "w-full text-left px-2 py-1 rounded-sm text-xs font-medium truncate",
                          isTodayDate ? "bg-purple-200 text-purple-800" : "bg-blue-200 text-blue-800"
                        )}
                      >
                        {event.event_time && <span className="mr-1">{event.event_time} - </span>}
                        {event.event_name}
                      </Badge>
                    </Link>
                  ))}
                  {moreEventsCount > 0 && (
                    <span className="text-xs text-gray-500 mt-1 block">
                      +{moreEventsCount} More
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day Detail Dialog */}
      <Dialog open={isDayDetailDialogOpen} onOpenChange={setIsDayDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Events on {selectedDayForDialog ? format(selectedDayForDialog, 'PPP') : ''}
            </DialogTitle>
            <DialogDescription>
              All events scheduled for this day.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedDayEvents.length === 0 ? (
              <p className="text-center text-gray-600">No events on this day.</p>
            ) : (
              <div className="space-y-4">
                {selectedDayEvents.map(event => (
                  <Card key={event.id} className="shadow-sm rounded-lg border border-gray-100">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xl font-semibold text-purple-700">{event.event_name}</CardTitle>
                      <CardDescription className="flex items-center text-gray-600 text-sm mt-1">
                        <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                        {event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBD'}
                        {event.end_date && event.event_date !== event.end_date && ` - ${format(new Date(event.end_date), 'PPP')}`}
                        {event.event_time && (
                          <>
                            <Clock className="ml-4 mr-2 h-4 w-4 text-green-500" />
                            {event.event_time}
                          </>
                        )}
                      </CardDescription>
                      {(event.place_name || event.full_address) && (
                        <CardDescription className="flex items-center text-gray-600 text-sm mt-1">
                          <MapPin className="mr-2 h-4 w-4 text-red-500" />
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
                          <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                          Price: {event.price}
                        </p>
                      )}
                      {event.ticket_link && (
                        <div className="flex items-center">
                          <LinkIcon className="mr-2 h-4 w-4 text-purple-600" />
                          <Button asChild variant="link" className="p-0 h-auto text-blue-600 text-sm">
                            <a href={event.ticket_link} target="_blank" rel="noopener noreferrer">
                              Ticket/Booking Link
                            </a>
                          </Button>
                        </div>
                      )}
                      {event.special_notes && (
                        <p className="flex items-start text-foreground text-sm">
                          <Info className="mr-2 h-4 w-4 text-orange-500 mt-1" />
                          Special Notes: {event.special_notes}
                        </p>
                      )}
                      {event.organizer_contact && (
                        <p className="flex items-center text-foreground text-sm">
                          <User className="mr-2 h-4 w-4 text-indigo-500" />
                          Organizer: {event.organizer_contact}
                        </p>
                      )}
                      {event.event_type && (
                        <p className="flex items-center text-foreground text-sm">
                          <Tag className="mr-2 h-4 w-4 text-pink-500" />
                          Type: {event.event_type}
                        </p>
                      )}
                      <div className="flex justify-end mt-2">
                        <Link to={`/events/${event.id}`}>
                          <Button size="sm" className="transition-all duration-300 ease-in-out transform hover:scale-105">View Details</Button>
                        </Link>
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
    </div>
  );
};

export default CalendarView;