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
  differenceInDays,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, ArrowRight, ChevronDown, CalendarDays as CalendarDaysIcon } from 'lucide-react';
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

  const eventDurationInDays = (event: Event): number => {
    const startDate = parseISO(event.event_date);
    const endDate = event.end_date ? parseISO(event.end_date) : startDate;
    return differenceInDays(endDate, startDate) + 1;
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

    // Check if 'day' is the actual start date of the event
    if (isSameDay(day, eventStartDate)) {
      return true;
    }

    // If the event started before the current week/month view,
    // check if 'day' is the first day of the event that is visible in the current view.
    const firstDayInViewForEvent = visibleDays.find(d => d >= eventStartDate && d <= eventEndDate);
    return firstDayInViewForEvent && isSameDay(day, firstDayInViewForEvent);
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
                <Button variant="ghost" className="w-[180px] justify-center text-lg font-bold focus-visible:ring-primary transition-all duration-300 ease-in-out transform hover:scale-105">
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
        <div className="grid grid-cols-7 gap-px text-center border-t border-l border-r border-border rounded-lg overflow-hidden">
          {daysOfWeekShort.map((day, index) => (<div key={day + index} className="font-semibold text-foreground py-2 border-b border-border bg-secondary">{day}</div>))}
          {Array.from({ length: 35 }).map((_, i) => (<div key={i} className="h-32 sm:h-40 md:h-48 lg:h-56 border-r border-b border-border p-2 flex flex-col items-center justify-center bg-muted"><Skeleton className="h-5 w-1/2 mb-2" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3 mt-1" /></div>))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex-grow">
            <div className="grid grid-cols-7 border-t border-l border-r border-border rounded-lg divide-y divide-border" style={{ overflow: 'hidden', boxSizing: 'border-box' }}>
              {/* Increased padding and font size for day headers */}
              {daysOfWeekShort.map((dayName, index) => (
                <div key={dayName + index} className="font-semibold text-foreground text-xs py-2 sm:text-sm sm:py-3 bg-secondary text-center border-b border-border">{daysOfWeekShort[index]}</div>
              ))}
              {visibleDaysInView.map((day, dayIndex) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isPastDate = isPast(day) && !isToday(day);

                const multiDayEventsForThisDay = dayEvents.filter(isMultiDayEvent);
                const singleDayEventsForThisDay = dayEvents.filter(e => !isMultiDayEvent(e));

                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className={cn(
                      "relative flex flex-col min-h-[100px] w-full transition-colors duration-200 cursor-pointer",
                      isCurrentMonth || viewMode === 'week' ? "bg-card hover:bg-accent/10" : "bg-secondary opacity-50",
                      isPastDate && "opacity-70",
                      isTodayDate && "ring-2 ring-primary/50",
                      isSelected && !isTodayDate && "bg-accent/20 ring-2 ring-primary",
                    )}
                    style={{ position: 'relative', boxSizing: 'border-box' }}
                    onClick={() => onDayClick(day)}
                  >
                    {/* Day Number */}
                    <div className={cn("absolute top-1 right-1 px-1.5 py-0.5 font-bold z-10 text-right rounded-full", isTodayDate ? "bg-primary text-primary-foreground" : "text-foreground", isPastDate && "text-muted-foreground")}>
                      {format(day, 'd')}
                    </div>

                    {/* Multi-Day Events - Rendered directly inside day cell */}
                    {!isMobile && multiDayEventsForThisDay.map((event) => {
                      const eventStartDate = parseISO(event.event_date);
                      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
                      const isFirstVisible = isFirstVisibleDayOfMultiDayEvent(event, day, visibleDaysInView);

                      if (isFirstVisible) {
                        const endOfCurrentWeekForDay = endOfWeek(day, { weekStartsOn: 1 });
                        const segmentEndDate = new Date(Math.min(eventEndDate.getTime(), endOfCurrentWeekForDay.getTime()));
                        const effectiveDaysSpanned = differenceInDays(segmentEndDate, day) + 1;

                        const roundingClasses = cn({
                          'rounded-l-md': isSameDay(day, eventStartDate),
                          'rounded-r-md': isSameDay(segmentEndDate, eventEndDate),
                          'rounded-none': !isSameDay(day, eventStartDate) && !isSameDay(segmentEndDate, eventEndDate),
                        });

                        return (
                          <div
                            key={event.id + format(day, 'yyyy-MM-dd') + '-multi'}
                            className={cn(
                              "absolute py-1 min-h-[2rem] px-1",
                              "bg-primary/20 text-primary-foreground dark:bg-primary/30 dark:text-primary-foreground hover:bg-primary/40",
                              "flex items-center justify-center text-xs font-medium cursor-pointer whitespace-normal",
                              roundingClasses,
                              "z-30"
                            )}
                            style={{
                              width: `calc(100% * ${effectiveDaysSpanned})`,
                              left: '0',
                              top: '32px',
                              backgroundColor: 'hsl(var(--primary) / 0.2)',
                              boxSizing: 'border-box'
                            }}
                            onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
                          >
                            <div className="px-1 text-center flex items-center">
                              <CalendarDaysIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                              {event.event_time && <div className="font-bold text-primary-foreground mr-1 flex-shrink-0">{event.event_time}</div>}
                              <div className="text-primary-foreground truncate">{event.event_name}</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}

                    {/* Event Container for single-day events and mobile dots */}
                    <div className="pt-8 pb-1 px-1 z-20 flex-grow space-y-0.5">
                      {isMobile ? (
                        <div className="flex flex-wrap gap-1 mt-1 justify-center">
                          {dayEvents.map(event => (
                            <div
                              key={event.id + format(day, 'yyyy-MM-dd') + '-dot'}
                              className="h-2.5 w-2.5 rounded-full bg-primary"
                              title={event.event_name}
                            />
                          ))}
                        </div>
                      ) : (
                        <>
                          {/* Single-Day Events or Consolidated Pill */}
                          {singleDayEventsForThisDay.length === 1 ? (
                            singleDayEventsForThisDay.map((event) => (
                              <div
                                key={event.id + format(day, 'yyyy-MM-dd') + '-single'}
                                className={cn(
                                  "w-full px-2 py-1 rounded-md min-h-[2rem]",
                                  "bg-secondary text-foreground dark:bg-secondary dark:text-foreground hover:bg-secondary/70 cursor-pointer",
                                  "flex flex-col items-start justify-center text-xs font-medium whitespace-normal",
                                  "z-30"
                                )}
                                onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
                              >
                                {event.event_time && <div className="font-bold text-foreground">{event.event_time}</div>}
                                <div className="text-foreground truncate w-full">{event.event_name}</div>
                              </div>
                            ))
                          ) : singleDayEventsForThisDay.length > 1 ? (
                            <div
                              className={cn(
                                "w-full px-2 py-1 rounded-md min-h-[2rem]",
                                "bg-secondary text-foreground dark:bg-secondary dark:text-foreground hover:bg-secondary/70 cursor-pointer",
                                "flex items-center justify-center text-xs font-medium whitespace-normal",
                                "z-30"
                              )}
                              onClick={() => onDayClick(day)}
                            >
                              <div className="truncate w-full text-center">{singleDayEventsForThisDay.length} Events</div>
                            </div>
                          ) : null}
                        </>
                      )}
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