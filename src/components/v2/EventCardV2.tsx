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
  isFeaturedToday?: boolean; // New prop for the "Featured Today" badge
  isWalkIn?: boolean; // Placeholder prop for "Walk-in" badge
  isRSVPRecommended?: boolean; // Placeholder prop for "RSVP recommended" badge
}

const EventCardV2: React.FC<EventCardV2Props> = ({
  event,
  onShare,
  onDelete,
  onViewDetails,
  isFeaturedToday = false,
  isWalkIn = false, // Default to false
  isRSVPRecommended = false, // Default to false
}) => {
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

  const renderLocation = () => {
    const locationText = event.place_name || event.geographical_state;
    if (!locationText) return 'Location TBD';

    if (event.google_maps_link) {
      return (
        <a
          href={event.google_maps_link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking link
        >
          {locationText}
        </a>
      );
    }
    return locationText;
  };

  return (
    <Card className="group flex flex-col sm:flex-row shadow-lg rounded-lg border border-border hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden dark:bg-card dark:border-border" onClick={() => onViewDetails(event)}>
      {event.image_url && (
        <div className="relative w-full sm:w-40 aspect-video sm:aspect-square overflow-hidden flex-shrink-0"> {/* Changed sm:w-1/3 to sm:w-40 */}
          <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          
          {/* Top Left Badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {isFeaturedToday && (
              <Badge variant="default" className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                FEATURED TODAY
              </Badge>
            )}
            {isWalkIn && ( // Placeholder for Walk-in
              <Badge variant="secondary" className="bg-blue-500 text-white text-xs px-2 py-0.5">
                Walk-in
              </Badge>
            )}
            {isRSVPRecommended && ( // Placeholder for RSVP
              <Badge variant="secondary" className="bg-purple-500 text-white text-xs px-2 py-0.5">
                RSVP recommended
              </Badge>
            )}
          </div>

          {/* Top Right Share Button */}
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => onShare(event, e)}
            title="Share Event"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 text-foreground hover:bg-white transition-all duration-300 ease-in-out transform hover:scale-110"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-lg sm:text-xl font-bold text-foreground mb-1">{event.event_name}</CardTitle>
          {/* Changed CardDescription to a div to fix nesting warning */}
          <div className="flex flex-col text-muted-foreground text-xs sm:text-sm">
            <div className="flex items-center mb-1">
              <Clock className="mr-1 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-primary" />
              {event.event_time || 'Time TBD'}
              <span className="mx-1">•</span>
              <Calendar className="mr-1 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-primary" />
              {dateDisplay}
            </div>
            <div className="flex items-center mt-1">
              <MapPin className="mr-1 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-primary" />
              {renderLocation()}
            </div>
            {event.price && (
              <div className="flex items-center mt-1">
                <DollarSign className="mr-1 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-primary" />
                {event.price}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-2 flex-grow">
          {event.description && <p className="text-foreground leading-relaxed text-xs sm:text-sm line-clamp-2">{event.description}</p>}
        </CardContent>
        <CardFooter className="p-0 pt-3 flex justify-end space-x-1">
          <BookmarkButton eventId={event.id} size="icon" className="h-7 w-7 sm:h-8 sm:w-8" />
          {isCreatorOrAdmin && (
            <>
              <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="icon" title="Edit Event" className="h-7 w-7 sm:h-8 sm:w-8 transition-all duration-300 ease-in-out transform hover:scale-105">
                  <Edit className="h-3.5 w-3.5 sm:h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button variant="destructive" size="icon" onClick={(e) => onDelete(event.id, e)} title="Delete Event" className="h-7 w-7 sm:h-8 sm:w-8 transition-all duration-300 ease-in-out transform hover:scale-105">
                <Trash2 className="h-3.5 w-3.5 sm:h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </CardFooter>
      </div>
    </Card>
  );
};

export default EventCardV2;