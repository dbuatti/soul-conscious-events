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
  isPast,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, CalendarIcon, MapPin, Clock, DollarSign, LinkIcon, Info, User, Tag, PlusCircle, Lightbulb, Menu, Filter, ChevronDown, Frown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EventDetailDialog from '@/components/EventDetailDialog';
import EventSidebar from '@/components/EventSidebar';
import { eventTypes } from '@/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar'; // Keep this for the full calendar dialog
import { MonthYearPicker } from '@/components/MonthYearPicker'; // New import for month picker

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

const Home = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
  const [selectedDayForDialog, setSelectedDayForDialog] = useState<Date | null>(new Date()); // Default to today
  const [selectedEventType, setSelectedEventType] = useState('All');

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isMobileFilterSheetOpen, setIsMobileFilterSheetOpen] = useState(false);
  const [isFullCalendarDialogOpen, setIsFullCalendarDialogOpen] = useState(false);

  const isMobile = useIsMobile();

  const daysOfWeekFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysOfWeekShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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
  }, [selectedEventType]);

  useEffect(() => {
    // When events load or filter changes, update selected day events if a day is already selected
    if (!isMobile) { // Only for desktop view
      if (selectedDayForDialog) {
        setSelectedDayEvents(getEventsForDay(selectedDayForDialog));
      } else {
        setSelectedDayEvents(getEventsForDay(new Date()));
      }
    }
    // For mobile, the list will use eventsForCurrentMonth directly
  }, [events, selectedDayForDialog, isMobile]);


  const startOfCurrentMonth = startOfMonth(currentMonth);
  const endOfCurrentMonth = endOfMonth(currentMonth);

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

  const years = Array.from({ length: 10 }, (_, i) => getYear(new Date()) - 5 + i);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStartDate = parseISO(event.event_date);
      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
      return (isSameDay(eventStartDate, day) || (day >= eventStartDate && day <= eventEndDate));
    }).sort((a, b) => {
      const timeA = a.event_time || '';
      const timeB = b.event_time || '';
      if (timeA && timeB) return timeA.localeCompare(timeB);
      return a.event_name.localeCompare(b.event_name);
    });
  };

  const getEventsForMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    return events.filter(event => {
      const eventStartDate = parseISO(event.event_date);
      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;

      // Check if the event's date range overlaps with the current month's range
      return (
        (eventStartDate <= monthEnd && eventEndDate >= monthStart)
      );
    }).sort((a, b) => {
      const dateA = parseISO(a.event_date);
      const dateB = parseISO(b.event_date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      const timeA = a.event_time || '';
      const timeB = b.event_time || '';
      if (timeA && timeB) return timeA.localeCompare(timeB);
      return a.event_name.localeCompare(b.event_name);
    });
  };

  const eventsForCurrentMonth = getEventsForMonth(currentMonth);

  const handleDayClick = (day: Date) => {
    setSelectedDayForDialog(day);
    // For desktop, this will update the list. For mobile, the list is month-centric.
    if (!isMobile) {
      setSelectedDayEvents(getEventsForDay(day));
    }
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
      <Card key={event.id} className="group shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
        {event.image_url && (
          <div className="relative w-full h-32 overflow-hidden rounded-t-lg">
            <img
              src={event.image_url}
              alt={`Image for ${event.event_name}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
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
            <Button variant="link" size="sm" className="p-0 h-auto text-blue-600 text-xs" onClick={() => handleViewDetails(event)}>View Details</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  console.log('Home.tsx: Rendering MonthYearPicker. isMobile:', isMobile, 'currentMonth:', currentMonth);

  return (
    <div className="w-full max-w-7xl bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar for Desktop */}
        {!isMobile && (
          <EventSidebar selectedEventType={selectedEventType} onSelectEventType={setSelectedEventType} />
        )}

        {/* Main Calendar Content */}
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-foreground mb-4 text-center">Event Calendar</h1>
            <Link to="/submit-event" className="hidden lg:block"> {/* Hide on mobile */}
              <Button className="bg-purple-600 hover:bg-purple-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
              </Button>
            </Link>
          </div>

          {/* Calendar Navigation (Desktop) */}
          {!isMobile && (
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg border border-purple-200">
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
          )}

          {loading ? (
            <div className="grid grid-cols-7 gap-2 text-center p-2">
              {daysOfWeekFull.map(day => (
                <div key={day} className="font-semibold text-gray-700 py-2">{day}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-48 border rounded-md p-2 flex flex-col items-center justify-center bg-gray-50">
                  <Skeleton className="h-5 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3 mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {isMobile ? (
                <>
                  {/* Mobile Calendar Header */}
                  <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="text-lg font-semibold text-foreground flex items-center">
                          {format(currentMonth, 'MMMM yyyy')} {/* Display current month/year */}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <MonthYearPicker // Use the new component here
                          onSelect={(date: Date | undefined) => {
                            if (date) {
                              setCurrentMonth(date);
                            }
                          }}
                          defaultMonth={currentMonth}
                        />
                      </PopoverContent>
                    </Popover>

                    <div className="flex items-center space-x-2">
                      <Sheet open={isMobileFilterSheetOpen} onOpenChange={setIsMobileFilterSheetOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                            <Filter className="h-4 w-4" />
                            <span className="sr-only">Filter Events</span>
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[250px] sm:w-[300px] p-6">
                          <EventSidebar selectedEventType={selectedEventType} onSelectEventType={(type) => { setSelectedEventType(type); setIsMobileFilterSheetOpen(false); }} />
                        </SheetContent>
                      </Sheet>
                      <Dialog open={isFullCalendarDialogOpen} onOpenChange={setIsFullCalendarDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                            <CalendarIcon className="h-4 w-4" />
                            <span className="sr-only">Full Calendar</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                          <DialogHeader>
                            <DialogTitle>Select Month</DialogTitle> {/* Changed title */}
                            <DialogDescription>
                              Choose a specific month from the calendar. {/* Changed description */}
                            </DialogDescription>
                          </DialogHeader>
                          <MonthYearPicker // Replaced Calendar with MonthYearPicker
                            onSelect={(date) => {
                              if (date) {
                                setCurrentMonth(date); // Update current month
                                // No need to update selectedDayForDialog as it's a month picker
                                setIsFullCalendarDialogOpen(false);
                              }
                            }}
                            defaultMonth={currentMonth}
                          />
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button" variant="secondary">Close</Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Mobile Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center p-1 bg-gray-100 rounded-lg shadow-inner">
                    {daysOfWeekShort.map((day, index) => (
                      <div key={daysOfWeekFull[index]} className="font-semibold text-gray-700 text-xs py-2">{day}</div>
                    ))}
                    {daysInMonthView.map((day) => {
                      const dayEvents = getEventsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isTodayDate = isToday(day);
                      const hasEvents = dayEvents.length > 0;
                      const isSelected = isSameDay(day, selectedDayForDialog || new Date());
                      const isPastDate = isPast(day) && !isToday(day);

                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "relative flex flex-col items-center justify-center h-16 w-full rounded-md cursor-pointer transition-colors duration-200",
                            isCurrentMonth ? "text-gray-800" : "text-gray-400 opacity-50",
                            isPastDate && "text-gray-400 opacity-50", // Faded for past dates
                            isTodayDate && "bg-blue-500 text-white font-bold", // Highlight today
                            isSelected && !isTodayDate && "bg-blue-100 text-blue-800 font-semibold", // Selected but not today
                            hasEvents && "relative", // For the dot
                            "hover:bg-gray-200" // General hover effect
                          )}
                          onClick={() => handleDayClick(day)}
                        >
                          <span className={cn(
                            "text-sm",
                            isTodayDate && "text-white",
                            isSelected && !isTodayDate && "text-blue-800"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {hasEvents && (
                            <div className={cn(
                              "absolute bottom-1 w-1.5 h-1.5 rounded-full",
                              isTodayDate ? "bg-white" : "bg-blue-500", // White dot for today, blue for others
                              isPastDate && "bg-gray-400" // Grey dot for past dates
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Events for Selected Month (Mobile) */}
                  <div className="mt-6">
                    <h3 className="text-2xl font-bold text-foreground mb-4 text-center">
                      Events in {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    {eventsForCurrentMonth.length === 0 ? (
                      <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <Frown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-gray-700 mb-4">No events found for this month.</p>
                        <Link to="/submit-event">
                          <Button className="bg-purple-600 hover:bg-purple-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add a New Event
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {eventsForCurrentMonth.map((event) => renderEventCard(event))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Desktop Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 text-center p-2">
                    {daysOfWeekFull.map(day => (
                      <div key={day} className="font-semibold text-gray-700 py-2">{day}</div>
                    ))}
                    {daysInMonthView.map((day) => {
                      const dayEvents = getEventsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isTodayDate = isToday(day);
                      const displayEvents = dayEvents.slice(0, 2);

                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "group h-48 border rounded-md p-1 flex flex-col relative cursor-pointer transition-all duration-300 ease-in-out",
                            isCurrentMonth ? "bg-white shadow-sm hover:bg-gray-50 hover:shadow-md" : "bg-gray-100 text-gray-400",
                            isTodayDate && "border-2 border-purple-600 bg-purple-100 shadow-lg",
                            dayEvents.length > 0 && isCurrentMonth && "border-blue-400 bg-blue-100 hover:bg-blue-200 shadow-md"
                          )}
                          onClick={() => handleDayClick(day)}
                        >
                          <span className={cn(
                            "font-bold text-base mb-1",
                            isTodayDate && "text-purple-700",
                            dayEvents.length > 0 && isCurrentMonth && "text-blue-700"
                          )}>
                            {format(day, 'd')}
                          </span>
                          <div className="flex-grow overflow-hidden space-y-1">
                            {displayEvents.map(event => (
                              <Badge
                                key={event.id}
                                className={cn(
                                  "w-full text-left px-2 py-1 rounded-md font-medium cursor-pointer h-auto flex flex-col items-start whitespace-normal shadow-xs",
                                  isTodayDate ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-blue-600 text-white hover:bg-blue-700"
                                )}
                                onClick={(e) => { e.stopPropagation(); handleViewDetails(event); }}
                              >
                                {event.event_time && <span className="text-xs text-gray-200">{event.event_time}</span>}
                                <span className="text-xs font-semibold leading-snug">{event.event_name}</span>
                              </Badge>
                            ))}
                            {dayEvents.length > 2 && (
                              <span className="text-xs text-gray-500 mt-1 block font-semibold">
                                +{dayEvents.length - 2} More
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Event Detail Dialog (for individual event details) */}
      <EventDetailDialog
        event={selectedEvent}
        isOpen={isEventDetailDialogOpen}
        onClose={() => setIsEventDetailDialogOpen(false)}
        cameFromCalendar={true}
      />
    </div>
  );
};

export default Home;