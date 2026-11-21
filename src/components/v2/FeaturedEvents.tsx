import React from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, isToday } from 'date-fns';
import { ArrowRight, Play, MapPin, Clock } from 'lucide-react';
import { Event } from '@/types/event';
import { ResilientImage } from '@/components/v2/ResilientImage';
import { cn } from '@/lib/utils';

interface FeaturedEventsProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
}

const categoryColours: Record<string, string> = {
  Meditation: '#7C3AED',
  'Sound Bath': '#0EA5E9',
  Workshop: '#F59E0B',
  'Community Gathering': '#10B981',
  Foraging: '#65A30D',
  Music: '#EC4899',
  'Open Mic': '#9333EA',
  Other: '#B34629',
};

const FeaturedEvents: React.FC<FeaturedEventsProps> = ({
  events,
  onViewDetails,
}) => {
  // Show up to 3 featured events, prioritising today's events
  const featured = events
    .sort((a, b) => {
      const aToday = isToday(parseISO(a.event_date));
      const bToday = isToday(parseISO(b.event_date));
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      return a.event_date.localeCompare(b.event_date);
    })
    .slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-8 rounded-full bg-primary" />
          <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
            Featured this week
          </h2>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          See all events <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Swipeable horizontal carousel with scroll snap */}
      <div className="relative overflow-x-auto scroll-snap-x -mx-4 sm:-mx-6 pb-2 no-scrollbar touch-scroll">
        <div
          className="flex gap-4 sm:gap-6 px-4 sm:px-6 scroll-snap-items"
          data-scroll-container
        >
          {featured.map((event) => {
            const eventDate = parseISO(event.event_date);
            const badgeColor = categoryColours[event.event_type || 'Other'] ?? categoryColours.Other;
            const isEventToday = isToday(eventDate);

            return (
              <article
                key={event.id}
                className={cn(
                  'relative flex-shrink-0 w-[280px] sm:w-[340px] rounded-[2rem] overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] group scroll-snap-start',
                  isEventToday && 'ring-3 ring-primary/20'
                )}
                onClick={() => onViewDetails(event)}
                role="button"
                tabIndex={0}
                aria-label={`View details: ${event.event_name}`}
              >
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-secondary group-hover:scale-[1.02] transition-transform duration-500">
                  <ResilientImage
                    src={event.image_url || undefined}
                    alt={event.event_name}
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  <div className="absolute top-3 left-3 z-20 flex flex-col items-center justify-center w-14 rounded-xl bg-background/90 dark:bg-black/70 backdrop-blur shadow-sm py-1 leading-none">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{format(eventDate, 'EEE')}</span>
                    <span className="font-heading text-2xl font-semibold text-foreground mt-0.5">{format(eventDate, 'd')}</span>
                  </div>

                  <span
                    className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-white drop-shadow"
                    style={{ backgroundColor: badgeColor }}
                  >
                    {event.event_type}
                  </span>

                  {isEventToday && (
                    <span className="absolute bottom-3 right-3 z-20 inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow">
                      Today
                    </span>
                  )}
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">
                      {event.place_name || 'Location TBC'}
                      {event.geographical_state && ` · ${event.geographical_state}`}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-semibold font-heading text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {event.event_name}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{event.event_time || 'Time TBC'}</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <button
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      <span>View details</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Scroll hint for mobile */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/90 to-transparent flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity group">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scroll to see more →</span>
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;
