import { Fragment, useMemo } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import EventCardV2 from '@/components/v2/EventCardV2';
import { getBaseEventId, groupEventsByTimeBucket } from '@/utils/event-utils';
import { Event } from '@/types/event';

interface EventDayGroupsProps {
  events: Event[];
  onDelete: (eventId: string, e: MouseEvent) => void;
  onViewDetails: (event: Event) => void;
  extraCountMap: Record<string, number>;
  /** Full-width block (e.g. the weekly-picks signup) placed after the Nth card. */
  interstitial?: ReactNode;
  interstitialAfter?: number;
}

/**
 * Renders a flat list as "what's on" time buckets (Today, Tomorrow, This
 * weekend, Next week, Later in Month…).
 */
const EventDayGroups = ({
  events,
  onDelete,
  onViewDetails,
  extraCountMap,
  interstitial,
  interstitialAfter = 3,
}: EventDayGroupsProps) => {
  const dayGroups = useMemo(() => groupEventsByTimeBucket(events), [events]);
  // Position of the card the interstitial follows, counted across all groups.
  // With fewer cards than that, it goes after the last one.
  const total = dayGroups.reduce((n, g) => n + g.events.length, 0);
  const insertAt = Math.min(interstitialAfter, total);
  let seen = 0;

  return (
    <div className="space-y-8 sm:space-y-10">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {group.events.map((event) => {
              seen += 1;
              return (
                <Fragment key={event.id}>
                  <EventCardV2
                    event={event}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                    additionalDatesCount={extraCountMap[getBaseEventId(event.id)] || 0}
                  />
                  {interstitial && seen === insertAt && <div className="col-span-full my-2">{interstitial}</div>}
                </Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventDayGroups;