import React from 'react';
import { Link } from 'react-router-dom';
import { Frown, MapPin, Sparkles, Calendar, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Frown className="h-20 w-20 text-primary/20 mx-auto mb-8" />,
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
  className,
}) => (
  <div
    className={cn(
      'py-16 sm:py-24 px-6 organic-card rounded-[2rem] text-center',
      className
    )}
  >
    <div className="inline-flex items-center justify-center p-6 rounded-full bg-primary/5 mb-6">
      {icon}
    </div>
    <h3 className="text-3xl font-heading font-semibold text-foreground mb-3">{title}</h3>
    <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    <div className="flex flex-col sm:flex-row justify-center gap-3">
      {actionLabel && actionHref && (
        <Button className="rounded-full px-8 py-3 text-lg font-black shadow-xl transition-transform hover:scale-105" asChild>
          <Link to={actionHref}>
            {actionLabel}
            <Plus className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      )}
      {secondaryLabel && secondaryHref && (
        <Button variant="outline" className="rounded-full px-8 py-3 text-lg font-semibold" asChild>
          <Link to={secondaryHref}>{secondaryLabel}</Link>
        </Button>
      )}
    </div>
  </div>
);

export default EmptyState;

// Pre-configured empty states for common scenarios
export const NoEventsEmptyState = () => (
  <EmptyState
    icon={<Sparkles className="h-20 w-20 text-primary/20 mx-auto mb-8" />}
    title="No events here… yet"
    description="Try widening your filters, or be the first to list a gathering like this."
    actionLabel="Clear filters"
    actionHref="/"
    secondaryLabel="List an event"
    secondaryHref="/submit-event"
  />
);

export const NoMapEventsEmptyState = (defaultState?: string | null) => (
  <EmptyState
    icon={<MapPin className="h-20 w-20 text-primary/20 mx-auto mb-8" />}
    title={
      defaultState
        ? `No events with addresses in ${defaultState} yet.`
        : 'No events with addresses found to display.'
    }
    description="These events are in the guide but haven't been pinned on the map yet."
    actionLabel={defaultState ? 'Show all of Australia' : 'List an event'}
    actionHref={defaultState ? '/' : '/submit-event'}
    secondaryLabel="List an event"
    secondaryHref="/submit-event"
  />
);

export const NoSearchResultsEmptyState = () => (
  <EmptyState
    icon={<Search className="h-20 w-20 text-primary/20 mx-auto mb-8" />}
    title="No matching events"
    description="Try different keywords or browse all upcoming gatherings."
    actionLabel="Clear search"
    actionHref="/"
    secondaryLabel="Browse all events"
    secondaryHref="/"
  />
);

export const NoCalendarEventsEmptyState = () => (
  <EmptyState
    icon={<Calendar className="h-20 w-20 text-primary/20 mx-auto mb-8" />}
    title="No events on this day"
    description="Pick another date in the calendar to see what's happening."
    actionLabel="Browse all events"
    actionHref="/"
  />
);
