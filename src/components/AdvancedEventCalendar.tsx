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
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
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
        if (aIsMultiDay && !bIsMultiDay) return -1;
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

  const renderDayEventPill = (event: Event, day: Date, visibleDays: Date[]) => {
    const eventStartDate = parseISO(event.event_date);
    const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
    const isMultiDay = !isSameDay(eventStartDate, eventEndDate);
    const isEventStartDay = isSameDay(day, eventStartDate);
    const isEventEndDay = isSameDay(day, eventEndDate);

    // Determine if this 'day' is the first visible day of the event within the current calendar view
    const firstSpanningDayInView = visibleDays.find(d => {
      return d >= eventStartDate && d <= eventEndDate;
    });
    const isFirstVisibleDay = firstSpanningDayInView && isSameDay(day, firstSpanningDayInView);

    // Base classes for all event pills (common styles, not layout/spacing)
    const basePillClasses = "text-xs font-medium whitespace-normal min-h-[1.5rem] cursor-pointer";

    if (!isMultiDay) {
      // Single day event: render with time and name, standard rounded corners, and padding
      return (
        <div
          key={event.id + format(day, 'yyyy-MM-dd')}
          className={cn("relative z-10 w-full px-2 py-1 rounded-md mb-1", basePillClasses, "bg-accent/20 text-foreground hover:bg-accent/40")}
          onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
        >
          <span className="flex flex-col text-left">
            {event.event_time && <span className="font-bold text-blue-700 dark:text-blue-300">{event.event_time}</span>}
            <span className="text-foreground">{event.event_name}</span>
          </span>
        </div>
      );
    }

    // Multi-day event - using absolute positioning to fill the cell
    const multiDayPillClasses = cn(
      "absolute inset-0 z-0", // Fill the entire parent day cell
      "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground hover:bg-primary/90",
      "flex items-center", // For vertical centering of text
      "py-1", // Add vertical padding here
      isFirstVisibleDay ? "pl-2" : "pl-1" // Horizontal padding for text
    );

    let rounding = "rounded-none";
    if (isEventStartDay && isEventEndDay) rounding = "rounded-md";
    else if (isEventStartDay) rounding = "rounded-l-md rounded-r-none";
    else if (isEventEndDay) rounding = "rounded-r-md rounded-l-none";

    return (
      <div key={event.id + format(day, 'yyyy-MM-dd')} className={cn(multiDayPillClasses, rounding)}
           onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}>
        {isFirstVisibleDay ? (
          <span className="flex flex-col text-left">
            {event.event_time && <span className="font-bold">{event.event_time}</span>}
            <span>{event.event_name}</span>
          </span>
        ) : (
          <span className="sr-only">{event.event_name} (continuation)</span>
        )}
      </div>
    );
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
          {Array.from({ length: 35 }).map((_, i) => (<div key={i} className="h-28 sm:h-40 md:h-48 lg:h-56 border-r border-b border-border p-2 flex flex-col items-center justify-center bg-muted"><Skeleton className="h-5 w-1/2 mb-2" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3 mt-1" /></div>))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex-grow">
            <div className="grid grid-cols-7 gap-px text-center border border-border rounded-lg overflow-visible">
              {daysOfWeekShort.map((dayName, index) => (<div key={dayName + index} className="font-semibold text-foreground text-xs py-1 sm:text-base sm:py-2 border-b border-r border-border bg-secondary">{daysOfWeekShort[index]}</div>))}
              {(viewMode === 'month' ? daysInMonthView : currentWeek).map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isPastDate = isPast(day) && !isToday(day);

                // NEW LOGIC: Check if any multi-day event spans this day
                const hasMultiDayEventSpanning = events.some(event => {
                  const eventStartDate = parseISO(event.event_date);
                  const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
                  const isMultiDayEvent = !isSameDay(eventStartDate, eventEndDate);
                  return isMultiDayEvent && day >= eventStartDate && day <= eventEndDate;
                });

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative flex flex-col h-32 sm:h-40 md:h-48 lg:h-56 w-full transition-colors duration-200 p-1 cursor-pointer",
                      isCurrentMonth || viewMode === 'week' ? "bg-card" : "bg-secondary opacity-50",
                      isPastDate && "opacity-70",
                      isTodayDate && "bg-primary/10 text-primary",
                      isSelected && !isTodayDate && "bg-accent/20 border-primary border-2",
                      // Apply a subtle primary background if a multi-day event spans this day
                      hasMultiDayEventSpanning && "bg-primary/20 dark:bg-primary/20"
                    )}
                    onClick={() => onDayClick(day)}
                  >
                    <span className={cn("font-bold text-left relative z-10", isTodayDate ? "text-primary" : "text-foreground", isPastDate && "text-muted-foreground")}>
                      {format(day, 'd')}
                    </span>
                    {isMobile ? (
                      dayEvents.length > 0 && (
                        <div className="flex justify-center items-center mt-1 space-x-1">
                          {dayEvents.slice(0, 3).map((event, index) => (
                            <div key={event.id + index} className="h-2 w-2 rounded-full bg-primary" />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-xs font-bold text-primary">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex-grow overflow-y-auto mt-1 space-y-0.5 pr-1 relative z-0">
                        {dayEvents.map((event) => renderDayEventPill(event, day, visibleDaysInView))}
                      </div>
                    )}
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