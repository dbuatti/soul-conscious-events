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
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking link
        >
          {locationText}
        </a>
      );
    }
    return <span className="font-medium">{locationText}</span>;
  };

  return (
    <Card className="group flex flex-col sm:flex-row shadow-lg rounded-lg border border-border hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden dark:bg-card dark:border-border" onClick={() => onViewDetails(event)}>
      {event.image_url && (
        <div className="relative w-full sm:w-48 aspect-video sm:aspect-square overflow-hidden flex-shrink-0"> {/* Increased width for image */}
          <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          
          {/* Top Left Badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {isFeaturedToday && (
              <Badge variant="default" className="bg-primary text-primary-foreground text-xs px-2 py-0.5 font-semibold">
                FEATURED TODAY
              </Badge>
            )}
            {isWalkIn && ( // Placeholder for Walk-in
              <Badge variant="secondary" className="bg-blue-500 text-white text-xs px-2 py-0.5 font-semibold">
                Walk-in
              </Badge>
            )}
            {isRSVPRecommended && ( // Placeholder for RSVP
              <Badge variant="secondary" className="bg-purple-500 text-white text-xs px-2 py-0.5 font-semibold">
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
          <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground mb-1 leading-tight">{event.event_name}</CardTitle> {/* Increased font size and weight */}
          {/* Changed CardDescription to a div to fix nesting warning */}
          <div className="flex flex-col text-muted-foreground text-sm sm:text-base space-y-1"> {/* Increased font size and spacing */}
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="font-medium">{event.event_time || 'Time TBD'}</span>
              <span className="mx-2">•</span>
              <Calendar className="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="font-medium">{dateDisplay}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
              {renderLocation()}
            </div>
            {event.price && (
              <div className="flex items-center">
                <DollarSign className="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="font-medium">{event.price}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-2 flex-grow">
          {event.description && <p className="text-foreground leading-relaxed text-sm sm:text-base line-clamp-3">{event.description}</p>} {/* Increased line-clamp */}
        </CardContent>
        <CardFooter className="p-0 pt-3 flex justify-end space-x-2"> {/* Increased spacing */}
          <BookmarkButton eventId={event.id} size="icon" className="h-8 w-8 sm:h-9 sm:w-9" /> {/* Increased button size */}
          {isCreatorOrAdmin && (
            <>
              <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="icon" title="Edit Event" className="h-8 w-8 sm:h-9 sm:w-9 transition-all duration-300 ease-in-out transform hover:scale-105">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="destructive" size="icon" onClick={(e) => onDelete(event.id, e)} title="Delete Event" className="h-8 w-8 sm:h-9 sm:w-9 transition-all duration-300 ease-in-out transform hover:scale-105">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </CardFooter>
      </div>
    </Card>
  );
};

export default EventCardV2;