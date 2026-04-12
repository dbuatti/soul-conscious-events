import React, { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, parseISO, isToday, isTomorrow, differenceInDays, differenceInHours, formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, Share2, Edit, Trash2, ArrowRight, Copy, Sparkles } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getBaseEventId } from '@/utils/event-utils';

interface EventCardV2Props {
  event: Event;
  onShare: (event: Event, e: React.MouseEvent) => void;
  onDelete: (eventId: string, e: React.MouseEvent) => void;
  onViewDetails: (event: Event) => void;
  isFeaturedToday?: boolean;
}

const EventCardV2: React.FC<EventCardV2Props> = ({
  event,
  onShare,
  onDelete,
  onViewDetails,
  isFeaturedToday = false,
}) => {
  const { user } = useSession();
  const isAdmin = user?.email === 'daniele.buatti@gmail.com';
  const isCreatorOrAdmin = user?.id === event.user_id || isAdmin;
  const [imageLoaded, setImageLoaded] = useState(false);

  const isFree = event.price?.toLowerCase().includes('free');
  const isDonation = event.price?.toLowerCase().includes('donation');
  const displayPrice = event.price ? event.price.replace(/\$/g, '') : '';

  const eventDate = parseISO(event.event_date);
  const endDate = event.end_date ? parseISO(event.end_date) : null;
  
  // Smart Date Label
  let dateLabel = format(eventDate, 'EEEE, MMMM d');
  const isEventToday = isToday(eventDate);
  if (isEventToday) dateLabel = 'Today';
  else if (isTomorrow(eventDate)) dateLabel = 'Tomorrow';

  // Duration Label
  const durationDays = endDate ? differenceInDays(endDate, eventDate) + 1 : 1;
  const durationLabel = durationDays > 1 ? `${durationDays} days` : null;

  // "NEW" Badge Logic (Created in last 24 hours)
  const createdAt = event.created_at ? parseISO(event.created_at) : null;
  const isNew = createdAt ? Math.abs(differenceInHours(new Date(), createdAt)) < 24 : false;

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const baseId = getBaseEventId(event.id);
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
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share.');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Event link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link.');
      }
    }
  };

  const baseId = getBaseEventId(event.id);

  return (
    <Card 
      className="group flex flex-col organic-card rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-700"
      onClick={() => onViewDetails(event)}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-secondary/30">
        {!imageLoaded && event.image_url && <Skeleton className="absolute inset-0 z-10" />}
        
        {event.image_url ? (
          <img 
            src={event.image_url} 
            alt={event.event_name} 
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "w-full h-full object-cover transition-all duration-1000 group-hover:scale-110",
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            )} 
            loading="lazy" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center">
            <span className="text-primary/30 font-heading text-2xl sm:text-4xl italic font-bold tracking-tighter">SoulFlow</span>
          </div>
        )}
        
        <div className="absolute top-3 left-3 sm:top-6 sm:left-6 flex flex-wrap gap-1.5 sm:gap-2 z-20">
          {event.event_type && (
            <Badge className="bg-white/90 dark:bg-black/60 text-primary text-[8px] sm:text-[10px] px-2 py-0.5 sm:px-4 sm:py-1.5 font-black tracking-widest border-none shadow-lg rounded-full">
              {event.event_type.toUpperCase()}
            </Badge>
          )}
          {isEventToday && (
            <Badge className="bg-accent text-white text-[8px] sm:text-[10px] px-2 py-0.5 sm:px-4 sm:py-1.5 font-black tracking-widest border-none shadow-lg rounded-full animate-pulse">
              TODAY
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex gap-1.5 sm:gap-2 z-20">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleNativeShare}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-xl bg-white/90 hover:bg-white"
          >
            <Share2 className="h-3.5 w-3.5 sm:h-4 w-4 text-primary" />
          </Button>

          <div onClick={(e) => e.stopPropagation()}>
            <BookmarkButton eventId={event.id} size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-xl bg-white/90 dark:bg-black/60" />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-8 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-3 sm:mb-6">
          <CardTitle className="text-lg sm:text-3xl font-black text-foreground leading-tight font-heading tracking-tight group-hover:text-primary transition-colors">
            {event.event_name}
          </CardTitle>
          {event.price && (
            <div className="flex items-center bg-primary text-white px-2 py-0.5 sm:px-4 sm:py-1.5 rounded-full shadow-md flex-shrink-0 ml-2 sm:ml-4">
              {!isFree && !isDonation && <DollarSign className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 mr-0.5" />}
              <span className="font-black text-[9px] sm:text-sm">{displayPrice}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 sm:space-y-4 text-muted-foreground text-[11px] sm:text-sm mb-4 sm:mb-8">
          <div className="flex items-center font-bold text-foreground/80">
            <Calendar className="mr-2 sm:mr-3 h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
            <span className={cn(isEventToday && "text-primary")}>{dateLabel}</span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-2 sm:mr-3 h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary/60" />
            <span>{event.event_time || 'Time TBD'}</span>
          </div>
          <div className="flex items-start">
            <MapPin className="mr-2 sm:mr-3 h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary/60 mt-0.5" />
            <span className="line-clamp-1">{event.place_name || event.geographical_state || 'Location TBD'}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3 sm:pt-6 border-t border-border/50">
          <div className="flex gap-1">
            {isCreatorOrAdmin && (
              <>
                <Link to={`/edit-event/${baseId}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-10 sm:w-10 hover:bg-primary/10 rounded-full">
                    <Edit className="h-3.5 w-3.5 sm:h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={(e) => onDelete(event.id, e)} className="h-7 w-7 sm:h-10 sm:w-10 hover:bg-destructive/10 rounded-full">
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </>
            )}
          </div>
          <Button variant="link" className="text-primary font-black p-0 group/btn text-xs sm:text-base hover:no-underline">
            Explore <ArrowRight className="ml-1 sm:ml-2 h-3.5 w-3.5 sm:h-5 sm:w-5 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EventCardV2;