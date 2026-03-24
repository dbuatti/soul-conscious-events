import React from 'react';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, Share2, Edit, Trash2 } from 'lucide-react';
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
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {locationText}
        </a>
      );
    }
    return <span className="font-medium">{locationText}</span>;
  };

  const displayPrice = event.price ? event.price.replace(/\$/g, '') : '';

  return (
    <Card 
      className="group flex flex-col sm:flex-row shadow-md rounded-xl border border-border hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1.5 cursor-pointer overflow-hidden dark:bg-card dark:border-border animate-in fade-in slide-in-from-bottom-4"
    >
      {event.image_url && (
        <div className="relative w-full sm:w-1/3 md:w-2/5 flex-shrink-0 aspect-video sm:aspect-square md:aspect-video overflow-hidden">
          <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
          
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {event.event_type && (
              <Badge variant="secondary" className="bg-primary/90 text-primary-foreground text-[10px] sm:text-xs px-2.5 py-0.5 font-bold backdrop-blur-md border-none shadow-sm">
                {event.event_type.toUpperCase()}
              </Badge>
            )}
            {isFeaturedToday && (
              <Badge variant="default" className="bg-yellow-500 text-black text-[10px] sm:text-xs px-2.5 py-0.5 font-bold animate-pulse border-none shadow-sm">
                TODAY
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => onShare(event, e)}
            title="Share Event"
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white hover:text-primary backdrop-blur-md transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between" onClick={() => onViewDetails(event)}>
        <CardHeader className="p-0 pb-4 space-y-2.5">
          <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight group-hover:text-primary transition-colors font-heading tracking-tight">
            {event.event_name}
          </CardTitle>          
          <div className="flex flex-col text-muted-foreground text-sm space-y-2">
            <div className="flex items-center font-medium">
              <Calendar className="mr-2.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span>{format(parseISO(event.event_date), 'MMM d, yyyy')}</span>
              {event.end_date && event.event_date !== event.end_date && (
                <span> - {format(parseISO(event.end_date), 'MMM d')}</span>
              )}
            </div>
            <div className="flex items-center">
              <Clock className="mr-2.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span>{event.event_time || 'Time TBD'}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2.5 h-4 w-4 flex-shrink-0 text-primary" />
              {renderLocation()}
            </div>
            {event.price && (
              <div className="flex items-center">
                <DollarSign className="mr-2.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="font-semibold text-foreground">{displayPrice}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardFooter className="p-0 pt-4 flex justify-end items-center space-x-2 border-t border-border/50">
          <BookmarkButton eventId={event.id} size="icon" className="h-9 w-9 hover:bg-primary/10 rounded-full" />
          {isCreatorOrAdmin && (
            <>
              <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" title="Edit Event" className="h-9 w-9 hover:bg-primary/10 rounded-full">
                  <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={(e) => onDelete(event.id, e)} title="Delete Event" className="h-9 w-9 hover:bg-destructive/10 rounded-full">
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </>
          )}
        </CardFooter>
      </div>
    </Card>
  );
};

export default EventCardV2;