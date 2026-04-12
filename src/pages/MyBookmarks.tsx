import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Bookmark, UserPlus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EventCardV2 from '@/components/v2/EventCardV2';
import EventDetailDialog from '@/components/EventDetailDialog';
import { Event } from '@/types/event';

interface BookmarkedEventData {
  event_id: string;
  events: Event[];
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
          approval_status,
          geographical_state,
          image_url,
          user_id,
          is_deleted,
          discount_code,
          google_maps_link
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarked events:', error);
      toast.error('Failed to load your bookmarked events.');
    } else {
      const typedData = data as unknown as BookmarkedEventData[];
      const eventsData = typedData.map(item => item.events?.[0]).filter(Boolean) as Event[];
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
    const baseId = event.id.split('-')[0];
    const eventUrl = `${window.location.origin}/events/${baseId}`;
    navigator.clipboard.writeText(eventUrl)
      .then(() => toast.success('Event link copied!'))
      .catch(() => toast.error('Failed to copy link.'));
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  if (isSessionLoading || loadingBookmarks) {
    return (
      <div className="w-full max-w-6xl px-4">
        <Skeleton className="h-16 w-1/3 mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-8">
              <Skeleton className="h-[400px] w-full rounded-[3rem]" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-2xl text-center p-12 organic-card rounded-[3rem] shadow-2xl">
        <UserPlus className="h-20 w-20 text-primary/20 mx-auto mb-8" />
        <h2 className="text-4xl font-heading font-bold mb-6">Join the Flow</h2>
        <p className="text-muted-foreground mb-10 text-lg leading-relaxed">
          Sign up or log in to save your favorite events and build your own soulful calendar.
        </p>
        <Link to="/login">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-12 py-8 text-xl font-black shadow-2xl transition-transform hover:scale-105">
            Sign Up / Log In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl px-4">
      <div className="mb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground">My Bookmarks</h1>
      </div>

      {bookmarkedEvents.length === 0 ? (
        <div className="p-24 organic-card rounded-[4rem] text-center border-dashed border-primary/20">
          <Sparkles className="h-24 w-24 text-primary/20 mx-auto mb-10" />
          <h3 className="text-4xl font-heading font-bold text-foreground mb-6">Your collection is empty</h3>
          <p className="text-muted-foreground mb-12 text-xl max-w-sm mx-auto font-medium">Start exploring and bookmark events you'd love to attend.</p>
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-12 py-8 text-xl font-black shadow-2xl transition-transform hover:scale-105">
              Discover Events
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {bookmarkedEvents.map((event) => (
            <EventCardV2
              key={event.id}
              event={event}
              onShare={handleShare}
              onDelete={() => {}}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}
      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />
    </div>
  );
};

export default MyBookmarks;