import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, PlusCircle, Loader2, UserPlus, CalendarCheck } from 'lucide-react'; // Added UserPlus
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import UserEventCard from '@/components/UserEventCard';
import { Event } from '@/types/event'; // Import the shared Event type

const MyEvents: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const fetchMyEvents = useCallback(async () => {
    if (!user) {
      setLoadingEvents(false);
      return;
    }

    setLoadingEvents(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching user events:', error);
      toast.error('Failed to load your events.');
    } else {
      setEvents(data || []);
    }
    setLoadingEvents(false);
  }, [user]);

  useEffect(() => {
    if (!isSessionLoading) {
      fetchMyEvents();
    }
  }, [isSessionLoading, fetchMyEvents]);

  if (isSessionLoading || loadingEvents) {
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
          Sign up or log in to create and manage your events!
        </p>
        <p className="text-muted-foreground mb-6">
          As a registered user, you can easily submit new events, edit your existing ones, and track their approval status.
        </p>
        <Link to="/login">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground">
            <CalendarCheck className="mr-2 h-4 w-4" /> Sign Up / Log In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-lg">
      <h1 className="text-4xl font-bold text-foreground mb-6 text-center">My Events</h1>
      <p className="text-xl text-muted-foreground mb-8 text-center leading-relaxed">
        Here are all the events you've submitted to SoulFlow.
      </p>

      <div className="flex justify-end mb-6">
        <Link to="/submit-event">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="p-8 bg-secondary rounded-lg border border-border text-center">
          <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-4">You haven't submitted any events yet.</p>
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Submit Your First Event!
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <UserEventCard key={event.id} event={event} onEventDeleted={fetchMyEvents} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyEvents;