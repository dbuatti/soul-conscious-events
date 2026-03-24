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
    <Card className="group flex flex-col sm:flex-row shadow-md rounded-xl border border-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden dark:bg-card dark:border-border">
      {event.image_url && (
        <div className="relative w-full sm:w-1/3 md:w-2/5 flex-shrink-0 aspect-video sm:aspect-square md:aspect-video overflow-hidden">
          <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {event.event_type && (
              <Badge variant="secondary" className="bg-primary/90 text-primary-foreground text-[10px] sm:text-xs px-2 py-0.5 font-bold backdrop-blur-sm">
                {event.event_type.toUpperCase()}
              </Badge>
            )}
            {isFeaturedToday && (
              <Badge variant="default" className="bg-yellow-500 text-black text-[10px] sm:text-xs px-2 py-0.5 font-bold animate-pulse">
                TODAY
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => onShare(event, e)}
            title="Share Event"
            className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/20 text-white hover:bg-white hover:text-primary backdrop-blur-md transition-all duration-300"
          >
            <Share2 className="h-3.5 w-3.5 sm:h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between" onClick={() => onViewDetails(event)}>
        <CardHeader className="p-0 pb-3 space-y-2">
          <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground leading-tight group-hover:text-primary transition-colors">
            {event.event_name}
          </CardTitle>          
          <div className="flex flex-col text-muted-foreground text-xs sm:text-sm space-y-1.5">
            <div className="flex items-center font-medium">
              <Calendar className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span>{format(parseISO(event.event_date), 'MMM d, yyyy')}</span>
              {event.end_date && event.event_date !== event.end_date && (
                <span> - {format(parseISO(event.end_date), 'MMM d')}</span>
              )}
            </div>
            <div className="flex items-center">
              <Clock className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span>{event.event_time || 'Time TBD'}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              {renderLocation()}
            </div>
            {event.price && (
              <div className="flex items-center">
                <DollarSign className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span className="font-semibold text-foreground">{displayPrice}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardFooter className="p-0 pt-3 flex justify-end items-center space-x-1 border-t border-border/50">
          <BookmarkButton eventId={event.id} size="icon" className="h-8 w-8 hover:bg-primary/10" />
          {isCreatorOrAdmin && (
            <>
              <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" title="Edit Event" className="h-8 w-8 hover:bg-primary/10">
                  <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={(e) => onDelete(event.id, e)} title="Delete Event" className="h-8 w-8 hover:bg-destructive/10">
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