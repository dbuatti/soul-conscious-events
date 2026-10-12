import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import EventCardV2 from '@/components/v2/EventCardV2';
import { getBaseEventId, groupEventsByTimeBucket } from '@/utils/event-utils';
import { Event } from '@/types/event';

interface EventDayGroupsProps {
  events: Event[];
  onShare: (event: Event, e: MouseEvent) => void;
  onDelete: (eventId: string, e: MouseEvent) => void;
  onViewDetails: (event: Event) => void;
  extraCountMap: Record<string, number>;
}

/**
 * Renders a flat list as "what's on" time buckets (Today, Tomorrow, This
 * weekend, Next week, Later in Month…).
 */
const EventDayGroups = ({
  events,
  onShare,
  onDelete,
  onViewDetails,
  extraCountMap,
}: EventDayGroupsProps) => {
  const dayGroups = useMemo(() => groupEventsByTimeBucket(events), [events]);

  return (
    <div className="space-y-10 sm:space-y-14">
      {dayGroups.map((group) => (
        <div key={group.key}>
          <div className="flex items-baseline gap-3 mb-4 sm:mb-5">
            <h2 className={cn(
              "text-3xl sm:text-4xl font-heading font-semibold",
              group.label === 'Today' ? "text-primary" : "text-foreground"
            )}>
              {group.label}
            </h2>
            {group.sublabel && <span className="text-sm text-muted-foreground">{group.sublabel}</span>}
            <span className="flex-1 h-px bg-border/70 translate-y-[-0.3rem]" />
            <span className="text-xs text-muted-foreground">{group.events.length} {group.events.length === 1 ? 'event' : 'events'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {group.events.map((event) => (
              <EventCardV2
                key={event.id}
                event={event}
                onShare={onShare}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
                isFeaturedToday={isToday(parseISO(event.event_date))}
                additionalDatesCount={extraCountMap[getBaseEventId(event.id)] || 0}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventDayGroups;