import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, Share2, Edit, Trash2, Tag, Repeat } from 'lucide-react'; // Added Repeat icon
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
  isWalkIn?: boolean;
  isRSVPRecommended?: boolean;
}

const EventCardV2: React.FC<EventCardV2Props> = ({
  event,
  onShare,
  onDelete,
  onViewDetails,
  isFeaturedToday = false,
  isWalkIn = false,
  isRSVPRecommended = false,
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

  const displayPrice = event.price ? event.price.replace(/\$/g, '') : ''; // Remove dollar signs for display

  return (
    <Card className="group flex flex-row shadow-lg rounded-xl border border-border hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden dark:bg-card dark:border-border">
      {event.image_url && (
        <div className="relative w-2/5 flex-shrink-0 aspect-square sm:aspect-video overflow-hidden"> {/* Adjusted width and aspect ratio */}
          <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          
          {/* Overlay Pills */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {event.event_type && ( // Category as overlay pill
              <Badge variant="secondary" className="bg-primary/80 text-primary-foreground text-xs px-2 py-0.5 font-semibold">
                {event.event_type}
              </Badge>
            )}
            {event.recurring_pattern && ( // Recurrence as overlay pill
              <Badge variant="secondary" className="bg-blue-500 text-white text-xs px-2 py-0.5 font-semibold">
                {event.recurring_pattern.charAt(0) + event.recurring_pattern.slice(1).toLowerCase()}
              </Badge>
            )}
            {isFeaturedToday && (
              <Badge variant="default" className="bg-primary text-primary-foreground text-xs px-2 py-0.5 font-semibold">
                FEATURED TODAY
              </Badge>
            )}
            {isWalkIn && (
              <Badge variant="secondary" className="bg-blue-500 text-white text-xs px-2 py-0.5 font-semibold">
                Walk-in
              </Badge>
            )}
            {isRSVPRecommended && (
              <Badge variant="secondary" className="bg-purple-500 text-white text-xs px-2 py-0.5 font-semibold">
                RSVP recommended
              </Badge>
            )}
          </div>

          {/* Top Right Share Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => onShare(event, e)}
            title="Share Event"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 text-foreground hover:bg-white transition-all duration-300 ease-in-out transform hover:scale-110"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between" onClick={() => onViewDetails(event)}> {/* Added onClick here */}
        <CardHeader className="p-0 pb-3 space-y-2">
          <CardTitle className="text-xl font-extrabold text-foreground leading-tight">
            {event.event_name}
          </CardTitle>          
          <div className="flex flex-col text-muted-foreground text-sm space-y-1">
            <div className="flex items-center">
              <Calendar className="mr-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">{format(parseISO(event.event_date), 'MMM d')}</span>
              {event.end_date && event.event_date !== event.end_date && (
                <span className="font-medium"> - {format(parseISO(event.end_date), 'MMM d')}</span>
              )}
            </div>
            <div className="flex items-center">
              <Clock className="mr-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">{event.event_time || 'Time TBD'}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              {renderLocation()}
            </div>
            {event.price && (
              <div className="flex items-center">
                <DollarSign className="mr-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="font-medium">{displayPrice}</span>
              </div>
            )}
          </div>
        </CardHeader>
        {/* Removed CardContent with description */}
        <CardFooter className="p-0 pt-4 flex justify-end space-x-2">
          <BookmarkButton eventId={event.id} size="icon" className="h-8 w-8" />
          {isCreatorOrAdmin && (
            <>
              <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" title="Edit Event" className="h-8 w-8 transition-all duration-300 ease-in-out transform hover:scale-105">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={(e) => onDelete(event.id, e)} title="Delete Event" className="h-8 w-8 transition-all duration-300 ease-in-out transform hover:scale-105">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </CardFooter>
      </div>
    </Card>
  );
};

export default EventCardV2;