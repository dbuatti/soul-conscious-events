import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, PlusCircle, UserPlus, CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import UserEventCard from '@/components/UserEventCard';
import { Event } from '@/types/event';

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
      .eq('is_deleted', false)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching user events:', error);
      toast.error('Failed to load your events.');
    } else {
      const validEvents = (data || []).filter(event => event.id && event.id.length > 30);
      setEvents(validEvents as Event[]);
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
        <h2 className="text-4xl font-heading font-bold mb-6">Manage Your Events</h2>
        <p className="text-muted-foreground mb-10 text-lg leading-relaxed">
          Sign up or log in to create and manage your soulful gatherings on SoulFlow.
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
      <div className="mb-16 text-center space-y-4">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-[0.2em] uppercase">
          <CalendarCheck className="h-3 w-3 mr-2" /> Your Contributions
        </div>
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground">My Events</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
          Manage and track the events you've shared with the community.
        </p>
      </div>

      <div className="flex justify-end mb-12">
        <Link to="/submit-event">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-8 py-6 text-lg font-black shadow-xl transition-transform hover:scale-105">
            <PlusCircle className="mr-2 h-6 w-6" /> Add New Event
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="p-24 organic-card rounded-[4rem] text-center border-dashed border-primary/20">
          <Frown className="h-24 w-24 text-primary/20 mx-auto mb-10" />
          <h3 className="text-4xl font-heading font-bold text-foreground mb-6">No events yet</h3>
          <p className="text-muted-foreground mb-12 text-xl max-w-sm mx-auto font-medium">You haven't submitted any events to SoulFlow yet.</p>
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-12 py-8 text-xl font-black shadow-2xl transition-transform hover:scale-105">
              Submit Your First Event
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {events.map((event) => (
            <UserEventCard key={event.id} event={event} onEventDeleted={fetchMyEvents} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyEvents;