import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, Bookmark, Loader2, UserPlus } from 'lucide-react'; // Added UserPlus
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Share2, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import EventDetailDialog from '@/components/EventDetailDialog';
import BookmarkButton from '@/components/BookmarkButton';
import { Event } from '@/types/event';

// Define the expected structure of the data returned by the Supabase query
interface BookmarkedEventData {
  event_id: string;
  events: Event | null; // 'events' is the name of the joined table, and it can be null if the related event is not found
}

const MyBookmarks: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [bookmarkedEvents, setBookmarkedEvents] = useState<Event[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(true);

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const fetchBookmarkedEvents = useCallback(async () => {
    if (!user) {
      setLoadingBookmarks(false);
      return;
    }

    setLoadingBookmarks(true);
    const { data, error } = await supabase
      .from('user_bookmarks')
      .select(`
        event_id,
        events (
          id,
          event_name,
          event_date,
          end_date,
          event_time,
          place_name,
          full_address,
          description,
          ticket_link,
          price,
          special_notes,
          organizer_contact,
          event_type,
          state,
          image_url,
          user_id,
          is_deleted,
          discount_code
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }); // Order by when they were bookmarked

    if (error) {
      console.error('Error fetching bookmarked events:', error);
      toast.error('Failed to load your bookmarked events.');
    } else {
      // Explicitly cast data to the expected type before mapping
      const typedData = data as BookmarkedEventData[];
      // Extract event data from the nested structure and filter out nulls
      const eventsData = typedData.map(item => item.events).filter(Boolean) as Event[];
      setBookmarkedEvents(eventsData);
    }
    setLoadingBookmarks(false);
  }, [user]);

  useEffect(() => {
    if (!isSessionLoading) {
      fetchBookmarkedEvents();
    }
  }, [isSessionLoading, fetchBookmarkedEvents]);

  const handleShare = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    navigator.clipboard.writeText(eventUrl)
      .then(() => toast.success('Event link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link. Please try again.'));
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const renderEventCard = (event: Event) => {
    const dateDisplay = event.end_date && event.event_date !== event.end_date
      ? `${format(parseISO(event.event_date), 'PPP')} - ${format(parseISO(event.end_date), 'PPP')}`
      : format(parseISO(event.event_date), 'PPP');

    return (
      <Card key={event.id} className="group flex flex-col justify-between shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 cursor-pointer overflow-hidden" onClick={() => handleViewDetails(event)}>
        {event.image_url && <div className="relative w-full aspect-video overflow-hidden"><img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" /><div className="absolute inset-0 bg-black/30"></div></div>}
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2"><CardTitle className="text-xl sm:text-2xl font-bold text-primary mb-1 sm:mb-2">{event.event_name}</CardTitle><CardDescription className="flex items-center text-muted-foreground text-sm sm:text-base"><Calendar className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />{dateDisplay}{event.event_time && <><Clock className="ml-2 sm:ml-4 mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />{event.event_time}</>}</CardDescription></CardHeader>
        <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2 space-y-1 sm:space-y-2">
          {event.description && <p className="text-foreground leading-relaxed text-sm sm:text-base line-clamp-3">{event.description}</p>}
        </CardContent>
        <CardFooter className="flex flex-col items-start pt-2 sm:pt-4">
          <div className="flex justify-end w-full space-x-1 sm:space-x-2">
            <BookmarkButton eventId={event.id} initialIsBookmarked={true} size="icon" className="h-7 w-7 sm:h-9 sm:w-9" />
            <Button variant="outline" size="icon" onClick={(e) => handleShare(event, e)} title="Share Event" className="h-7 w-7 sm:h-9 sm:w-9"><Share2 className="h-3.5 w-3.5 sm:h-4 w-4" /></Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

  if (isSessionLoading || loadingBookmarks) {
    return (
      <div className="w-full max-w-screen-lg">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-screen-lg text-center p-8 bg-secondary rounded-lg border border-border">
        <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-semibold text-foreground mb-4">
          Sign up or log in to save your favorite events!
        </p>
        <p className="text-muted-foreground mb-6">
          As a registered user, you can bookmark events to easily find them later and keep track of your interests.
        </p>
        <Link to="/login">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground">
            <Bookmark className="mr-2 h-4 w-4" /> Sign Up / Log In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-lg">
      <h1 className="text-4xl font-bold text-foreground mb-6 text-center">My Bookmarks</h1>
      <p className="text-xl text-muted-foreground mb-8 text-center leading-relaxed">
        Here are all the events you've saved.
      </p>

      {bookmarkedEvents.length === 0 ? (
        <div className="p-8 bg-secondary rounded-lg border border-border text-center">
          <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-4">You haven't bookmarked any events yet.</p>
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground">
              <Bookmark className="mr-2 h-4 w-4" /> Discover Events to Bookmark
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookmarkedEvents.map((event) => (
            <React.Fragment key={event.id}>
              {renderEventCard(event)}
            </React.Fragment>
          ))}
        </div>
      )}
      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />
    </div>
  );
};

export default MyBookmarks;