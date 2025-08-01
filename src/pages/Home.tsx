import React, { useState, useEffect, useRef } from 'react';
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
  addDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, CalendarIcon, MapPin, Clock, DollarSign, LinkIcon, Info, User, Tag, PlusCircle, Lightbulb, Menu, Filter, ChevronDown, Frown, List, Calendar as CalendarIcon2, ChevronLeft, ChevronRight, X, ChevronsLeft, ChevronsRight, CircleDot } from 'lucide-react'; // Added CircleDot
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
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
  const [selectedDayForDialog, setSelectedDayForDialog] = useState<Date | null>(new Date()); // Default to today
  const [selectedEventType, setSelectedEventType] = useState('All');
  const [showAgenda, setShowAgenda] = useState(false); // Changed to false to hide by default

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isMobileFilterSheetOpen, setIsMobileFilterSheetOpen] = useState(false);
  const [isMonthPickerPopoverOpen, setIsMonthPickerPopoverOpen] = useState(false); // New state for popover

  const isMobile = useIsMobile();
  const calendarRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // Update current week when currentMonth or viewMode changes
    if (viewMode === 'week') {
      const today = new Date();
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start, end: endOfWeek(today, { weekStartsOn: 1 }) });
      setCurrentWeek(weekDays);
    }
  }, [currentMonth, viewMode]);

  // Swipe gesture handlers for mobile
  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      handleNextMonth();
    } else if (direction === 'right') {
      handlePrevMonth();
    }
  };

  // Modified onTouchStart to accept native TouchEvent
  const onTouchStart = (e: TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Only handle horizontal swipes (limit vertical movement)
      if (Math.abs(deltaY) > Math.abs(deltaX) * 2) return;

      if (Math.abs(deltaX) > 50) {
        e.preventDefault();
        if (deltaX > 0) {
          handleSwipe('right');
        } else {
          handleSwipe('left');
        }
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  useEffect(() => {
    if (isMobile && calendarRef.current) {
      // Now, onTouchStart directly accepts a native TouchEvent
      calendarRef.current.addEventListener('touchstart', onTouchStart);
      return () => {
        if (calendarRef.current) {
          calendarRef.current.removeEventListener('touchstart', onTouchStart);
        }
      };
    }
  }, [isMobile]);

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

  const getEventsForWeek = (week: Date[]) => {
    return events.filter(event => {
      const eventStartDate = parseISO(event.event_date);
      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;

      // Check if the event's date range overlaps with any day in the week
      return week.some(day => {
        return isSameDay(eventStartDate, day) || isSameDay(eventEndDate, day) ||
               (day >= eventStartDate && day <= eventEndDate);
      });
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
  const eventsForCurrentWeek = getEventsForWeek(currentWeek);

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
                {/* Integrated MonthYearPicker for desktop */}
                <Popover open={isMonthPickerPopoverOpen} onOpenChange={setIsMonthPickerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-between focus-visible:ring-purple-500">
                      {format(currentMonth, 'MMMM yyyy')}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <MonthYearPicker
                      date={currentMonth}
                      onDateChange={(date) => {
                        setCurrentMonth(date);
                        setIsMonthPickerPopoverOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* View Toggle Buttons (Desktop) */}
          {!isMobile && (
            <div className="flex justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  onClick={() => setViewMode('month')}
                  className="transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                  <List className="mr-2 h-4 w-4" /> Month View
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  onClick={() => setViewMode('week')}
                  className="ml-2 transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                  <CalendarIcon2 className="mr-2 h-4 w-4" /> Week View
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAgenda(!showAgenda)}
                className="transition-all duration-300 ease-in-out transform hover:scale-105"
              >
                {showAgenda ? (
                  <>
                    <ChevronsLeft className="mr-2 h-4 w-4" /> Hide Agenda
                  </>
                ) : (
                  <>
                    <ChevronsRight className="mr-2 h-4 w-4" /> Show Agenda
                  </>
                )}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-7 gap-2 text-center p-2">
              {daysOfWeekFull.map(day => (
                <div key={day} className="font-semibold text-gray-700 py-2">{day}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-56 border rounded-lg p-2 flex flex-col items-center justify-center bg-gray-50">
                  <Skeleton className="h-5 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3 mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Mobile Calendar Header and Month Picker Popover */}
              {isMobile && (
                <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                  <Popover open={isMonthPickerPopoverOpen} onOpenChange={setIsMonthPickerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="text-lg font-semibold text-foreground flex items-center">
                        {format(currentMonth, 'MMMM yyyy')}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0"> {/* Adjusted width for 4x3 grid */}
                      <MonthYearPicker
                        date={currentMonth} // Changed prop name
                        onDateChange={(date) => { // Changed prop name
                          if (date) {
                            setCurrentMonth(date);
                            setIsMonthPickerPopoverOpen(false); // Close popover after selection
                          }
                        }}
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
                  </div>
                </div>
              )}

              {/* Calendar Grid (for both mobile and desktop) */}
              <div ref={calendarRef} className="grid grid-cols-7 gap-0.5 text-center p-0.5 bg-gray-100 rounded-lg shadow-inner"> {/* Changed rounded-md to rounded-lg */}
                {daysOfWeekShort.map((day, index) => (
                  <div key={daysOfWeekFull[index]} className="font-semibold text-gray-700 text-xs py-1">{day}</div>
                ))}
                {viewMode === 'month' ? (
                  daysInMonthView.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = isSameDay(day, selectedDayForDialog || new Date());
                    const isPastDate = isPast(day) && !isToday(day);

                    // For desktop, show event titles when agenda is hidden
                    const showEventTitles = !isMobile && !showAgenda && hasEvents;

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "relative flex flex-col h-56 w-full rounded-lg cursor-pointer transition-colors duration-200 border border-gray-200 shadow-sm", // Changed to rounded-lg, added shadow-sm
                          isCurrentMonth ? "bg-white" : "bg-gray-50",
                          isPastDate && "opacity-70",
                          isTodayDate && "bg-blue-600 text-white",
                          isSelected && !isTodayDate && "bg-blue-100 border-blue-500 border-2",
                          "hover:bg-gray-100"
                        )}
                        onClick={() => handleDayClick(day)}
                      >
                        <span className={cn(
                          "absolute top-2 left-2 text-xl font-bold", // Changed to text-xl
                          isTodayDate ? "text-white" : (isSelected && !isTodayDate ? "text-blue-800" : "text-gray-800"),
                          isPastDate && "text-gray-500"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {hasEvents && (
                          <div className="flex flex-col w-full mt-10 px-1.5 overflow-y-auto scrollbar-hide"> {/* Changed px-2 to px-1.5 */}
                            {dayEvents.map((event) => (
                              <div key={event.id} className={cn(
                                "flex items-center text-xs leading-tight font-medium text-left px-1.5 py-0.5 rounded-sm mb-1", // Changed text-sm to text-xs, px-1 to px-1.5
                                isTodayDate ? "bg-white/20 text-white" : (isSelected && !isTodayDate ? "bg-blue-200 text-blue-900" : "bg-purple-100 text-purple-800"),
                                "line-clamp-2" // Changed to line-clamp-2
                              )}>
                                <CircleDot className="h-2.5 w-2.5 mr-1 flex-shrink-0" /> {/* Small dot icon */}
                                {event.event_name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Week View (Desktop)
                  currentWeek.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isTodayDate = isToday(day);
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = isSameDay(day, selectedDayForDialog || new Date());
                    const isPastDate = isPast(day) && !isToday(day);

                    // For desktop, show event titles when agenda is hidden
                    const showEventTitles = !isMobile && !showAgenda && hasEvents;

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "relative flex flex-col h-56 w-full rounded-lg cursor-pointer transition-colors duration-200 border border-gray-200 shadow-sm", // Changed to rounded-lg, added shadow-sm
                          isPastDate && "opacity-70",
                          isTodayDate && "bg-blue-600 text-white",
                          isSelected && !isTodayDate && "bg-blue-100 border-blue-500 border-2",
                          "hover:bg-gray-100"
                        )}
                        onClick={() => handleDayClick(day)}
                      >
                        <span className={cn(
                          "absolute top-2 left-2 text-xl font-bold", // Changed to text-xl
                          isTodayDate ? "text-white" : (isSelected && !isTodayDate ? "text-blue-800" : "text-gray-800"),
                          isPastDate && "text-gray-500"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {hasEvents && (
                          <div className="flex flex-col w-full mt-10 px-1.5 overflow-y-auto scrollbar-hide"> {/* Changed px-2 to px-1.5 */}
                            {dayEvents.map((event, index) => (
                              <div key={event.id} className={cn(
                                "flex items-center text-xs leading-tight font-medium text-left px-1.5 py-0.5 rounded-sm mb-1", // Changed text-sm to text-xs, px-1 to px-1.5
                                isTodayDate ? "bg-white/20 text-white" : (isSelected && !isTodayDate ? "bg-blue-200 text-blue-900" : "bg-purple-100 text-purple-800"),
                                "line-clamp-2" // Changed to line-clamp-2
                              )}>
                                <CircleDot className="h-2.5 w-2.5 mr-1 flex-shrink-0" /> {/* Small dot icon */}
                                {event.event_name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Events for Selected Month/Week (Mobile/Desktop) */}
              <div className="mt-6">
                <h3 className="text-2xl font-bold text-foreground mb-4 text-center">
                  {viewMode === 'month'
                    ? `Events in ${format(currentMonth, 'MMMM yyyy')}`
                    : `Events for the Week of ${format(currentWeek[0], 'MMM d')}`}
                </h3>
                {(viewMode === 'month' ? eventsForCurrentMonth : eventsForCurrentWeek).length === 0 ? (
                  <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <Frown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-700 mb-4">
                      {viewMode === 'month'
                        ? 'No events found for this month.'
                        : 'No events found for this week.'}
                    </p>
                    <Link to="/submit-event">
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add a New Event
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(viewMode === 'month' ? eventsForCurrentMonth : eventsForCurrentWeek).map((event) => renderEventCard(event))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Agenda Sidebar (Desktop) - Toggleable */}
        {!isMobile && showAgenda && (
          <div className="w-80 bg-gray-50 p-6 rounded-xl shadow-lg border border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-foreground">Agenda</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAgenda(false)}
                className="transition-all duration-300 ease-in-out transform hover:scale-105"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Hide Agenda</span>
              </Button>
            </div>
            <div className="space-y-4">
              {selectedDayEvents.map((event) => (
                <Card key={event.id} className="shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-base font-semibold text-purple-700 line-clamp-1">{event.event_name}</CardTitle>
                    <CardDescription className="flex items-center text-gray-600 text-xs mt-1">
                      <CalendarIcon className="mr-1 h-3 w-3 text-blue-500" />
                      {format(new Date(event.event_date), 'PPP')}
                      {event.event_time && (
                        <>
                          <Clock className="ml-2 mr-1 h-3 w-3 text-green-500" />
                          {event.event_time}
                        </>
                      )}
                    </CardDescription>
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
              ))}
            </div>
          </div>
        )}
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