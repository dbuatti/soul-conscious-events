import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown, PlusCircle, UserPlus, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import UserEventCard from '@/components/UserEventCard';
import { Event } from '@/types/event';
import SEO from '@/components/SEO';
import PageHeader from '@/components/v2/PageHeader';

const MyEvents: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const [loadFailed, setLoadFailed] = useState(false);

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
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Error fetching user events:', error);
      toast.error('Failed to load your events.');
      setLoadFailed(true);
    } else {
      const validEvents = (data || []).filter(event => event.id && event.id.length > 30);
      setEvents(validEvents as Event[]);
      setVisibleCount(6);
      setLoadFailed(false);
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
              <Skeleton className="h-[400px] w-full rounded-[2rem]" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-2xl text-center p-12 organic-card rounded-[2rem] shadow-2xl">
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

  if (loadFailed) {
    return (
      <div className="w-full max-w-2xl text-center p-12 organic-card rounded-[2rem] shadow-2xl">
        <AlertCircle className="h-20 w-20 text-destructive/40 mx-auto mb-8" />
        <h2 className="text-4xl font-heading font-bold mb-6">We couldn’t load your events</h2>
        <p className="text-muted-foreground mb-10 text-lg leading-relaxed">
          Something went wrong reaching the server. Please try again.
        </p>
        <Button onClick={fetchMyEvents} className="rounded-full px-10 py-6 text-lg font-semibold shadow-xl">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl px-4">
      <SEO 
        title="My Events | SoulFlow Australia"
        description="Manage your submitted events, edit details, duplicate listings, or add new soulful gatherings to the SoulFlow platform."
      />
      <PageHeader
        eyebrow="Your listings"
        title={<>My events{events.length > 0 && <span className="text-muted-foreground/50 font-medium"> ({events.length})</span>}</>}
        description="Edit, duplicate or remove the gatherings you've shared."
      />

      <div className="flex justify-end mb-8">
        <Link to="/submit-event">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-full px-6 py-3 text-base font-bold shadow-md transition-transform hover:scale-105">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Event
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="p-12 organic-card rounded-[1.5rem] text-center border-dashed border-primary/20">
          <Frown className="h-16 w-16 text-primary/20 mx-auto mb-6" />
          <h3 className="text-2xl font-heading font-bold text-foreground mb-4">No events yet</h3>
          <p className="text-muted-foreground mb-8 text-base max-w-sm mx-auto">You haven't submitted any events to SoulFlow yet.</p>
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-full px-8 py-4 text-base font-bold shadow-lg transition-transform hover:scale-105">
              Submit Your First Event
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.slice(0, visibleCount).map((event) => (
              <UserEventCard key={event.id} event={event} onEventDeleted={fetchMyEvents} />
            ))}
          </div>
          {events.length > visibleCount && (
            <div className="flex flex-col items-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => c + 6)}
                className="rounded-full h-11 px-8 font-semibold bg-card"
              >
                Show more ({events.length - visibleCount} remaining)
              </Button>
              <span className="text-xs text-muted-foreground">Showing {Math.min(visibleCount, events.length)} of {events.length}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyEvents;