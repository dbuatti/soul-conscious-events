import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isSameDay, isSameMonth, isPast } from 'date-fns';
import { Lightbulb, Loader2, PlusCircle, Frown, MapPin, CalendarDays, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/components/SessionContextProvider';
import EventDetailDialog from '@/components/EventDetailDialog';
import EventCardV2 from '@/components/EventCardV2'; // Import the new EventCardV2

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string;
  event_time?: string;
  location?: string;
  place_name?: string;
  full_address?: string;
  description?: string;
  ticket_link?: string;
  price?: string;
  special_notes?: string;
  organizer_contact?: string;
  event_type?: string;
  state?: string;
  image_url?: string;
  user_id?: string;
  is_deleted?: boolean;
  approval_status?: string;
}

const EventsList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { user, isLoading: isSessionLoading } = useSession();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const todayFormatted = format(now, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('approval_status', 'approved')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events.');
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events.filter(event => parseISO(event.event_date) >= today);
  const pastEvents = events.filter(event => parseISO(event.event_date) < today);

  const todayHighlights = upcomingEvents.filter(event => isSameDay(parseISO(event.event_date), today));
  const upcomingOtherDays = upcomingEvents.filter(event => !isSameDay(parseISO(event.event_date), today));

  return (
    <div className="w-full max-w-screen-lg px-4">
      <div className="relative text-center mb-12 px-4 py-8 sm:px-6 sm:py-12 rounded-xl shadow-xl text-white overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-800">
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">Today's Highlights</h1>
          <p className="text-lg sm:text-xl font-light mb-8 opacity-90">
            Discover the best events happening today.
          </p>
          <Link to="/submit-event">
            <Button className="bg-white text-primary hover:bg-gray-100 text-base sm:text-lg font-semibold py-2 px-6 sm:py-3 sm:px-8 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105">
              Add Your Event
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 p-4 sm:p-6 bg-secondary border border-border rounded-lg shadow-lg text-center flex items-center justify-center">
        <Lightbulb className="mr-3 h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-primary" />
        <p className="text-sm sm:text-base leading-relaxed text-foreground">
          SoulFlow is a prototype app. Your feedback is invaluable! Please visit the <Link to="/contact" className="text-primary hover:underline font-medium transition-all duration-300 ease-in-out transform hover:scale-105">Contact Us</Link> page to share your suggestions.
        </p>
      </div>

      {(loading || isSessionLoading) ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row bg-card rounded-lg shadow-md overflow-hidden border border-border">
              <Skeleton className="w-full sm:w-1/3 flex-shrink-0 aspect-video sm:aspect-auto h-48 sm:h-auto" />
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <Skeleton className="h-4 w-1/4 mb-2" />
                  <Skeleton className="h-6 w-3/4 mb-1" />
                  <Skeleton className="h-4 w-1/2 mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-5 w-1/4 mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {todayHighlights.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Today's Highlights</h2>
              <div className="grid grid-cols-1 gap-4">
                {todayHighlights.map(event => (
                  <EventCardV2 key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {upcomingOtherDays.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Upcoming</h2>
              <div className="grid grid-cols-1 gap-4">
                {upcomingOtherDays.map(event => (
                  <EventCardV2 key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Past Events</h2>
              <div className="grid grid-cols-1 gap-4">
                {pastEvents.map(event => (
                  <EventCardV2 key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {events.length === 0 && (
            <div className="p-8 bg-secondary rounded-xl border border-border text-center shadow-md">
              <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-4">No events found.</p>
              <Link to="/submit-event">
                <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add the First Event!
                </Button>
              </Link>
            </div>
          )}

          {events.length > 0 && (
            <div className="flex justify-center mt-8">
              <Button variant="outline" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Load More Events (Prototype)
              </Button>
            </div>
          )}
        </>
      )}

      <EventDetailDialog event={selectedEvent} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />
    </div>
  );
};

export default EventsList;