import React, { useState, useEffect } from 'react';
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
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, ArrowRight, ChevronDown, Clock, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [isMonthPickerPopoverOpen, setIsMonthPickerPopoverOpen] = useState(false);

  const daysOfWeekShort = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];

  const eventsForDay = React.useMemo(() => {
    if (!selectedDay) return [];
    return events.filter(event => isSameDay(parseISO(event.event_date), selectedDay));
  }, [events, selectedDay]);

  const eventsForMonth = React.useMemo(() => {
    return events
      .filter(event => {
        const eventDate = parseISO(event.event_date);
        return isSameMonth(eventDate, currentMonth);
      })
      .sort((a, b) => parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime());
  }, [events, currentMonth]);

  const eventsByDayMap = React.useMemo(() => {
    const map = new Map<string, number>();
    events.forEach(event => {
      const dateKey = format(parseISO(event.event_date), 'yyyy-MM-dd');
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    });
    return map;
  }, [events]);

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
    setSelectedDay(today);
  };
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };

  const startOfVisibleMonth = startOfMonth(currentMonth);
  const endOfVisibleMonth = endOfMonth(currentMonth);
  const startDay = startOfWeek(startOfVisibleMonth, { weekStartsOn: 1 });
  const endDay = endOfWeek(endOfVisibleMonth, { weekStartsOn: 1 });
  const daysInMonthView = eachDayOfInterval({ start: startDay, end: endDay });

  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-px text-center border-t border-l border-border rounded-lg overflow-hidden">
        {daysOfWeekShort.map((day, index) => (<div key={day + index} className="font-semibold text-foreground py-2 border-r border-b border-border bg-secondary">{day}</div>))}
        {Array.from({ length: 35 }).map((_, i) => (<div key={i} className="h-28 sm:h-40 md:h-48 lg:h-56 border-r border-b border-border p-2 flex flex-col items-center justify-center bg-muted"><Skeleton className="h-5 w-1/2 mb-2" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3 mt-1" /></div>))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 p-5 bg-secondary rounded-xl shadow-lg border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2 mb-4 sm:mb-0">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="transition-all duration-300 ease-in-out transform hover:scale-105">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Popover open={isMonthPickerPopoverOpen} onOpenChange={setIsMonthPickerPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-[180px] justify-center text-lg font-bold focus-visible:ring-primary">
                {format(currentMonth, 'MMMM yyyy')}
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
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="transition-all duration-300 ease-in-out transform hover:scale-105">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={handleToday} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105">
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center border border-border rounded-lg overflow-hidden">
        {daysOfWeekShort.map((dayName) => (
          <div key={dayName} className="font-semibold text-foreground text-xs py-1 sm:text-base sm:py-2 border-b border-r border-border bg-secondary">{dayName}</div>
        ))}
        {daysInMonthView.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const hasEvents = eventsByDayMap.has(dateKey);
          const isCurrentMonthDay = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const isSelectedDay = selectedDay && isSameDay(day, selectedDay);
          const isPastDate = isPast(day) && !isTodayDate;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "relative flex flex-col h-20 sm:h-24 w-full cursor-pointer transition-colors duration-200 p-1 border-b border-r border-border",
                isCurrentMonthDay ? "bg-card" : "bg-secondary opacity-50",
                isPastDate && "opacity-70",
                isTodayDate && "bg-primary/10 text-primary",
                isSelectedDay && !isTodayDate && "bg-accent/20 border-primary border-2",
                "hover:bg-accent/30"
              )}
              onClick={() => handleDayClick(day)}
            >
              <span className={cn(
                "font-bold text-left",
                isTodayDate ? "text-primary" : isSelectedDay && !isTodayDate ? "text-primary" : "text-foreground",
                isPastDate && "text-muted-foreground"
              )}>
                {format(day, 'd')}
              </span>
              {hasEvents && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-8">
          <h3 className="text-2xl font-bold text-foreground mb-4">Events for {format(selectedDay, 'MMMM d, yyyy')}</h3>
          <div className="space-y-4">
            {eventsForDay.length > 0 ? (
              eventsForDay.map((event) => (
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

      <div className="mt-12">
        <h3 className="text-2xl font-bold text-foreground mb-4">More Events in {format(currentMonth, 'MMMM')}</h3>
        <div className="space-y-4">
          {eventsForMonth.length > 0 ? (
            eventsForMonth.map((event) => (
              <Card key={event.id} onClick={() => onEventSelect(event)} className="cursor-pointer hover:bg-accent/50 transition-colors duration-200 dark:bg-secondary">
                <CardHeader>
                  <CardTitle className="text-primary">{event.event_name}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                    <span className="font-semibold">{format(parseISO(event.event_date), 'EEEE, MMM d')}</span>
                    {event.event_time && (<span className="flex items-center"><Clock className="mr-2 h-4 w-4" />{event.event_time}</span>)}
                    {event.place_name && (<span className="flex items-center"><MapPin className="mr-2 h-4 w-4" />{event.place_name}</span>)}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 px-4 bg-secondary rounded-lg">
              <p className="text-muted-foreground">No events scheduled for this month.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedEventCalendar;