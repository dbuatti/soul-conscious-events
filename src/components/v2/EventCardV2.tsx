import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, Share2, Edit, Trash2, Tag } from 'lucide-react'; // Added Tag icon for category
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

  return (
    <Card className="group flex flex-row shadow-lg rounded-xl border border-border hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden dark:bg-card dark:border-border">
      {event.image_url && (
        <div className="relative w-[120px] h-[120px] flex-shrink-0 overflow-hidden rounded-l-xl"> {/* Fixed size and rounded-l-xl */}
          <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          
          {/* Overlay Pills */}
          <div className="absolute top-1 left-1 flex flex-wrap gap-0.5"> {/* Adjusted top/left and gap */}
            {event.event_type && ( // Category as overlay pill
              <Badge variant="secondary" className="bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0 font-semibold"> {/* Smaller text */}
                {event.event_type}
              </Badge>
            )}
            {isFeaturedToday && (
              <Badge variant="default" className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 font-semibold">
                FEATURED TODAY
              </Badge>
            )}
            {isWalkIn && (
              <Badge variant="secondary" className="bg-blue-500 text-white text-[10px] px-1.5 py-0 font-semibold">
                Walk-in
              </Badge>
            )}
            {isRSVPRecommended && (
              <Badge variant="secondary" className="bg-purple-500 text-white text-[10px] px-1.5 py-0 font-semibold">
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
            className="absolute top-1 right-1 h-7 w-7 rounded-full bg-white/80 text-foreground hover:bg-white transition-all duration-300 ease-in-out transform hover:scale-110"
          >
            <Share2 className="h-3.5 w-3.5" /> {/* Smaller icon */}
          </Button>
        </div>
      )}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between" onClick={() => onViewDetails(event)}> {/* Adjusted padding */}
        <CardHeader className="p-0 pb-2 space-y-1"> {/* Adjusted padding and space-y */}
          <CardTitle className="text-lg font-extrabold text-foreground leading-tight line-clamp-2"> {/* Smaller title, line-clamp */}
            {event.event_name}
          </CardTitle>          
          <div className="flex flex-col text-muted-foreground text-xs space-y-0.5"> {/* Smaller text and space-y */}
            <div className="flex items-center">
              <Clock className="mr-1 h-3 w-3 flex-shrink-0 text-muted-foreground" /> {/* Smaller icon */}
              <span className="font-medium">{event.event_time || 'Time TBD'}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-1 h-3 w-3 flex-shrink-0 text-muted-foreground" /> {/* Smaller icon */}
              {renderLocation()}
            </div>
            {event.price && (
              <div className="flex items-center">
                <DollarSign className="mr-1 h-3 w-3 flex-shrink-0 text-muted-foreground" /> {/* Smaller icon */}
                <span className="font-medium">{event.price}</span>
              </div>
            )}
          </div>
        </CardHeader>
        {/* Removed CardContent with description */}
        <CardFooter className="p-0 pt-3 flex justify-end space-x-1"> {/* Adjusted padding and space-x */}
          <BookmarkButton eventId={event.id} size="icon" className="h-7 w-7" /> {/* Smaller buttons */}
          {isCreatorOrAdmin && (
            <>
              <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" title="Edit Event" className="h-7 w-7 transition-all duration-300 ease-in-out transform hover:scale-105">
                  <Edit className="h-3.5 w-3.5 text-muted-foreground" /> {/* Smaller icon */}
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={(e) => onDelete(event.id, e)} title="Delete Event" className="h-7 w-7 transition-all duration-300 ease-in-out transform hover:scale-105">
                <Trash2 className="h-3.5 w-3.5 text-destructive" /> {/* Smaller icon */}
              </Button>
            </>
          )}
        </CardFooter>
      </div>
    </Card>
  );
};

export default EventCardV2;