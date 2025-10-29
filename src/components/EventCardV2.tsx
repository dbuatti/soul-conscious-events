import React from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/types/event';
import { cn } from '@/lib/utils';

interface EventCardV2Props {
  event: Event;
}

const EventCardV2: React.FC<EventCardV2Props> = ({ event }) => {
  const dateDisplay = event.end_date && event.event_date !== event.end_date
    ? `${format(parseISO(event.event_date), 'MMM d')} - ${format(parseISO(event.end_date), 'MMM d')}`
    : format(parseISO(event.event_date), 'MMM d');

  const isPastEvent = parseISO(event.event_date) < new Date();

  const getEventTypeBadgeVariant = (eventType?: string) => {
    switch (eventType) {
      case 'Workshop': return 'default';
      case 'Meditation': return 'secondary';
      case 'Music': return 'outline';
      case 'Sound Bath': return 'default';
      case 'Foraging': return 'secondary';
      case 'Community Gathering': return 'outline';
      case 'Open Mic': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Link to={`/events/${event.id}`} className={cn(
      "flex flex-col sm:flex-row bg-card rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.01] border border-border",
      isPastEvent && "opacity-70 grayscale"
    )}>
      {event.image_url && (
        <div className="w-full sm:w-1/3 flex-shrink-0 aspect-video sm:aspect-auto h-48 sm:h-auto">
          <img
            src={event.image_url}
            alt={event.event_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            {event.event_type && (
              <Badge variant={getEventTypeBadgeVariant(event.event_type)} className="text-xs px-2 py-0.5">
                {event.event_type}
              </Badge>
            )}
            {isPastEvent && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                Past Event
              </Badge>
            )}
            {/* Add other relevant tags like WALK-IN, WEEKLY, RECOMMENDED here if data is available */}
            {/* Example: <Badge variant="outline" className="text-xs px-2 py-0.5">WALK-IN</Badge> */}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">{event.event_name}</h3>
          <p className="text-sm text-muted-foreground flex items-center mb-1">
            <Calendar className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {dateDisplay}
            {event.event_time && (
              <>
                <Clock className="h-3.5 w-3.5 ml-3 mr-1 flex-shrink-0" /> {event.event_time}
              </>
            )}
          </p>
          {(event.place_name || event.full_address) && (
            <p className="text-sm text-muted-foreground flex items-center">
              <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {event.place_name || event.full_address}
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          {event.price && (
            <p className="text-sm font-medium text-primary flex items-center">
              <DollarSign className="h-4 w-4 mr-1" /> {event.price}
            </p>
          )}
          {/* Add other actions like "View Details" button here if needed */}
        </div>
      </div>
    </Link>
  );
};

export default EventCardV2;