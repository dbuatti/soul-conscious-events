import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { format, parseISO, isToday, isTomorrow, isSameDay, differenceInHours } from 'date-fns';
import { Clock, MapPin, Share2, Pencil, Trash2, Repeat, ArrowUpRight } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, getBaseEventId } from '@/utils/event-utils';
import EventCardFallback from '@/components/EventCardFallback';

interface EventCardV2Props {
  event: Event;
  onShare: (event: Event, e: React.MouseEvent) => void;
  onDelete: (eventId: string, e: React.MouseEvent) => void;
  onViewDetails: (event: Event) => void;
  isFeaturedToday?: boolean;
  additionalDatesCount?: number;
}

const iconButton =
  "h-9 w-9 rounded-full bg-background/90 dark:bg-black/60 backdrop-blur text-foreground shadow-sm hover:bg-background flex items-center justify-center transition-colors";

const EventCardV2: React.FC<EventCardV2Props> = ({
  event,
  onDelete,
  onViewDetails,
  additionalDatesCount = 0,
}) => {
  const { user, isAdmin } = useSession();
  const isCreatorOrAdmin = (!!user && user.id === event.user_id) || isAdmin;
  const [imageLoaded, setImageLoaded] = useState(false);

  const eventDate = parseISO(event.event_date);
  const endDate = event.end_date ? parseISO(event.end_date) : null;
  const isMultiDayEvent = endDate !== null && !isSameDay(eventDate, endDate);
  const isEventToday = isToday(eventDate);
  const isRecurring = !!(event.recurring_pattern || event.is_recurring_instance);

  const relativeDay = isEventToday ? 'Today' : isTomorrow(eventDate) ? 'Tomorrow' : null;

  const createdAt = event.created_at ? parseISO(event.created_at) : null;
  const isNew = createdAt ? Math.abs(differenceInHours(new Date(), createdAt)) < 48 : false;

  const lowerPrice = event.price?.toLowerCase() ?? '';
  const isFree = lowerPrice.includes('free');
  const priceLabel = event.price ? formatPrice(event.price) : null;

  const baseId = getBaseEventId(event.id);

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/events/${baseId}`;
    const shareData = {
      title: event.event_name,
      text: `Check out this soulful event: ${event.event_name}`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') toast.error('Failed to share.');
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Event link copied to clipboard!');
      } catch {
        toast.error('Failed to copy link.');
      }
    }
  };

  return (
    <article
      className="group relative flex flex-col organic-card organic-card-hover rounded-[var(--radius)] overflow-hidden cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-500"
      onClick={() => onViewDetails(event)}
      onKeyDown={(e) => { if (e.key === 'Enter') onViewDetails(event); }}
      tabIndex={0}
      aria-label={`${event.event_name}, ${format(eventDate, 'EEEE d MMMM')}`}
    >
      <div className="relative w-full aspect-[16/9] sm:aspect-[3/2] overflow-hidden bg-secondary">
        {!imageLoaded && event.image_url && <Skeleton className="absolute inset-0 z-10 rounded-none" />}

        {event.image_url ? (
          <img
            src={event.image_url}
            alt=""
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.04]",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            loading="lazy"
          />
        ) : (
          <EventCardFallback event={event} />
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

        {/* Calendar tile */}
        <div className="absolute top-3 left-3 z-20 flex flex-col items-center justify-center w-14 rounded-xl bg-background/95 dark:bg-black/70 backdrop-blur shadow-sm py-1.5 leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{format(eventDate, 'EEE')}</span>
          <span className="font-heading text-2xl font-semibold text-foreground mt-0.5">{format(eventDate, 'd')}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">{format(eventDate, 'MMM')}</span>
        </div>

        <div className="absolute top-3 right-3 z-20 flex gap-2">
          <button type="button" onClick={handleNativeShare} className={iconButton} aria-label="Share event">
            <Share2 className="h-4 w-4" />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <BookmarkButton eventId={event.id} size="icon" className="h-9 w-9 rounded-full shadow-sm bg-background/90 dark:bg-black/60 backdrop-blur" />
          </div>
        </div>

        {event.event_type && (
          <span className="absolute bottom-3 left-3 z-20 text-[11px] font-semibold tracking-wide text-white/95 drop-shadow">
            {event.event_type}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow gap-3">
        {(relativeDay || isRecurring || isMultiDayEvent || isNew) && (
          <div className="flex flex-wrap gap-1.5 -mb-0.5">
            {relativeDay && (
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                isEventToday ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              )}>
                {relativeDay}
              </span>
            )}
            {isRecurring && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage/15 text-sage px-2.5 py-0.5 text-[11px] font-semibold">
                <Repeat className="h-3 w-3" /> {event.recurring_pattern ? event.recurring_pattern.charAt(0) + event.recurring_pattern.slice(1).toLowerCase() : 'Recurring'}
              </span>
            )}
            {isMultiDayEvent && endDate && (
              <span className="inline-flex items-center rounded-full bg-accent/20 text-foreground/80 px-2.5 py-0.5 text-[11px] font-semibold">
                Until {format(endDate, 'EEE d MMM')}
              </span>
            )}
            {isNew && !relativeDay && (
              <span className="inline-flex items-center rounded-full bg-secondary text-muted-foreground px-2.5 py-0.5 text-[11px] font-semibold">
                New
              </span>
            )}
          </div>
        )}

        <h3 className="text-[1.45rem] leading-[1.15] font-semibold text-foreground font-heading line-clamp-2 group-hover:text-primary transition-colors">
          {event.event_name}
        </h3>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="truncate">{event.event_time || 'Time TBC'}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="truncate">
              {event.place_name || 'Location TBC'}
              {event.geographical_state && <span className="text-muted-foreground/70"> · {event.geographical_state}</span>}
            </span>
          </p>
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-border/60">
          <div className="flex items-center gap-2 min-w-0">
            {priceLabel && (
              <span className={cn(
                "text-sm font-semibold truncate",
                isFree ? "text-sage" : "text-foreground"
              )}>
                {priceLabel}
              </span>
            )}
            {additionalDatesCount > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                · +{additionalDatesCount} more date{additionalDatesCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isCreatorOrAdmin && (
              <>
                <Link
                  to={`/edit-event/${baseId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Edit event"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={(e) => onDelete(event.id, e)}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete event"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <span className="h-8 w-8 rounded-full flex items-center justify-center text-primary bg-primary/0 group-hover:bg-primary/10 transition-colors" aria-hidden="true">
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default EventCardV2;
