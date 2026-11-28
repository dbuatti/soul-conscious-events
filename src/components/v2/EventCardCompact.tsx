import React from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, isToday } from 'date-fns';
import { Clock, MapPin, Share2, Pencil, Trash2, Repeat, ArrowUpRight } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ResilientImage } from '@/components/v2/ResilientImage';
import { formatPriceShort, getBaseEventId } from '@/utils/event-utils';

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

const categoryBadgeColor = (eventType?: string | null) =>
  categoryColours[eventType || 'Other'] ?? categoryColours.Other;

interface EventCardCompactProps {
  event: Event;
  onViewDetails: (event: Event) => void;
  onDelete?: (eventId: string, e: React.MouseEvent) => void;
  additionalDatesCount?: number;
  /** Hide the date tile (e.g. when the list is already filtered to one day). */
  hideDate?: boolean;
}

const EventCardCompact: React.FC<EventCardCompactProps> = ({
  event,
  onViewDetails,
  onDelete,
  additionalDatesCount = 0,
  hideDate = false,
}) => {
  const { user, isAdmin } = useSession();
  const isCreatorOrAdmin = (!!user && user.id === event.user_id) || isAdmin;

  const eventDate = parseISO(event.event_date);
  const endDate = event.end_date ? parseISO(event.end_date) : null;
  const isMultiDay = endDate !== null && !isToday(eventDate) && endDate > eventDate;
  const isEventToday = isToday(eventDate);
  const isRecurring = !!(event.recurring_pattern || event.is_recurring_instance);

  const lowerPrice = event.price?.toLowerCase() ?? '';
  const isFree = lowerPrice.includes('free');
  const priceLabel = event.price ? formatPriceShort(event.price) : null;
  const baseId = getBaseEventId(event.id);
  const badgeColor = categoryBadgeColor(event.event_type);

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/events/${baseId}`;
    if (navigator.share) {
      try { await navigator.share({ title: event.event_name, url: shareUrl }); }
      catch (err) { if ((err as Error).name !== 'AbortError') toast.error('Failed to share.'); }
    } else {
      try { await navigator.clipboard.writeText(shareUrl); toast.success('Event link copied!'); }
      catch { toast.error('Failed to copy link.'); }
    }
  };

  return (
    <article
      className={cn(
        'group flex items-center gap-2.5 sm:gap-3 organic-card organic-card-hover rounded-xl overflow-hidden cursor-pointer py-2.5 px-3',
        isEventToday && 'ring-2 ring-primary/40',
      )}
      onClick={() => onViewDetails(event)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewDetails(event); } }}
      tabIndex={0}
      role="button"
      aria-label={`View details: ${event.event_name}, ${format(eventDate, 'EEEE d MMMM')}`}
    >
      {/* Date tile */}
      {!hideDate && (
      <div className="flex flex-col items-center justify-center w-9 sm:w-12 shrink-0 leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-primary">{format(eventDate, 'EEE')}</span>
        <span className="font-heading text-xl font-semibold text-foreground mt-0.5">{format(eventDate, 'd')}</span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">{format(eventDate, 'MMM')}</span>
      </div>
      )}

      {/* Image */}
      <div className="relative h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
        <ResilientImage
          src={event.image_url || undefined}
          alt={event.event_name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="80px"
          widths={[160, 320]}
        />
        {event.event_type && (
          <span
            className="absolute bottom-1 left-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wide text-white drop-shadow"
            style={{ backgroundColor: badgeColor }}
          >
            {event.event_type}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isEventToday && (
            <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Today</span>
          )}
          {isRecurring && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-sage/15 text-sage px-2 py-0.5 text-[9px] font-semibold">
              <Repeat className="h-2.5 w-2.5" /> {event.recurring_pattern ? event.recurring_pattern.charAt(0) + event.recurring_pattern.slice(1).toLowerCase() : 'Recurring'}
            </span>
          )}
          {isMultiDay && endDate && (
            <span className="inline-flex items-center rounded-full bg-accent/20 text-foreground/80 px-2 py-0.5 text-[9px] font-semibold">
              Until {format(endDate, 'EEE d MMM')}
            </span>
          )}
          {additionalDatesCount > 0 && (
            <span className="text-[9px] text-muted-foreground">+{additionalDatesCount} more</span>
          )}
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-foreground font-heading leading-tight line-clamp-2 sm:line-clamp-1 group-hover:text-primary transition-colors">
          {event.event_name}
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 text-xs text-muted-foreground min-w-0">
          <span className="flex items-center gap-1 truncate">
            <Clock className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate">{event.event_time || 'Time TBC'}</span>
          </span>
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate">{event.place_name || 'Location TBC'}{event.geographical_state && ` · ${event.geographical_state}`}</span>
          </span>
        </div>
        {priceLabel && (
          <span className={cn('text-xs font-semibold', isFree ? 'text-sage' : 'text-foreground')}>{priceLabel}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 self-start sm:self-center">
        <button type="button" onClick={handleNativeShare} className="hidden sm:flex h-8 w-8 rounded-full items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" aria-label={`Share ${event.event_name}`}>
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <BookmarkButton eventId={event.id} size="icon" className="h-8 w-8 rounded-full bg-transparent hover:bg-primary/10" />
        </div>
        {isCreatorOrAdmin && (
          <>
            <Link to={`/edit-event/${baseId}`} onClick={(e) => e.stopPropagation()} className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Edit event">
              <Pencil className="h-3.5 w-3.5" />
            </Link>
            {onDelete && (
              <button type="button" onClick={(e) => onDelete(event.id, e)} className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" aria-label="Delete event">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
        <span className="hidden sm:flex h-8 w-8 rounded-full items-center justify-center text-primary bg-primary/0 group-hover:bg-primary/10 transition-colors" aria-hidden="true">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
};

export default EventCardCompact;