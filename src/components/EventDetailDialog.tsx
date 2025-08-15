import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns'; // Import parseISO
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Globe, Share2, Edit, Trash2, Copy } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionUI,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string;
  event_time?: string;
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
  discount_code?: string; // Added discount_code
}

interface EventDetailDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  cameFromCalendar?: boolean; // Prop to indicate if opened from calendar
}

const EventDetailDialog: React.FC<EventDetailDialogProps> = ({ event, isOpen, onClose, cameFromCalendar = false }) => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();

  const handleDelete = async () => {
    if (!event) return;
    const { error } = await supabase.from('events').delete().eq('id', event.id);

    if (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event.');
    } else {
      toast.success('Event deleted successfully!');
      onClose(); // Close the dialog after deletion
      navigate('/'); // Redirect to home page after deletion
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
          user_id: user?.id || null, // Log user ID if available
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

  if (!isOpen) {
    return null;
  }

  if (!event) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-card dark:border-border">
          <DialogHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </DialogHeader>
          <Skeleton className="w-full h-64 rounded-lg mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const googleMapsLink = event.full_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.full_address)}`
    : '#';

  const isCreatorOrAdmin = user?.id === event.user_id || user?.email === 'daniele.buatti@gmail.com';

  const formattedStartDate = event.event_date
    ? format(parseISO(event.event_date), 'PPP') // Use parseISO
    : 'Date TBD';
  const formattedEndDate = event.end_date
    ? format(parseISO(event.end_date), 'PPP') // Use parseISO
    : '';

  const dateDisplay =
    event.end_date && event.event_date !== event.end_date
      ? `${formattedStartDate} - ${formattedEndDate}`
      : formattedStartDate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-card dark:border-border">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-foreground text-center">{event.event_name}</DialogTitle>
          <DialogDescriptionUI className="text-muted-foreground">
            Details about this soulful event.
          </DialogDescriptionUI>
        </DialogHeader>

        {event.image_url && (
          <div className="mb-4">
            <a href={event.image_url} target="_blank" rel="noopener noreferrer">
              <img
                src={event.image_url}
                alt={`Image for ${event.event_name}`}
                className="w-full h-64 object-cover rounded-lg shadow-lg"
                loading="lazy" // Lazy load image
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
            {(event.place_name || event.full_address) && (
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
                <Button asChild variant="link" className="p-0 h-auto text-primary text-base transition-all duration-300 ease-in-out transform hover:scale-105">
                  <a href={event.ticket_link} target="_blank" rel="noopener noreferrer">
                    Ticket/Booking Link
                  </a>
                </Button>
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

        <DialogFooter className="flex flex-wrap justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="transition-all duration-300 ease-in-out transform hover:scale-105">
            {cameFromCalendar ? 'Back to Calendar' : 'Close'}
          </Button>
          {event.full_address && (
            <a href={googleMapsLink} target="_blank" rel="noopener noreferrer">
              <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                <Globe className="mr-2 h-4 w-4" /> View on Map
              </Button>
            </a>
          )}
          <Button onClick={() => {
            const eventUrl = `${window.location.origin}/events/${event.id}`; // Still provide a direct link for sharing
            navigator.clipboard.writeText(eventUrl)
              .then(() => toast.success('Event link copied to clipboard!'))
              .catch(() => toast.error('Failed to copy link. Please try again.'));
          }} className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
            <Share2 className="mr-2 h-4 w-4" /> Share Event
          </Button>
          {isCreatorOrAdmin && (
            <>
              <Button variant="outline" onClick={() => { onClose(); navigate(`/edit-event/${event.id}`); }} className="transition-all duration-300 ease-in-out transform hover:scale-105">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailDialog;