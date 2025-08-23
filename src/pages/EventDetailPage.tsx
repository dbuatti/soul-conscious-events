import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Globe, Share2, Edit, Trash2, Copy, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/SessionContextProvider';
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
import { Event } from '@/types/event'; // Import the shared Event type
import BookmarkButton from '@/components/BookmarkButton'; // Import BookmarkButton

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) {
        toast.error('Event ID is missing.');
        navigate('/404');
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details.');
        navigate('/404');
      } else if (data) {
        setEvent(data);
        // Log page view
        const { error: logError } = await supabase.from('event_analytics_logs').insert([
          {
            event_id: data.id,
            user_id: user?.id || null,
            log_type: 'view',
          },
        ]);
        if (logError) {
          console.error('Error logging event view:', logError);
        }
      } else {
        navigate('/404');
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id, navigate, user?.id]);

  const handleDelete = async () => {
    if (!event) return;
    const { error } = await supabase.from('events').delete().eq('id', event.id);

    if (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event.');
    } else {
      toast.success('Event deleted successfully!');
      navigate('/');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Discount code copied to clipboard!');

      // Log the copy action
      const { error: logError } = await supabase.from('discount_code_usage_logs').insert([
        {
          event_id: event?.id,
          user_id: user?.id || null,
          copied_at: new Date().toISOString(),
        },
      ]);

      if (logError) {
        console.error('Error logging discount code copy:', logError);
      }
    } catch (err) {
      console.error('Failed to copy discount code:', err);
      toast.error('Failed to copy code. Please try again.');
    }
  };

  const handleTicketLinkClick = async () => {
    if (!event?.ticket_link) return;

    // Log the ticket link click
    const { error: logError } = await supabase.from('event_analytics_logs').insert([
      {
        event_id: event.id,
        user_id: user?.id || null,
        log_type: 'ticket_click',
      },
    ]);
    if (logError) {
      console.error('Error logging ticket link click:', logError);
    }
    window.open(event.ticket_link, '_blank');
  };

  if (loading || isSessionLoading) {
    return (
      <div className="w-full max-w-screen-lg">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <Skeleton className="w-full h-64 rounded-lg mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    );
  }

  if (!event) {
    return null; // Should be handled by navigate('/404')
  }

  const googleMapsLink = event.full_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.full_address)}`
    : '#';

  const isCreatorOrAdmin = user?.id === event.user_id || user?.email === 'daniele.buatti@gmail.com';

  const formattedStartDate = event.event_date
    ? format(parseISO(event.event_date), 'PPP')
    : 'Date TBD';
  const formattedEndDate = event.end_date
    ? format(parseISO(event.end_date), 'PPP')
    : '';

  const dateDisplay =
    event.end_date && event.event_date !== event.end_date
      ? `${formattedStartDate} - ${formattedEndDate}`
      : formattedStartDate;

  return (
    <div className="w-full max-w-screen-lg">
      <div className="flex justify-start mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="transition-all duration-300 ease-in-out transform hover:scale-105">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <h2 className="text-3xl font-bold text-foreground mb-6 text-center">{event.event_name}</h2>

      {event.image_url && (
        <div className="mb-6">
          <a href={event.image_url} target="_blank" rel="noopener noreferrer">
            <img
              src={event.image_url}
              alt={`Image for ${event.event_name}`}
              className="w-full h-80 object-cover rounded-lg shadow-lg"
              loading="lazy"
            />
          </a>
        </div>
      )}

      <Card className="shadow-lg rounded-lg border-none dark:bg-secondary dark:border-border">
        <CardHeader>
          <CardDescription className="flex items-center text-muted-foreground mt-2">
            <Calendar className="mr-2 h-4 w-4 text-primary" />
            {dateDisplay}
            {event.event_time && (
              <>
                <Clock className="ml-4 mr-2 h-4 w-4 text-primary" />
                {event.event_time}
              </>
            )}
          </CardDescription>
          {(event.place_name || event.full_address || event.geographical_state) && ( // Include geographical_state
            <CardDescription className="flex flex-col items-start text-muted-foreground mt-1">
              {event.place_name && (
                <div className="flex items-center mb-1">
                  <MapPin className="mr-2 h-4 w-4 text-primary" />
                  <Badge variant="secondary" className="bg-accent text-accent-foreground text-base py-1 px-2">
                    {event.place_name}
                  </Badge>
                </div>
              )}
              {event.full_address && (
                <div className="flex items-center">
                  {!event.place_name && <MapPin className="mr-2 h-4 w-4 text-primary" />}
                  <a
                    href={googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-base"
                  >
                    {event.full_address}
                  </a>
                </div>
              )}
              {event.geographical_state && ( // Display geographical_state
                <div className="flex items-center mt-1">
                  <MapPin className="mr-2 h-4 w-4 text-primary" />
                  <Badge variant="secondary" className="bg-accent text-accent-foreground text-base py-1 px-2">
                    {event.geographical_state}
                  </Badge>
                </div>
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {event.description && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Description:</h3>
              <p className="text-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
          {event.price && (
            <p className="flex items-center text-foreground">
              <DollarSign className="mr-2 h-5 w-5 text-primary" />
              <span className="font-medium">Price: </span> {event.price}
              {event.price.toLowerCase() === 'free' && (
                <Badge variant="secondary" className="ml-2 bg-accent text-accent-foreground">Free</Badge>
              )}
            </p>
          )}
          {event.ticket_link && (
            <div className="flex items-center">
              <LinkIcon className="mr-2 h-5 w-5 text-primary" />
              <a
                href={event.ticket_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-base transition-all duration-300 ease-in-out transform hover:scale-105"
                onClick={handleTicketLinkClick}
              >
                Ticket/Booking Link
              </a>
            </div>
          )}
          {event.discount_code && (
            <div className="flex items-center text-foreground">
              <Badge variant="secondary" className="bg-primary/10 text-primary text-base py-1 px-2 mr-2">
                Discount Code: {event.discount_code}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyCode(event.discount_code!)}
                className="transition-all duration-300 ease-in-out transform hover:scale-105"
              >
                <Copy className="mr-2 h-4 w-4" /> Copy Code
              </Button>
            </div>
          )}
          {event.special_notes && (
            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" />
                Special Notes:
              </h3>
              <p className="text-foreground whitespace-pre-wrap pl-7">{event.special_notes}</p>
            </div>
          )}
          {event.organizer_contact && (
            <p className="flex items-center text-foreground">
              <User className="mr-2 h-5 w-5 text-primary" />
              <span className="font-medium">Organizer: </span> {event.organizer_contact}
            </p>
          )}
          {event.event_type && (
            <p className="flex items-center text-foreground">
              <Tag className="mr-2 h-5 w-5 text-primary" />
              <span className="font-medium">Event Type: </span> {event.event_type}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2 mt-6">
        <BookmarkButton eventId={event.id} size="default" className="w-full sm:w-auto" />
        <Button variant="outline" onClick={() => navigate(-1)} className="transition-all duration-300 ease-in-out transform hover:scale-105">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {event.full_address && (
          <a href={googleMapsLink} target="_blank" rel="noopener noreferrer">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
              <Globe className="mr-2 h-4 w-4" /> View on Map
            </Button>
          </a>
        )}
        <Button onClick={() => {
          const eventUrl = `${window.location.origin}/events/${event.id}`;
          navigator.clipboard.writeText(eventUrl)
            .then(() => toast.success('Event link copied to clipboard!'))
            .catch(() => toast.error('Failed to copy link. Please try again.'));
        }} className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
          <Share2 className="mr-2 h-4 w-4" /> Share Event
        </Button>
        {isCreatorOrAdmin && (
          <>
            <Button variant="outline" onClick={() => navigate(`/edit-event/${event.id}`)} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="dark:bg-card dark:border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This action cannot be undone. This will permanently delete your event
                    and remove its data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/80 text-destructive-foreground">Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
};

export default EventDetailPage;