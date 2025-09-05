import React, { useState, useEffect, useRef } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, ArrowRight, ChevronDown } => 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { useIsMobile } from '@/hooks/use-mobile';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string;
  event_time?: string;
  user_id?: string;
}

interface AdvancedEventCalendarProps {
  events: Event[];
  onEventSelect: (event: Event) => void;
  selectedDay: Date;
  onDayClick: (day: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const AdvancedEventCalendar: React.FC<AdvancedEventCalendarProps> = ({
  events,
  onEventSelect,
  selectedDay,
  onDayClick,
  currentMonth,
  onMonthChange,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [loading, setLoading] = useState(true);
  const [isMonthPickerPopoverOpen, setIsMonthPickerPopoverOpen] = useState(false);
  const isMobile = useIsMobile();

  const daysOfWeekShort = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];

  useEffect(() => {
    if (events) {
      setLoading(false);
    }
  }, [events]);

  const handlePrevMonth = () => onMonthChange(subMonths(currentMonth, 1));
  const handleNextMonth = () => onMonthChange(addMonths(currentMonth, 1));
  const handleToday = () => {
    const today = new Date();
    onMonthChange(today);
    onDayClick(today);
  };
  const handlePrevWeek = () => onMonthChange(subWeeks(currentMonth, 1));
  const handleNextWeek = () => onMonthChange(addWeeks(currentMonth, 1));

  const getEventsForDay = (day: Date) => {
    return events
      .filter((event) => {
        const eventStartDate = parseISO(event.event_date);
        const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
        return isSameDay(eventStartDate, day) || (day >= eventStartDate && day <= eventEndDate);
      })
      .sort((a, b) => {
        const aIsMultiDay = a.end_date && !isSameDay(parseISO(a.event_date), parseISO(a.end_date));
        const bIsMultiDay = b.end_date && !isSameDay(parseISO(b.event_date), parseISO(b.end_date));
        if (aIsMultiDay && !bIsMultiDay) return -1; // Multi-day events first
        if (!aIsMultiDay && bIsMultiDay) return 1;
        const timeA = a.event_time || '';
        const timeB = b.event_time || '';
        if (timeA && timeB) return timeA.localeCompare(timeB);
        return a.event_name.localeCompare(b.event_name);
      });
  };

  const startOfCurrentMonth = startOfMonth(currentMonth);
  const endOfCurrentMonth = endOfMonth(currentMonth);
  const startDay = startOfWeek(startOfCurrentMonth, { weekStartsOn: 1 });
  const endDay = endOfWeek(endOfCurrentMonth, { weekStartsOn: 1 });
  const daysInMonthView = eachDayOfInterval({ start: startDay, end: endDay });
  const currentWeek = eachDayOfInterval({ start: startOfWeek(currentMonth, { weekStartsOn: 1 }), end: endOfWeek(currentMonth, { weekStartsOn: 1 }) });

  const isMultiDayEvent = (event: Event) => {
    const eventStartDate = parseISO(event.event_date);
    const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
    return !isSameDay(eventStartDate, eventEndDate);
  };

  const isFirstVisibleDayOfMultiDayEvent = (event: Event, day: Date, visibleDays: Date[]) => {
    const eventStartDate = parseISO(event.event_date);
    const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
    if (!isMultiDayEvent(event)) return false;

    // Find the first day in visibleDays that is part of this event
    const firstDayInViewForEvent = visibleDays.find(d => d >= eventStartDate && d <= eventEndDate);
    return firstDayInViewForEvent && isSameDay(day, firstDayInViewForEvent);
  };

  const isLastVisibleDayOfMultiDayEvent = (event: Event, day: Date, visibleDays: Date[]) => {
    const eventStartDate = parseISO(event.event_date);
    const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
    if (!isMultiDayEvent(event)) return false;

    // Find the last day in visibleDays that is part of this event
    const lastDayInViewForEvent = visibleDays.findLast(d => d >= eventStartDate && d <= eventEndDate);
    return lastDayInViewForEvent && isSameDay(day, lastDayInViewForEvent);
  };

  const getMultiDayRoundingClasses = (event: Event, day: Date, visibleDays: Date[]) => {
    const isFirstVisible = isFirstVisibleDayOfMultiDayEvent(event, day, visibleDays);
    const isLastVisible = isLastVisibleDayOfMultiDayEvent(event, day, visibleDays);

    if (isFirstVisible && isLastVisible) {
      return "rounded-md";
    } else if (isFirstVisible) {
      return "rounded-l-md rounded-r-none";
    } else if (isLastVisible) {
      return "rounded-r-md rounded-l-none";
    } else {
      return "rounded-none";
    }
  };

  const visibleDaysInView = viewMode === 'month' ? daysInMonthView : currentWeek;

  return (
    <div className="w-full">
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
                    onMonthChange(date);
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
            <Button variant="outline" onClick={handleToday} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105">
              Today
            </Button>
            <Button variant={viewMode === 'month' ? 'default' : 'outline'} onClick={() => setViewMode('month')} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              Month
            </Button>
            <Button variant={viewMode === 'week' ? 'default' : 'outline'} onClick={() => setViewMode('week')} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              Week
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-px text-center border-t border-l border-border rounded-lg overflow-hidden">
          {daysOfWeekShort.map((day, index) => (<div key={day + index} className="font-semibold text-foreground py-2 border-r border-b border-border bg-secondary">{day}</div>))}
          {Array.from({ length: 35 }).map((_, i) => (<div key={i} className="h-32 sm:h-40 md:h-48 lg:h-56 border-r border-b border-border p-2 flex flex-col items-center justify-center bg-muted"><Skeleton className="h-5 w-1/2 mb-2" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3 mt-1" /></div>))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex-grow">
            <div className="grid grid-cols-7 text-center border border-border rounded-lg">
              {daysOfWeekShort.map((dayName, index) => (<div key={dayName + index} className="font-semibold text-foreground text-xs py-1 sm:text-base sm:py-2 border-b border-r border-border bg-secondary">{daysOfWeekShort[index]}</div>))}
              {visibleDaysInView.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isPastDate = isPast(day) && !isToday(day);

                // Separate multi-day events from single-day events
                const multiDayEventsForThisDay = dayEvents.filter(isMultiDayEvent);
                const singleDayEventsForThisDay = dayEvents.filter(e => !isMultiDayEvent(e));

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative flex flex-col h-32 sm:h-40 md:h-48 lg:h-56 w-full transition-colors duration-200 p-1 cursor-pointer",
                      "border-r border-b border-border",
                      isCurrentMonth || viewMode === 'week' ? "bg-card" : "bg-secondary opacity-50",
                      isPastDate && "opacity-70",
                      isTodayDate && "bg-primary/10 text-primary",
                      isSelected && !isTodayDate && "bg-accent/20 border-primary border-2",
                      "overflow-hidden" // Crucial for negative margins to work without scrollbars
                    )}
                    onClick={() => onDayClick(day)}
                  >
                    {/* Day number (always on top) */}
                    <span className={cn("font-bold text-left relative z-20", isTodayDate ? "text-primary" : "text-foreground", isPastDate && "text-muted-foreground")}>
                      {format(day, 'd')}
                    </span>

                    {/* Container for events */}
                    <div className="flex-grow overflow-y-auto mt-1 space-y-0.5 relative z-10">
                      {/* Render multi-day events first, as they act like a background bar */}
                      {multiDayEventsForThisDay.map(event => {
                        const isFirstVisible = isFirstVisibleDayOfMultiDayEvent(event, day, visibleDaysInView);
                        const roundingClasses = getMultiDayRoundingClasses(event, day, visibleDaysInView);

                        return (
                          <div
                            key={event.id + format(day, 'yyyy-MM-dd') + '-multi'}
                            className={cn(
                              "relative w-[calc(100%+2px)] -ml-[1px] -mr-[1px] py-1.5 px-2 min-h-[2.5rem]", // Span full width + borders, fixed height
                              "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground hover:bg-primary/90",
                              roundingClasses,
                              "flex flex-col items-start justify-center text-xs font-medium cursor-pointer whitespace-normal"
                            )}
                            onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
                          >
                            {isFirstVisible && (
                              <>
                                {event.event_time && <span className="font-bold">{event.event_time}</span>}
                                <span>{event.event_name}</span>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* Render single-day events on top of multi-day events */}
                      {singleDayEventsForThisDay.map((event) => (
                        <div
                          key={event.id + format(day, 'yyyy-MM-dd') + '-single'}
                          className={cn(
                            "relative w-full px-2 py-1.5 rounded-md min-h-[2.5rem]", // Fixed height
                            "bg-accent/20 text-foreground hover:bg-accent/40",
                            "flex flex-col items-start justify-center text-xs font-medium cursor-pointer whitespace-normal"
                          )}
                          onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
                        >
                          {event.event_time && <span className="font-bold text-blue-700 dark:text-blue-300">{event.event_time}</span>}
                          <span className="text-foreground">{event.event_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedEventCalendar;