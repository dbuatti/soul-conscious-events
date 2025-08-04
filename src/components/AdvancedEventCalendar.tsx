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
import { ArrowLeft, ArrowRight, ChevronDown, Clock, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string;
  event_time?: string;
  place_name?: string;
  user_id?: string;
}

interface AdvancedEventCalendarProps {
  events: Event[];
  onEventSelect: (event: Event) => void;
}

const AdvancedEventCalendar: React.FC<AdvancedEventCalendarProps> = ({ events, onEventSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [isMonthPickerPopoverOpen, setIsMonthPickerPopoverOpen] = useState(false);

  const daysOfWeekShort = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];

  useEffect(() => {
    if (events) {
      setLoading(false);
    }
  }, [events]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    handleDayClick(today);
  };
  const handlePrevWeek = () => setCurrentMonth(subWeeks(currentMonth, 1));
  const handleNextWeek = () => setCurrentMonth(addWeeks(currentMonth, 1));

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

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    const eventsForClickedDay = getEventsForDay(day);
    setSelectedDayEvents(eventsForClickedDay);
  };

  useEffect(() => {
    if (selectedDay) {
      setSelectedDayEvents(getEventsForDay(selectedDay));
    } else {
      const today = new Date();
      setSelectedDay(today);
      setSelectedDayEvents(getEventsForDay(today));
    }
  }, [events, selectedDay]);

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

  const renderDayEventPill = (event: Event, day: Date) => {
    const eventStartDate = parseISO(event.event_date);
    const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
    const isMultiDay = !isSameDay(eventStartDate, eventEndDate);
    const isEventStartDay = isSameDay(day, eventStartDate);
    const isEventEndDay = isSameDay(day, eventEndDate);
    const isContinuationDay = isMultiDay && !isEventStartDay && !isEventEndDay;

    const basePillClasses = "py-1 px-2 text-xs font-medium whitespace-normal min-h-[1.5rem] mb-1 cursor-pointer";

    if (!isMultiDay) {
      return (
        <div
          key={event.id + format(day, 'yyyy-MM-dd')}
          className={cn("relative z-10 w-full", basePillClasses, "bg-accent/20 text-foreground rounded-md hover:bg-accent/40")}
          onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
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
    if (isEventStartDay && isEventEndDay) rounding = "rounded-md";
    else if (isEventStartDay) rounding = "rounded-l-md rounded-r-none";
    else if (isEventEndDay) rounding = "rounded-r-md rounded-l-none";
    else if (isContinuationDay) rounding = "rounded-none";

    return (
      <div key={event.id + format(day, 'yyyy-MM-dd')} className={trackClasses}>
        <div
          className={cn(basePillClasses, "bg-primary text-primary-foreground dark:bg-primary/80 dark:text-primary-foreground hover:bg-primary/70", rounding)}
          onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
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
            <Button variant="outline" onClick={handleToday} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105">
              Today
            </Button>
            <Button variant={viewMode === 'month' ? 'default' : 'outline'} onClick={() => setViewMode('month')} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              Month
            </Button>
            <Button variant={viewMode === 'week' ? 'default' : 'outline'} onClick={() => { setViewMode('week'); const start = startOfWeek(currentMonth, { weekStartsOn: 1 }); const weekDays = eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 1 }) }); setCurrentWeek(weekDays); }} className="transition-all duration-300 ease-in-out transform hover:scale-105">
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

                return (
                  <div
                    key={day.toISOString()}
                    className={cn("relative flex flex-col h-28 sm:h-40 md:h-48 lg:h-56 w-full cursor-pointer transition-colors duration-200 overflow-visible", isCurrentMonth || viewMode === 'week' ? "bg-card" : "bg-secondary opacity-50", isPastDate && "opacity-70", isTodayDate && "bg-primary/10 text-primary", isSelected && !isTodayDate && "bg-accent/20 border-primary border-2")}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className={cn("absolute top-2 left-2 text-lg sm:text-xl font-bold transition-all duration-200", isTodayDate ? "text-primary" : isSelected && !isTodayDate ? "text-primary" : "text-foreground", isPastDate && "text-muted-foreground")}>
                      {format(day, 'd')}
                    </span>
                    <div className="hidden sm:flex flex-col gap-0 mt-10 flex-grow overflow-visible">
                      {dayEvents.slice(0, 2).map((event) => renderDayEventPill(event, day))}
                      {dayEvents.length > 2 && (<div className="text-xs text-primary font-bold mt-1">+ {dayEvents.length - 2} more</div>)}
                    </div>
                    {dayEvents.length > 0 && (<div className="sm:hidden absolute bottom-2 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary" />)}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDay && (
            <div className="mt-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">Events for {format(selectedDay, 'MMMM d, yyyy')}</h3>
              <div className="space-y-4">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event) => (
                    <Card key={event.id} onClick={() => onEventSelect(event)} className="cursor-pointer hover:bg-accent/50 transition-colors duration-200 dark:bg-secondary">
                      <CardHeader>
                        <CardTitle className="text-primary">{event.event_name}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                          {event.event_time && (<span className="flex items-center"><Clock className="mr-2 h-4 w-4" />{event.event_time}</span>)}
                          {event.place_name && (<span className="flex items-center"><MapPin className="mr-2 h-4 w-4" />{event.place_name}</span>)}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 px-4 bg-secondary rounded-lg">
                    <p className="text-muted-foreground">No events scheduled for this day.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedEventCalendar;