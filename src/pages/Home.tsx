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
  startOfWeek,
  endOfWeek,
  parseISO,
  isPast,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, ArrowRight, CalendarIcon, Clock, MapPin, PlusCircle, Filter as FilterIcon, ChevronDown, Frown, List, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EventDetailDialog from '@/components/EventDetailDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import FilterOverlay from '@/components/FilterOverlay';
import { Calendar } from '@/components/ui/calendar';
import { DayContentProps } from 'react-day-picker';
import { Separator } from '@/components/ui/separator'; // Import Separator

// Corrected interface to use activeModifiers as provided by react-day-picker
interface CustomDayContentProps extends DayContentProps {
  // activeModifiers is already part of DayContentProps, but we can refine its type here if needed
  // For now, we'll just ensure we access it correctly.
  events: Event[]; // Add events prop to DayContentProps
}

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
  user_id?: string;
}

const Home = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [events, setEvents] = useState<Event[]>([]); // This will now hold ALL approved events
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
  const [selectedDayForAgendaList, setSelectedDayForAgendaList] = useState<Date>(new Date()); // New state for agenda list
  const [showAgendaList, setShowAgendaList] = useState(true); // New state to control agenda list visibility

  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Upcoming');

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isMonthPickerPopoverOpen, setIsMonthPickerPopoverOpen] = useState(false);

  const [isFilterOverlayOpen, setIsFilterOverlayOpen] = useState(false);

  const isMobile = useIsMobile();
  const calendarRef = useRef<HTMLDivElement>(null);

  const daysOfWeekFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysOfWeekShort = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su']; // Changed for unique keys

  const fetchEvents = async () => {
    setLoading(true);
    // Fetch ALL approved events for the calendar page.
    // Filtering for the list display will happen client-side.
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

  // Function to apply client-side filters to the full event list
  const getFilteredEvents = (allEvents: Event[]) => {
    let filtered = allEvents;

    const now = new Date();
    const todayFormatted = format(now, 'yyyy-MM-dd');

    switch (dateFilter) {
      case 'Today':
        filtered = filtered.filter(event => format(parseISO(event.event_date), 'yyyy-MM-dd') === todayFormatted);
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
        filtered = filtered.filter(event => format(parseISO(event.event_date), 'yyyy-MM-dd') < todayFormatted);
        break;
      case 'All Upcoming':
        filtered = filtered.filter(event => format(parseISO(event.event_date), 'yyyy-MM-dd') >= todayFormatted);
        break;
      case 'All Events':
      default:
        // No date filter applied
        break;
    }

    if (eventType !== 'All') {
      filtered = filtered.filter(event => event.event_type === eventType);
    }

    if (stateFilter !== 'All') {
      filtered = filtered.filter(event => event.state === stateFilter);
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

    return filtered;
  };


  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());
  const handlePrevWeek = () => setCurrentMonth(subWeeks(currentMonth, 1));
  const handleNextWeek = () => setCurrentMonth(addWeeks(currentMonth, 1));
  const handleMonthChange = (date: Date) => setCurrentMonth(date);

  const getEventsForDay = (day: Date) => {
    // This function now filters from the *full* `events` state
    return events
      .filter((event) => {
        const eventStartDate = parseISO(event.event_date);
        const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
        return isSameDay(eventStartDate, day) || (day >= eventStartDate && day <= eventEndDate);
      })
      .sort((a, b) => {
        const aIsMultiDay = a.end_date && !isSameDay(parseISO(a.event_date), parseISO(a.end_date));
        const bIsMultiDay = b.end_date && !isSameDay(parseISO(b.event_date), parseISO(b.end_date));
        if (aIsMultiDay && !bIsMultiDay) return -1;
        if (!aIsMultiDay && bIsMultiDay) return 1;
        const timeA = a.event_time || '';
        const timeB = b.event_time || '';
        if (timeA && timeB) return timeA.localeCompare(timeB);
        return a.event_name.localeCompare(b.event_name);
      });
  };

  const getEventsForMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return events
      .filter((event) => {
        const eventStartDate = parseISO(event.event_date);
        const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
        return eventStartDate <= monthEnd && eventEndDate >= monthStart;
      })
      .sort((a, b) => {
        const dateA = parseISO(a.event_date);
        const dateB = parseISO(b.event_date);
        if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
        const timeA = a.event_time || '';
        const timeB = b.event_time || '';
        if (timeA && timeB) return timeA.localeCompare(timeB);
        return a.event_name.localeCompare(b.event_name);
      });
  };

  const getEventsForWeek = (weekDays: Date[]) => {
    return events
      .filter((event) => {
        const eventStartDate = parseISO(event.event_date);
        const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
        return weekDays.some(
          (day) =>
            isSameDay(eventStartDate, day) ||
            isSameDay(eventEndDate, day) ||
            (day >= eventStartDate && day <= eventEndDate)
        );
      })
      .sort((a, b) => {
        const dateA = parseISO(a.event_date);
        const dateB = parseISO(b.event_date);
        if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
        const timeA = a.event_time || '';
        const timeB = b.event_time || '';
        if (timeA && timeB) return timeA.localeCompare(timeB);
        return a.event_name.localeCompare(b.event_name);
      });
  };

  const handleDayClick = (day: Date) => {
    console.log("handleDayClick called for day:", day);
    setSelectedDayForAgendaList(day);
    const eventsForClickedDay = getEventsForDay(day);
    setSelectedDayEvents(eventsForClickedDay);
    setShowAgendaList(true); // Show the agenda list
    console.log("handleDayClick: new selectedDayForAgendaList =", day);
    console.log("handleDayClick: new selectedDayEvents.length =", eventsForClickedDay.length);
    console.log("handleDayClick: new showAgendaList =", true);
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const handleApplyFilters = (filters: {
    searchTerm: string;
    eventType: string;
    state: string;
    dateFilter: string;
  }) => {
    setSearchTerm(filters.searchTerm);
    setEventType(filters.eventType);
    setStateFilter(filters.state);
    setDateFilter(filters.dateFilter);
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setEventType('All');
    setStateFilter('All');
    setDateFilter('All Upcoming');
  };

  const removeFilter = (filterType: 'search' | 'eventType' | 'state' | 'dateFilter') => {
    switch (filterType) {
      case 'search':
        setSearchTerm('');
        break;
      case 'eventType':
        setEventType('All');
        break;
      case 'state':
        setStateFilter('All');
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    fetchEvents(); // Fetch all events initially
  }, []); // Empty dependency array means it runs once on mount

  useEffect(() => {
    console.log("useEffect for selectedDayForAgendaList triggered.");
    if (selectedDayForAgendaList) {
      setSelectedDayEvents(getEventsForDay(selectedDayForAgendaList));
    } else {
      // This block should ideally not be hit if selectedDayForAgendaList is initialized
      setSelectedDayForAgendaList(new Date());
      setSelectedDayEvents(getEventsForDay(new Date()));
    }
    console.log("Current selectedDayForAgendaList in useEffect:", selectedDayForAgendaList);
    console.log("Current selectedDayEvents.length in useEffect:", selectedDayEvents.length);
  }, [events, selectedDayForAgendaList]); // Depend on 'events' to update when new data arrives

  useEffect(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentMonth, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 1 }) });
      setCurrentWeek(weekDays);
    } else {
      setCurrentWeek([]);
    }
  }, [currentMonth, viewMode]);

  const startOfCurrentMonth = startOfMonth(currentMonth);
  const endOfCurrentMonth = endOfMonth(currentMonth);
  const startDay = startOfWeek(startOfCurrentMonth, { weekStartsOn: 1 });
  const endDay = endOfWeek(endOfCurrentMonth, { weekStartsOn: 1 });
  const daysInMonthView = eachDayOfInterval({ start: startDay, end: endDay });

  // Apply filters to the events for the list display below the calendar
  const filteredEventsForDisplay = getFilteredEvents(events);

  const eventsForCurrentMonthDisplay = getEventsForMonth(currentMonth).filter(event => filteredEventsForDisplay.includes(event));
  const eventsForCurrentWeekDisplay = getEventsForWeek(currentWeek).filter(event => filteredEventsForDisplay.includes(event));

  const renderDayEventPill = (event: Event, day: Date) => {
    const eventStartDate = parseISO(event.event_date);
    const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
    const isMultiDay = !isSameDay(eventStartDate, eventEndDate);
    const isEventStartDay = isSameDay(day, eventStartDate);
    const isEventEndDay = isSameDay(day, eventEndDate);
    const isContinuationDay = isMultiDay && !isEventStartDay && !isEventEndDay;

    const basePillClasses = "py-1 px-2 text-xs font-medium whitespace-normal min-h-[1.5rem] mb-1";

    if (!isMultiDay) {
      return (
        <div
          key={event.id + format(day, 'yyyy-MM-dd')}
          className={cn(
            "relative z-10 w-full",
            basePillClasses,
            "bg-accent/20 text-foreground rounded-md"
          )}
        >
          <span className="flex flex-col text-left">
            {event.event_time && <span className="font-bold text-blue-700 dark:text-blue-300">{event.event_time}</span>}
            <span className="text-foreground">{event.event_name}</span>
          </span>
        </div>
      );
    }

    const trackClasses = cn("relative z-30 -mx-[1px] w-[calc(100%+2px)]");
    let rounding = "rounded-md";
    if (isEventStartDay && isEventEndDay) {
      rounding = "rounded-md";
    } else if (isEventStartDay) {
      rounding = "rounded-l-md rounded-r-none";
    } else if (isEventEndDay) {
      rounding = "rounded-r-md rounded-l-none";
    } else if (isContinuationDay) {
      rounding = "rounded-none";
    }

    return (
      <div key={event.id + format(day, 'yyyy-MM-dd')} className={trackClasses}>
        <div
          className={cn(
            basePillClasses,
            "bg-blue-600 text-white dark:bg-blue-800 dark:text-blue-100",
            rounding
          )}
        >
          {(isEventStartDay) && (
            <span className="flex flex-col text-left pl-1">
              {event.event_time && <span className="font-bold">{event.event_time}</span>}
              <span>{event.event_name}</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderAgendaEventItem = (event: Event) => {
    const formattedStartDate = event.event_date
      ? format(parseISO(event.event_date), 'PPP')
      : 'Date TBD';
    const formattedEndDate = event.end_date
      ? format(parseISO(event.end_date), 'PPP')
      : '';

    const dateDisplay =
      event.end_date && event.event_date !== event.end_date
        ? `${formattedStartDate} - ${formattedEndDate}`
        : formattedStartDate;

    return (
      <div key={event.id} className="py-3 px-3 cursor-pointer hover:bg-accent/50 rounded-lg transition-colors duration-200" onClick={() => handleViewDetails(event)}>
        {/* Event Name - Make it more prominent */}
        <p className="text-xl font-bold text-foreground leading-tight mb-1">
          {event.event_name}
        </p>

        {/* Date */}
        <div className="flex items-center text-muted-foreground text-sm mb-1">
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>{dateDisplay}</span>
        </div>

        {/* Time (Optional) */}
        {event.event_time && (
          <div className="flex items-center text-muted-foreground text-sm mb-1">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{event.event_time}</span>
          </div>
        )}

        {/* Location (Optional) */}
        {(event.place_name || event.full_address) && (
          <div className="flex items-center text-muted-foreground text-sm"> {/* No mb-1 here if it's the last item */}
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{event.place_name || event.full_address}</span>
          </div>
        )}
      </div>
    );
  };

  console.log("Home render: showAgendaList =", showAgendaList);
  console.log("Home render: selectedDayForAgendaList =", selectedDayForAgendaList);
  console.log("Home render: selectedDayEvents.length =", selectedDayEvents.length);


  return (
    <div className="w-full max-w-screen-lg bg-white p-4 rounded-xl shadow-lg border border-gray-200 dark:bg-card dark:border-border">
      <div className="flex flex-col gap-8">
        <div className="flex-grow">
          <div className="mb-6 text-center">
            <h1 className="text-5xl font-extrabold text-foreground mb-2">Community Events</h1>
            <p className="text-lg text-muted-foreground">Discover and connect with soulful events in your community.</p>
          </div>

          {isMobile ? (
            <div className="flex flex-col items-center w-full px-0">
              <div className="w-full flex justify-between items-center px-2 py-2 mb-2">
                <Popover open={isMonthPickerPopoverOpen} onOpenChange={setIsMonthPickerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="text-lg font-bold focus-visible:ring-primary">
                      {format(currentMonth, 'd/M/yyyy')} <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border">
                    <MonthYearPicker
                      date={currentMonth}
                      onDateChange={(date) => {
                        setCurrentMonth(date);
                        setIsMonthPickerPopoverOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" onClick={handleToday} className="transition-all duration-300 ease-in-out transform hover:scale-105">
                  <CalendarIcon className="h-6 w-6" />
                </Button>
              </div>

              <Calendar
                mode="single"
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                selected={selectedDayForAgendaList || new Date()} // Ensure a date is always selected for display
                onSelect={(date) => {
                  if (date) handleDayClick(date);
                }}
                modifiers={{
                  // Removed events modifier here, will calculate directly in Day component
                  past: (day) => isPast(day) && !isToday(day),
                  today: new Date(),
                }}
                modifiersClassNames={{
                  today: "rdp-day_today",
                  events: "rdp-day_has_events", // This class will still be used for styling if applied manually
                }}
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                  ),
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] flex items-center justify-center py-2",
                  row: "flex w-full mt-0",
                  cell: "h-14 flex-1 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-full w-full p-0 font-normal aria-selected:opacity-100 flex flex-col items-center justify-center"
                  ),
                  day_range_end: "day-range-end",
                  day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside:
                    "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                components={{
                  Caption: () => null,
                  Day: ({ date, activeModifiers, ...props }: DayContentProps) => {
                    const isPastDate = activeModifiers?.past === true;
                    const isTodayDate = isToday(date);
                    const isSelected = isSameDay(date, selectedDayForAgendaList || new Date());
                    // Directly calculate hasEvents using the 'events' state from Home component
                    const hasEvents = events.some(event => {
                      const eventStartDate = parseISO(event.event_date);
                      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
                      return date >= eventStartDate && date <= eventEndDate;
                    });

                    return (
                      <div
                        className={cn(
                          "relative flex flex-col items-center justify-center h-full w-full rounded-md text-foreground",
                          "hover:bg-accent hover:text-accent-foreground",
                          isPastDate && "opacity-70",
                          isTodayDate && "bg-primary/10 text-primary",
                          isSelected && !isTodayDate && "bg-accent/20 border-primary border-2",
                          hasEvents && "rdp-day_has_events", // Manually apply the class
                          "cursor-pointer"
                        )}
                        onClick={() => handleDayClick(date)}
                      >
                        <span className="font-bold text-lg">{format(date, 'd')}</span>
                        {hasEvents && (
                          <span className={cn(
                            "absolute bottom-2 w-2 h-2 rounded-full",
                            "left-1/2 -translate-x-1/2",
                            "bg-primary"
                          )} />
                        )}
                      </div>
                    );
                  },
                  Head: () => (
                    <thead>
                      <tr className="flex w-full">
                        {daysOfWeekShort.map((dayName, index) => (
                          <th
                            key={dayName + index} // Fixed: Use dayName + index for unique keys
                            scope="col"
                            className="text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] flex items-center justify-center py-2"
                            aria-label={daysOfWeekFull[index]}
                          >
                            {dayName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ),
                }}
                className="w-full border-none shadow-none"
                weekStartsOn={1}
              />
            </div>
          ) : (
            <div className="flex-grow">
              <div className="mb-8 p-5 bg-secondary rounded-xl shadow-lg border border-border flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                    <Button variant="ghost" size="icon" onClick={viewMode === 'month' ? handlePrevMonth : handlePrevWeek} className="transition-all duration-300 ease-in-out transform hover:scale-105">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Popover open={isMonthPickerPopoverOpen} onOpenChange={setIsMonthPickerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="w-[180px] justify-center text-lg font-bold focus-visible:ring-primary">
                          {viewMode === 'month' ? format(currentMonth, 'MMMM yyyy') : `${format(currentWeek[0], 'MMM d')} - ${format(currentWeek[6], 'MMM d, yyyy')}`}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border">
                        <MonthYearPicker
                          date={currentMonth}
                          onDateChange={(date) => {
                            setCurrentMonth(date);
                            setIsMonthPickerPopoverOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" onClick={viewMode === 'month' ? handleNextMonth : handleNextWeek} className="transition-all duration-300 ease-in-out transform hover:scale-105">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === 'month' ? 'default' : 'outline'}
                      onClick={() => setViewMode('month')}
                      className="transition-all duration-300 ease-in-out transform hover:scale-105"
                    >
                      Month
                    </Button>
                    <Button
                      variant={viewMode === 'week' ? 'default' : 'outline'}
                      onClick={() => {
                        setViewMode('week');
                        const start = startOfWeek(currentMonth, { weekStartsOn: 1 });
                        const weekDays = eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 1 }) });
                        setCurrentWeek(weekDays);
                      }}
                      className="transition-all duration-300 ease-in-out transform hover:scale-105"
                    >
                      Week
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4 border-t border-border">
                  <Button variant="outline" onClick={handleToday} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105">
                    Today
                  </Button>
                  <Button
                    onClick={() => setIsFilterOverlayOpen(true)}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105"
                  >
                    <FilterIcon className="mr-2 h-4 w-4" /> Filter Events
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-7 gap-px text-center border-t border-l border-border rounded-lg overflow-hidden">
                  {daysOfWeekShort.map((day, index) => (
                    <div key={day + index} className="font-semibold text-foreground py-2 border-r border-b border-border bg-secondary">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="h-28 sm:h-40 md:h-48 lg:h-56 border-r border-b border-border p-2 flex flex-col items-center justify-center bg-muted">
                      <Skeleton className="h-5 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-2/3 mt-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div ref={calendarRef} className="grid grid-cols-7 gap-px text-center border border-border rounded-lg overflow-visible">
                    {daysOfWeekShort.map((dayName, index) => (
                      <div
                        key={dayName + index} // Fixed: Use dayName + index for unique keys
                        className="font-semibold text-foreground text-xs py-1 sm:text-base sm:py-2 border-b border-r border-border bg-secondary"
                      >
                        {daysOfWeekShort[index]}
                      </div>
                    ))}
                    {viewMode === 'month' && daysInMonthView.map((day) => {
                          const dayEvents = getEventsForDay(day);
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isTodayDate = isToday(day);
                          const isSelected = selectedDayForAgendaList && isSameDay(day, selectedDayForAgendaList);
                          const isPastDate = isPast(day) && !isToday(day);

                          return (
                            <div
                              key={day.toISOString()}
                              className={cn(
                                "relative flex flex-col h-28 sm:h-40 md:h-48 lg:h-56 w-full cursor-pointer transition-colors duration-200 overflow-visible",
                                isCurrentMonth ? "bg-card" : "bg-secondary opacity-50",
                                isPastDate && "opacity-70",
                                isTodayDate && "bg-primary/10 text-primary",
                                isSelected && !isTodayDate && "bg-accent/20 border-primary border-2",
                              )}
                              onClick={() => handleDayClick(day)}
                            >
                              <span
                                className={cn(
                                  "absolute top-2 left-2 text-lg sm:text-xl font-bold transition-all duration-200",
                                  isTodayDate ? "text-primary" : isSelected && !isTodayDate ? "text-primary" : "text-foreground",
                                  isPastDate && "text-muted-foreground"
                                )}
                              >
                                {format(day, 'd')}
                              </span>
                              <div className="flex flex-col gap-0 mt-10 flex-grow overflow-visible">
                                {dayEvents.map((event) => renderDayEventPill(event, day))}
                              </div>
                            </div>
                          );
                        })}
                    {viewMode !== 'month' && currentWeek.map((day) => {
                          const dayEvents = getEventsForDay(day);
                          const isTodayDate = isToday(day);
                          const isSelected = selectedDayForAgendaList && isSameDay(day, selectedDayForAgendaList);
                          const isPastDate = isPast(day) && !isToday(day);

                          return (
                            <div
                              key={day.toISOString()}
                              className={cn(
                                "relative flex flex-col h-28 sm:h-40 md:h-48 lg:h-56 w-full cursor-pointer transition-colors duration-200 overflow-visible",
                                isPastDate && "opacity-70",
                                isTodayDate && "bg-primary/10 text-primary",
                                isSelected && !isTodayDate ? "bg-accent/20 border-primary border-2" : "bg-card"
                              )}
                              onClick={() => handleDayClick(day)}
                            >
                              <span
                                className={cn(
                                  "absolute top-2 left-2 text-lg sm:text-xl font-bold transition-all duration-200",
                                  isTodayDate ? "text-primary" : isSelected && !isTodayDate ? "text-primary" : "text-foreground",
                                  isPastDate && "text-muted-foreground"
                                )}
                              >
                                <span className="block text-xs sm:text-sm font-semibold">{format(day, 'EEE')}</span>
                                {format(day, 'd')}
                              </span>
                              <div className="flex flex-col gap-0 mt-10 flex-grow overflow-visible">
                                {dayEvents.map((event) => renderDayEventPill(event, day))}
                              </div>
                            </div>
                          );
                        })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Agenda List Section - Renders directly below the calendar */}
          {showAgendaList && selectedDayForAgendaList && (
            <div className="mt-8 p-6 bg-secondary rounded-xl shadow-lg border border-border dark:bg-card dark:border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-foreground">
                  Events on {format(selectedDayForAgendaList, 'EEEE, MMMM d')}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAgendaList(false)} className="transition-all duration-300 ease-in-out transform hover:scale-105">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <div className="p-8 bg-secondary rounded-lg border border-border text-center">
                  <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-semibold text-foreground mb-4">
                    No events found for this date.
                  </p>
                  <Link to="/submit-event">
                    <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add a New Event
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((event, index) => (
                    <React.Fragment key={event.id}>
                      {renderAgendaEventItem(event)}
                      {index < selectedDayEvents.length - 1 && <Separator className="my-2 dark:bg-border" />}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-2xl font-bold text-foreground mb-4 text-center">
              {viewMode === 'month'
                ? `Events in ${format(currentMonth, 'MMMM yyyy')}`
                : `Events for the Week of ${format(currentWeek[0], 'MMM d')}`}
            </h3>
            {(viewMode === 'month' ? eventsForCurrentMonthDisplay : eventsForCurrentWeekDisplay).length === 0 ? (
              <div className="p-8 bg-secondary rounded-lg border border-border text-center">
                <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground mb-4">
                  {viewMode === 'month' ? 'No events found for this month.' : 'No events found for this week.'}
                </p>
                <Link to="/submit-event">
                  <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add a New Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(viewMode === 'month' ? eventsForCurrentMonthDisplay : eventsForCurrentWeekDisplay).map((event) => (
                  <Card key={event.id} className="group flex flex-col justify-between shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200 overflow-hidden dark:bg-card dark:border-border">
                    {event.image_url && (
                      <div className="relative w-full h-32 overflow-hidden rounded-t-lg">
                        <img
                          src={event.image_url}
                          alt={`Image for ${event.event_name}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      </div>
                    )}
                    <CardHeader className="p-3 pb-0">
                      <CardTitle className="text-base font-semibold text-primary line-clamp-1 overflow-hidden text-ellipsis">{event.event_name}</CardTitle>
                      <CardDescription className="flex items-center text-muted-foreground text-xs mt-1">
                        <CalendarIcon className="mr-1 h-3 w-3 text-primary" />
                        {format(parseISO(event.event_date), 'PPP')}
                        {event.event_time && (
                          <>
                            <Clock className="ml-2 mr-1 h-3 w-3 text-primary" />
                            {event.event_time}
                          </>
                        )}
                      </CardDescription>
                      {(event.place_name || event.full_address) && (
                        <CardDescription className="flex items-center text-muted-foreground text-xs mt-1">
                          <MapPin className="mr-1 h-3 w-3 text-primary" />
                          {event.place_name || event.full_address}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="p-3 pt-2">
                      {event.description && <p className="text-foreground text-sm line-clamp-2 mb-2">{event.description}</p>}
                      <div className="flex justify-end">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-primary text-xs"
                          onClick={() => handleViewDetails(event)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <EventDetailDialog
        event={selectedEvent}
        isOpen={isEventDetailDialogOpen}
        onClose={() => setIsEventDetailDialogOpen(false)}
        cameFromCalendar={true}
      />

      <FilterOverlay
        isOpen={isFilterOverlayOpen}
        onClose={() => setIsFilterOverlayOpen(false)}
        currentFilters={{ searchTerm, eventType, state: stateFilter, dateFilter }}
        onApplyFilters={handleApplyFilters}
        onClearAllFilters={handleClearAllFilters}
      />
    </div>
  );
};

export default Home;