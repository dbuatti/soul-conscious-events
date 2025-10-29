import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, Share2, Edit, Trash2 } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { Event } from '@/types/event'; // Reusing existing Event type
import BookmarkButton from '@/components/BookmarkButton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EventCardV2Props {
  event: Event;
  onShare: (event: Event, e: React.MouseEvent) => void;
  onDelete: (eventId: string, e: React.MouseEvent) => void;
  onViewDetails: (event: Event) => void;
}

const EventCardV2: React.FC<EventCardV2Props> = ({ event, onShare, onDelete, onViewDetails }) => {
  const { user } = useSession();
  const isAdmin = user?.email === 'daniele.buatti@gmail.com';
  const isCreatorOrAdmin = user?.id === event.user_id || isAdmin;

  const dateDisplay = event.end_date && event.event_date !== event.end_date
    ? `${format(parseISO(event.event_date), 'MMM d')} - ${format(parseISO(event.end_date), 'MMM d, yyyy')}`
    : format(parseISO(event.event_date), 'MMM d, yyyy');

  const getPriceBadgeVariant = (price: string | undefined) => {
    if (!price) return 'outline';
    const lowerPrice = price.toLowerCase();
    if (lowerPrice.includes('free')) return 'default';
    if (lowerPrice.includes('donation')) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="group flex flex-col shadow-lg rounded-lg border border-border hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden dark:bg-card dark:border-border" onClick={() => onViewDetails(event)}>
      {event.image_url && (
        <div className="relative w-full aspect-video overflow-hidden">
          <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {event.event_type && (
              <Badge variant="secondary" className="bg-primary/80 text-primary-foreground text-xs px-2 py-0.5">
                {event.event_type}
              </Badge>
            )}
            {event.price && (
              <Badge variant={getPriceBadgeVariant(event.price)} className="text-xs px-2 py-0.5">
                {event.price.toLowerCase().includes('free') ? 'FREE' : event.price.toLowerCase().includes('donation') ? 'DONATION' : 'PAID'}
              </Badge>
            )}
            {/* Example of other badges, these would need logic based on event data */}
            {/* <Badge variant="outline" className="text-xs px-2 py-0.5">WALK-IN</Badge> */}
            {/* <Badge variant="outline" className="text-xs px-2 py-0.5">WEEKLY</Badge> */}
          </div>
        </div>
      )}
      <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
        <CardTitle className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">{event.event_name}</CardTitle>
        <CardDescription className="flex items-center text-muted-foreground text-sm sm:text-base">
          <Calendar className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
          {dateDisplay}
          {event.event_time && (
            <>
              <Clock className="ml-2 sm:ml-4 mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
              {event.event_time}
            </>
          )}
        </CardDescription>
        {(event.place_name || event.geographical_state) && (
          <CardDescription className="flex items-center text-muted-foreground text-sm sm:text-base mt-1">
            <MapPin className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
            {event.place_name || event.geographical_state}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2 space-y-1 sm:space-y-2 flex-grow">
        {event.description && <p className="text-foreground leading-relaxed text-sm sm:text-base line-clamp-3">{event.description}</p>}
      </CardContent>
      <CardFooter className="p-4 pt-2 flex justify-end space-x-1 sm:space-x-2">
        <BookmarkButton eventId={event.id} size="icon" className="h-7 w-7 sm:h-9 sm:w-9" />
        <Button variant="outline" size="icon" onClick={(e) => onShare(event, e)} title="Share Event" className="h-7 w-7 sm:h-9 sm:w-9 transition-all duration-300 ease-in-out transform hover:scale-105">
          <Share2 className="h-3.5 w-3.5 sm:h-4 w-4" />
        </Button>
        {isCreatorOrAdmin && (
          <>
            <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="icon" title="Edit Event" className="h-7 w-7 sm:h-9 sm:w-9 transition-all duration-300 ease-in-out transform hover:scale-105">
                <Edit className="h-3.5 w-3.5 sm:h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button variant="destructive" size="icon" onClick={(e) => onDelete(event.id, e)} title="Delete Event" className="h-7 w-7 sm:h-9 sm:w-9 transition-all duration-300 ease-in-out transform hover:scale-105">
              <Trash2 className="h-3.5 w-3.5 sm:h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default EventCardV2;