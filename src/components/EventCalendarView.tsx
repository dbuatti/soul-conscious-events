import React from 'react';
import { format } from 'date-fns';
import AdvancedEventCalendar from '@/components/AdvancedEventCalendar';
import { Event } from '@/types/event';
import EventCardList from '@/components/EventCardList';

interface EventCalendarViewProps {
  events: Event[];
  selectedDay: Date;
  onDayClick: (day: Date) => void;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  onEventSelect: (event: Event) => void;
  selectedDayEvents: Event[];
  currentMonthEvents: Event[];
  onShare: (event: Event, e: React.MouseEvent) => void;
  onDelete: (eventId: string, e: React.MouseEvent) => void;
  onViewDetails: (event: Event) => void;
}

const EventCalendarView: React.FC<EventCalendarViewProps> = ({
  events,
  selectedDay,
  onDayClick,
  currentMonth,
  onMonthChange,
  onEventSelect,
  selectedDayEvents,
  currentMonthEvents,
  onShare,
  onDelete,
  onViewDetails,
}) => {
  return (
    <div>
      <AdvancedEventCalendar
        events={events}
        onEventSelect={onEventSelect}
        selectedDay={selectedDay}
        onDayClick={onDayClick}
        currentMonth={currentMonth}
        onMonthChange={onMonthChange}
      />
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-foreground mb-4">Events for {format(selectedDay, 'MMMM d, yyyy')}</h3>
        {selectedDayEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedDayEvents.map(event => (
              <EventCardList
                key={`day-${event.id}`}
                events={[event]}
                onShare={onShare}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-secondary rounded-lg">
            <p className="text-muted-foreground">No events scheduled for this day.</p>
          </div>
        )}
      </div>
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-foreground mb-4">More events in {format(currentMonth, 'MMMM')}</h3>
        {currentMonthEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentMonthEvents.map(event => (
              <EventCardList
                key={`month-${event.id}`}
                events={[event]}
                onShare={onShare}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-secondary rounded-lg">
            <p className="text-muted-foreground">No upcoming events found for this month.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCalendarView;