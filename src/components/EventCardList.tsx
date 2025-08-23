import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Share2, Edit, Trash2 } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, PlusCircle } from 'lucide-react';

interface EventCardListProps {
  events: Event[];
  loading?: boolean;
  onShare: (event: Event, e: React.MouseEvent) => void;
  onDelete: (eventId: string, e: React.MouseEvent) => void;
  onViewDetails: (event: Event) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const EventCardList: React.FC<EventCardListProps> = ({
  events,
  loading = false,
  onShare,
  onDelete,
  onViewDetails,
  hasActiveFilters = false,
  onClearFilters,
}) => {
  const { user } = useSession();
  const isAdmin = user?.email === 'daniele.buatti@gmail.com';

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shadow-lg rounded-lg">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 bg-secondary rounded-lg border border-border text-center">
        <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-semibold text-foreground mb-4">No events found matching your criteria.</p>
        {hasActiveFilters && onClearFilters ? (
          <Button onClick={onClearFilters} className="bg-primary hover:bg-primary/80 text-primary-foreground">Clear Filters</Button>
        ) : (
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Add an Event
            </Button>
          </Link>
        )}
      </div>
    );
  }

  const renderEventCard = (event: Event) => {
    const isCreatorOrAdmin = user?.id === event.user_id || isAdmin;
    const dateDisplay = event.end_date && event.event_date !== event.end_date
      ? `${format(parseISO(event.event_date), 'PPP')} - ${format(parseISO(event.end_date), 'PPP')}`
      : format(parseISO(event.event_date), 'PPP');

    return (
      <Card key={event.id} className="group flex flex-col justify-between shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden" onClick={() => onViewDetails(event)}>
        {event.image_url && (
          <div className="relative w-full aspect-video overflow-hidden">
            <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
          <CardTitle className="text-xl sm:text-2xl font-bold text-primary mb-1 sm:mb-2">{event.event_name}</CardTitle>
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
        </CardHeader>
        <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2 space-y-1 sm:space-y-2">
          {event.description && <p className="text-foreground leading-relaxed text-sm sm:text-base line-clamp-3">{event.description}</p>}
        </CardContent>
        <CardFooter className="flex flex-col items-start pt-2 sm:pt-4">
          <div className="flex justify-end w-full space-x-1 sm:space-x-2">
            <BookmarkButton eventId={event.id} size="icon" className="h-7 w-7 sm:h-9 sm:w-9" />
            <Button variant="outline" size="icon" onClick={(e) => onShare(event, e)} title="Share Event" className="h-7 w-7 sm:h-9 sm:w-9">
              <Share2 className="h-3.5 w-3.5 sm:h-4 w-4" />
            </Button>
            {isCreatorOrAdmin && (
              <>
                <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="icon" title="Edit Event" className="h-7 w-7 sm:h-9 sm:w-9">
                    <Edit className="h-3.5 w-3.5 sm:h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button variant="destructive" size="icon" onClick={(e) => onDelete(event.id, e)} title="Delete Event" className="h-7 w-7 sm:h-9 sm:w-9">
                  <Trash2 className="h-3.5 w-3.5 sm:h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {events.map(renderEventCard)}
    </div>
  );
};

export default EventCardList;