import React from 'react';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, Share2, Edit, Trash2, ArrowRight } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

  const renderLocation = () => {
    const locationText = event.place_name || event.geographical_state;
    if (!locationText) return 'Location TBD';

    if (event.google_maps_link) {
      return (
        <a
          href={event.google_maps_link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/70 font-semibold transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {locationText}
        </a>
      );
    }
    return <span className="font-semibold">{locationText}</span>;
  };

  const displayPrice = event.price ? event.price.replace(/\$/g, '') : '';

  return (
    <Card 
      className="group flex flex-col shadow-2xl rounded-[2rem] border-none bg-white/60 dark:bg-white/5 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-500 cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-8"
      onClick={() => onViewDetails(event)}
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <span className="text-muted-foreground font-heading text-xl">SoulFlow</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
        
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {event.event_type && (
            <Badge variant="secondary" className="bg-white/90 dark:bg-black/60 text-foreground text-[10px] px-3 py-1 font-bold backdrop-blur-md border-none shadow-xl rounded-full">
              {event.event_type.toUpperCase()}
            </Badge>
          )}
          {isFeaturedToday && (
            <Badge variant="default" className="bg-accent text-accent-foreground text-[10px] px-3 py-1 font-bold animate-pulse border-none shadow-xl rounded-full">
              TODAY
            </Badge>
          )}
        </div>

        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 transition-all duration-500">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => onShare(event, e)}
            className="h-9 w-9 rounded-full bg-white/20 text-white hover:bg-white hover:text-primary backdrop-blur-md"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <BookmarkButton eventId={event.id} size="icon" className="h-9 w-9 rounded-full bg-white/20 text-white hover:bg-white hover:text-primary backdrop-blur-md" />
        </div>
      </div>

      <div className="p-6 sm:p-8 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight font-heading tracking-tight group-hover:text-primary transition-colors">
            {event.event_name}
          </CardTitle>
          {event.price && (
            <div className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              <span className="font-bold text-sm">{displayPrice}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-muted-foreground text-sm mb-6">
          <div className="flex items-center font-medium">
            <Calendar className="mr-3 h-4 w-4 text-primary/60" />
            <span>{format(parseISO(event.event_date), 'MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-3 h-4 w-4 text-primary/60" />
            <span>{event.event_time || 'Time TBD'}</span>
          </div>
          <div className="flex items-center sm:col-span-2">
            <MapPin className="mr-3 h-4 w-4 text-primary/60" />
            {renderLocation()}
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-border/40">
          <div className="flex gap-2">
            {isCreatorOrAdmin && (
              <>
                <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 rounded-full">
                    <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={(e) => onDelete(event.id, e)} className="h-9 w-9 hover:bg-destructive/10 rounded-full">
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </>
            )}
          </div>
          <Button variant="link" className="text-primary font-bold p-0 group/btn">
            View Details <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EventCardV2;