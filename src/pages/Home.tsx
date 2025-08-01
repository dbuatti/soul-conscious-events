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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, ArrowRight, CalendarIcon, MapPin, Clock, DollarSign, LinkIcon, Info, User, Tag, PlusCircle, Lightbulb, Filter as FilterIcon, ChevronDown, Frown, List, Calendar as CalendarIcon2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EventDetailDialog from '@/components/EventDetailDialog';
import { eventTypes, australianStates } from '@/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import FilterOverlay from '@/components/FilterOverlay';
import AgendaOverlay from '@/components/AgendaOverlay';

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
  // State declarations
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
  const [selectedDayForDialog, setSelectedDayForDialog] = useState<Date | null>(new Date());
  
  // Filter states for FilterOverlay
  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Upcoming');

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isMonthPickerPopoverOpen, setIsMonthPickerPopoverOpen] = useState(false);

  // Overlay states
  const [isFilterOverlayOpen, setIsFilterOverlayOpen] = useState(false);
  const [isAgendaOverlayOpen, setIsAgendaOverlayOpen] = useState(false);

  const isMobile = useIsMobile();
  const calendarRef = useRef<HTMLDivElement>(null);

  const daysOfWeekFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysOfWeekShort = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // Helper functions
  const fetchEvents = async () => {
    setLoading(true);
    let query = supabase
      .from('events')
      .select('*')
      .eq('state', 'approved')
      .order('event_date', { ascending: true });

    const now = new Date();
    const todayFormatted = format(now, 'yyyy-MM-dd');

    switch (dateFilter) {
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

      if (eventType !== 'All') {
        query = query.eq('event_type', eventType);
      }

      if (stateFilter !== 'All') {
        query = query.eq('state', stateFilter);
      }

      if (searchTerm) {
        query = query.or(
          `event_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,organizer_contact.ilike.%${searchTerm}%,full_address.ilike.%${searchTerm}%,place_name.ilike.%${searchTerm}%`
        );
      }

      if (dateFilter !== 'Past Events') {
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

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handlePrevWeek = () => {
    setCurrentMonth(subWeeks(currentMonth, 1));
  };

  const handleNextWeek = () => {
    setCurrentMonth(addWeeks(currentMonth, 1));
  };

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStartDate = parseISO(event.event_date);
      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
      return (isSameDay(eventStartDate, day) || (day >= eventStartDate && day <= eventEndDate));
    }).sort((a, b) => {
      const aIsMultiDay = a.end_date && !isSameDay(parseISO(a.event_date), parseISO(a.end_date));
      const bIsMultiDay = b.end_date && !isSameDay(parseISO(b.event_date), parseISO(b.end_date));

      // Prioritize multi-day events (true comes before false)
      if (aIsMultiDay && !bIsMultiDay) return -1;
      if (!aIsMultiDay && bIsMultiDay) return 1;

      // If both are multi-day or both are single-day, sort by time then name
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

  const getEventsForWeek = (weekDays: Date[]) => {
    return events.filter(event => {
      const eventStartDate = parseISO(event.event_date);
      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;

      return weekDays.some(day => {
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

  const handleDayClick = (day: Date) => {
    setSelectedDayForDialog(day);
    setSelectedDayEvents(getEventsForDay(day));
    setIsAgendaOverlayOpen(true);
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

  const hasActiveFilters =
    searchTerm !== '' ||
    eventType !== 'All' ||
    stateFilter !== 'All' ||
    dateFilter !== 'All Upcoming';

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
            {dateDisplay}
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

  // Effects
  useEffect(() => {
    fetchEvents();
  }, [searchTerm, eventType, stateFilter, dateFilter]);

  useEffect(() => {
    if (selectedDayForDialog) {
      setSelectedDayEvents(getEventsForDay(selectedDayForDialog));
    } else {
      setSelectedDayEvents(getEventsForDay(new Date()));
    }
  }, [events, selectedDayForDialog]);

  useEffect(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentMonth, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 1 }) });
      setCurrentWeek(weekDays);
    } else {
      setCurrentWeek([]);
    }
  }, [currentMonth, viewMode]);

  // Swipe gesture handlers for mobile
  const handleSwipe = (direction: 'left' | 'right') => {
    if (!isMobile) return; // Only enable swipe on mobile
    if (direction === 'left') {
      if (viewMode === 'month') {
        handleNextMonth();
      } else {
        handleNextWeek();
      }
    } else if (direction === 'right') {
      if (viewMode === 'month') {
        handlePrevMonth();
      } else {
        handlePrevWeek();
      }
    }
  };

  const onTouchStart = (e: TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Prevent vertical scrolling from triggering horizontal swipe
      if (Math.abs(deltaY) > Math.abs(deltaX) * 2) return;

      if (Math.abs(deltaX) > 50) { // Threshold for horizontal swipe
        e.preventDefault(); // Prevent default scroll behavior
        if (deltaX > 0) {
          handleSwipe('right');
        } else {
          handleSwipe('left');
        }
        // Remove listeners after a successful swipe to prevent multiple triggers
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
      calendarRef.current.addEventListener('touchstart', onTouchStart as EventListener);
      return () => {
        if (calendarRef.current) {
          calendarRef.current.removeEventListener('touchstart', onTouchStart as EventListener);
        }
      };
    }
  }, [isMobile, viewMode]); // Re-attach listener if viewMode changes

  const startOfCurrentMonth = startOfMonth(currentMonth);
  const endOfCurrentMonth = endOfMonth(currentMonth);

  const startDay = startOfWeek(startOfCurrentMonth, { weekStartsOn: 1 });
  const endDay = endOfWeek(endOfCurrentMonth, { weekStartsOn: 1 });

  const daysInMonthView = eachDayOfInterval({ start: startDay, end: endDay });

  const eventsForCurrentMonth = getEventsForMonth(currentMonth);
  const eventsForCurrentWeek = getEventsForWeek(currentWeek);

  return (
    <div className="w-full max-w-screen-lg bg-white p-8 rounded-xl shadow-lg border border-gray-200 dark:bg-card dark:border-border">
      <div className="flex flex-col gap-8">
        {/* Main Calendar Content */}
        <div className="flex-grow">
          {/* New Header Section */}
          <div className="mb-6 text-center">
            <h1 className="text-5xl font-extrabold text-foreground mb-2">Community Events</h1>
            <p className="text-lg text-muted-foreground">Discover and connect with soulful events in your community.</p>
          </div>

          {/* Consolidated Controls Section */}
          <div className="mb-8 p-5 bg-secondary rounded-xl shadow-lg border border-border flex flex-col gap-4">
            {/* Top row: Date Navigation & View Mode Toggle */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Date Navigation */}
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

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  onClick={() => setViewMode('month')}
                  className="transition-all duration-300 ease-in-out transform hover:scale-105 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                  className="transition-all duration-300 ease-in-out transform hover:scale-105 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  Week
                </Button>
              </div>
            </div>

            {/* Bottom row: Quick Actions (Today, Filter, Agenda) */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border">
              {/* "Today" Button */}
              <Button variant="outline" onClick={handleToday} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105">
                Today
              </Button>

              {/* Filter and Agenda Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button
                  onClick={() => setIsFilterOverlayOpen(true)}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                  <FilterIcon className="mr-2 h-4 w-4" /> Filter Events
                </Button>
                <Button
                  onClick={() => setIsAgendaOverlayOpen(true)}
                  className="w-full sm:w-auto bg-accent hover:bg-accent/80 text-accent-foreground transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                  <List className="mr-2 h-4 w-4" /> View Agenda
                </Button>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-1 sm:gap-2 items-center">
                <span className="text-xs sm:text-sm font-medium text-foreground">Active Filters:</span>
                {searchTerm !== '' && (
                  <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">
                    Search: "{searchTerm}"
                    <Button variant="ghost" size="sm" className="h-3 w-3 p-0 text-foreground hover:bg-accent/80 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('search')}>
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                )}
                {eventType !== 'All' && (
                  <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">
                    Type: {eventType}
                    <Button variant="ghost" size="sm" className="h-3 w-3 p-0 text-foreground hover:bg-accent/80 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('eventType')}>
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                )}
                {stateFilter !== 'All' && (
                  <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">
                    State: {stateFilter}
                    <Button variant="ghost" size="sm" className="h-3 w-3 p-0 text-foreground hover:bg-accent/80 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('state')}>
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                )}
                {dateFilter !== 'All Upcoming' && (
                  <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">
                    Date: {dateFilter}
                    <Button variant="ghost" size="sm" className="h-3 w-3 p-0 text-foreground hover:bg-accent/80 transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => removeFilter('dateFilter')}>
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                )}
                {hasActiveFilters && (
                  <Button variant="outline" onClick={handleClearAllFilters} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base mt-2 sm:mt-0">
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-px text-center border-t border-l border-border rounded-lg overflow-hidden">
              {daysOfWeekShort.map(day => (
                <div key={day} className="font-semibold text-foreground py-2 border-r border-b border-border bg-secondary">{day}</div>
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
              {/* Calendar Grid (for both mobile and desktop) */}
              <div ref={calendarRef} className="grid grid-cols-7 gap-px text-center border border-border rounded-lg overflow-hidden">
                {daysOfWeekShort.map((day, index) => (
                  <div key={daysOfWeekFull[index]} className="font-semibold text-foreground text-xs py-1 sm:text-base sm:py-2 border-b border-r border-border bg-secondary">{daysOfWeekShort[index]}</div>
                ))}
                {viewMode === 'month' ? (
                  daysInMonthView.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, selectedDayForDialog || new Date());
                    const isPastDate = isPast(day) && !isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "relative flex flex-col h-28 sm:h-40 md:h-48 lg:h-56 w-full cursor-pointer transition-colors duration-200",
                          isCurrentMonth ? "bg-card" : "bg-secondary opacity-50",
                          isPastDate && "opacity-70",
                          isTodayDate && "bg-primary/10 text-primary",
                          isSelected && !isTodayDate && "bg-accent/20 border-primary border-2",
                        )}
                        onClick={() => handleDayClick(day)}
                      >
                        <span className={cn(
                          "absolute top-2 left-2 text-lg sm:text-xl font-bold transition-all duration-200 group-hover:scale-105",
                          isTodayDate ? "text-primary" : (isSelected && !isTodayDate ? "text-primary" : "text-foreground"),
                          isPastDate && "text-muted-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>
                        <div className="flex flex-col gap-0 mt-10 flex-grow overflow-y-auto scrollbar-hide">
                          {dayEvents.map(event => {
                            const eventStartDate = parseISO(event.event_date);
                            const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
                            const isMultiDay = !isSameDay(eventStartDate, eventEndDate);
                            const isEventStartDay = isSameDay(day, eventStartDate);
                            const isEventEndDay = isSameDay(day, eventEndDate);
                            const isContinuationDay = isMultiDay && !isEventStartDay && !isEventEndDay;

                            // Determine rounding classes and width/margin for multi-day events
                            let roundingClasses = "";
                            let widthAndMarginClasses = "w-full"; // Default for single-day or end of multi-day
                            if (isMultiDay) {
                              if (isEventStartDay) {
                                roundingClasses = "rounded-l-md rounded-r-none";
                                widthAndMarginClasses = "w-[calc(100%+1px)] mr-[-1px]"; // Extend to cover the right gap
                              } else if (isEventEndDay) {
                                roundingClasses = "rounded-r-md rounded-l-none";
                                widthAndMarginClasses = "w-[calc(100%+1px)] ml-[-1px]"; // Extend to cover the left gap
                              } else if (isContinuationDay) {
                                roundingClasses = "rounded-none";
                                widthAndMarginClasses = "w-[calc(100%+2px)] ml-[-1px] mr-[-1px]"; // Extend to cover both left and right gaps
                              }
                            } else { // Single day event
                              roundingClasses = "rounded-md";
                              widthAndMarginClasses = "w-full"; // Single day event fits within its cell
                            }

                            return (
                              <div
                                key={event.id + format(day, 'yyyy-MM-dd')} // Unique key for event on specific day
                                className={cn(
                                  "py-1 px-1 text-xs font-medium whitespace-normal relative z-10", // Removed mb-0.5
                                  "min-h-[1.5rem]", // Ensure a minimum height for all pills
                                  isMultiDay ? "bg-blue-600 text-white dark:bg-blue-800 dark:text-blue-100" : "bg-accent/20 text-foreground",
                                  roundingClasses, // Apply calculated rounding
                                  widthAndMarginClasses // Apply calculated width and margin
                                )}
                              >
                                {isEventStartDay || !isMultiDay ? (
                                  <span className="flex flex-col text-left pl-1">
                                    {event.event_time && <span className="font-bold">{event.event_time}</span>}
                                    <span>{event.event_name}</span>
                                  </span>
                                ) : (
                                  null
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Week View
                  currentWeek.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, selectedDayForDialog || new Date());
                    const isPastDate = isPast(day) && !isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "relative flex flex-col h-28 sm:h-40 md:h-48 lg:h-56 w-full cursor-pointer transition-colors duration-200",
                          isPastDate && "opacity-70",
                          isTodayDate && "bg-primary/10 text-primary",
                          isSelected && !isTodayDate ? "bg-accent/20 border-primary border-2" : "bg-card",
                        )}
                        onClick={() => handleDayClick(day)}
                      >
                        <span className={cn(
                          "absolute top-2 left-2 text-lg sm:text-xl font-bold transition-all duration-200 group-hover:scale-105",
                          isTodayDate ? "text-primary" : (isSelected && !isTodayDate ? "text-primary" : "text-foreground"),
                          isPastDate && "text-muted-foreground"
                        )}>
                          <span className="block text-xs sm:text-sm font-semibold">{format(day, 'EEE')}</span>
                          {format(day, 'd')}
                        </span>
                        <div className="flex flex-col gap-0 mt-10 flex-grow overflow-y-auto scrollbar-hide">
                          {dayEvents.map(event => {
                            const eventStartDate = parseISO(event.event_date);
                            const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
                            const isMultiDay = !isSameDay(eventStartDate, eventEndDate);
                            const isEventStartDay = isSameDay(day, eventStartDate);
                            const isEventEndDay = isSameDay(day, eventEndDate);
                            const isContinuationDay = isMultiDay && !isEventStartDay && !isEventEndDay;

                            // Determine rounding classes and width/margin for multi-day events
                            let roundingClasses = "";
                            let widthAndMarginClasses = "w-full"; // Default for single-day or end of multi-day
                            if (isMultiDay) {
                              if (isEventStartDay) {
                                roundingClasses = "rounded-l-md rounded-r-none";
                                widthAndMarginClasses = "w-[calc(100%+1px)] mr-[-1px]"; // Extend to cover the right gap
                              } else if (isEventEndDay) {
                                roundingClasses = "rounded-r-md rounded-l-none";
                                widthAndMarginClasses = "w-[calc(100%+1px)] ml-[-1px]"; // Extend to cover the left gap
                              } else if (isContinuationDay) {
                                roundingClasses = "rounded-none";
                                widthAndMarginClasses = "w-[calc(100%+2px)] ml-[-1px] mr-[-1px]"; // Extend to cover both left and right gaps
                              }
                            } else { // Single day event
                              roundingClasses = "rounded-md";
                              widthAndMarginClasses = "w-full"; // Single day event fits within its cell
                            }

                            return (
                              <div
                                key={event.id + format(day, 'yyyy-MM-dd')} // Unique key for event on specific day
                                className={cn(
                                  "py-1 px-1 text-xs font-medium whitespace-normal relative z-10", // Removed mb-0.5
                                  "min-h-[1.5rem]", // Ensure a minimum height for all pills
                                  isMultiDay ? "bg-blue-600 text-white dark:bg-blue-800 dark:text-blue-100" : "bg-accent/20 text-foreground",
                                  roundingClasses, // Apply calculated rounding
                                  widthAndMarginClasses // Apply calculated width and margin
                                )}
                              >
                                {isEventStartDay || !isMultiDay ? (
                                  <span className="flex flex-col text-left pl-1">
                                    <span className="flex flex-col">
                                      {event.event_time && <span className="font-bold">{event.event_time}</span>}
                                      <span>{event.event_name}</span>
                                    </span>
                                  </span>
                                ) : (
                                  null
                                )}
                              </div>
                            );
                          })}
                        </div>
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
                  <div className="p-8 bg-secondary rounded-lg border border-border text-center">
                    <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground mb-4">
                      {viewMode === 'month'
                        ? 'No events found for this month.'
                        : 'No events found for this week.'}
                    </p>
                    <Link to="/submit-event">
                      <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add a New Event
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(viewMode === 'month' ? eventsForCurrentMonth : eventsForCurrentWeek).map((event) => renderEventCard(event))}
                  </div>
                )}
              </div>
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

      {/* Filter Overlay */}
      <FilterOverlay
        isOpen={isFilterOverlayOpen}
        onClose={() => setIsFilterOverlayOpen(false)}
        currentFilters={{ searchTerm, eventType, state: stateFilter, dateFilter }}
        onApplyFilters={handleApplyFilters}
        onClearAllFilters={handleClearAllFilters}
      />

      {/* Agenda Overlay */}
      <AgendaOverlay
        isOpen={isAgendaOverlayOpen}
        onClose={() => setIsAgendaOverlayOpen(false)}
        selectedDate={selectedDayForDialog}
        events={selectedDayEvents}
        onEventSelect={handleViewDetails}
      />
    </div>
  );
};

export default Home;