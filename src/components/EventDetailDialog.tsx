import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isSameDay } from 'date-fns'; // Import isSameDay
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Sparkles, Globe, Share2, Edit, Trash2, Copy } from 'lucide-react'; // Changed Tag to Sparkles
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
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';

interface EventDetailDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  cameFromCalendar?: boolean;
}

const formatPrice = (price?: string | null) => {
  if (!price) return 'N/A';
  const lowerCasePrice = price.toLowerCase();
  if (lowerCasePrice === 'free' || lowerCasePrice === 'donation') {
    return price;
  }
  // Check if it looks like a number or contains numbers, and doesn't already start with '$'
  if (/\d/.test(price) && !price.startsWith('$')) {
    return `$${price}`;
  }
  return price;
};

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
      onClose();
      navigate('/');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Discount code copied to clipboard!');

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

  const googleMapsLink = event.google_maps_link || (event.full_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.full_address)}`
    : '#');

  const isCreatorOrAdmin = user?.id === event.user_id || user?.email === 'daniele.buatti@gmail.com';

  const startDate = parseISO(event.event_date);
  const endDate = event.end_date ? parseISO(event.end_date) : null;

  const dateDisplay = endDate && !isSameDay(startDate, endDate)
    ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
    : format(startDate, 'MMM d, yyyy');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-card dark:border-border">
        <DialogHeader className="text-center pt-6 pb-4"> {/* Increased padding */}
          <DialogTitle className="text-3xl font-bold text-foreground mb-2">{event.event_name}</DialogTitle>
          {/* Top Section Simplification */}
          <div className="flex flex-wrap justify-center items-center text-sm text-muted-foreground gap-x-3 gap-y-1">
            <span className="flex items-center">
              <Calendar className="mr-1 h-3.5 w-3.5 text-primary" /> {dateDisplay}
            </span>
            {event.event_time && (
              <span className="flex items-center">
                <Clock className="mr-1 h-3.5 w-3.5 text-primary" /> {event.event_time}
              </span>
            )}
            {(event.place_name || event.geographical_state) && (
              <span className="flex items-center">
                <MapPin className="mr-1 h-3.5 w-3.5 text-primary" /> {event.place_name || event.geographical_state}
              </span>
            )}
          </div>
        </DialogHeader>

        {event.image_url && (
          <div className="mb-6 rounded-lg overflow-hidden shadow-lg"> {/* Added rounded-lg and shadow */}
            <a href={event.image_url} target="_blank" rel="noopener noreferrer">
              <img
                src={event.image_url}
                alt={`Image for ${event.event_name}`}
                className="w-full h-64 object-cover" // Removed rounded-lg here as it's on parent div
                loading="lazy"
              />
            </a>
          </div>
        )}

        <div className="px-4 sm:px-6 pb-4 space-y-6"> {/* Main content wrapper with increased padding */}
          {/* 🪷 Event Overview */}
          <section className="space-y-2">
            <h3 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Event Overview</h3>
            {event.full_address && (
              <p className="flex items-start text-foreground text-base leading-relaxed">
                <MapPin className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <a
                  href={googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {event.full_address}
                </a>
              </p>
            )}
            {event.price && (
              <p className="flex items-start text-foreground text-base leading-relaxed">
                <DollarSign className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="font-medium">Price:&nbsp;</span>
                <span className="break-words">{formatPrice(event.price)}</span>
                {event.price.toLowerCase() === 'free' && (
                  <Badge variant="secondary" className="ml-2 bg-accent text-accent-foreground">Free</Badge>
                )}
              </p>
            )}
            {event.event_type && (
              <p className="flex items-start text-foreground text-base leading-relaxed">
                <Sparkles className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="font-medium">Type:&nbsp;</span> {event.event_type}
              </p>
            )}
          </section>

          {event.description && (
            <>
              <Separator className="my-4" />
              {/* 🕊️ Description */}
              <section className="space-y-2">
                <h3 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Description</h3>
                <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </section>
            </>
          )}

          {(event.ticket_link || event.google_maps_link || event.special_notes || event.organizer_contact || event.discount_code) && (
            <>
              <Separator className="my-4" />
              {/* 🌙 Details & Links */}
              <section className="space-y-4">
                <h3 className="text-xs uppercase font-semibold text-muted-foreground mb-2">More Details</h3>
                {event.ticket_link && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">TICKETS</h4>
                    <div className="flex items-center text-foreground text-base">
                      <LinkIcon className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                      <a
                        href={event.ticket_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline transition-all duration-300 ease-in-out transform hover:scale-105"
                        onClick={handleTicketLinkClick}
                      >
                        Ticket/Booking Link
                      </a>
                    </div>
                  </div>
                )}
                {event.google_maps_link && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">LOCATION</h4>
                    <div className="flex items-center text-foreground text-base">
                      <MapPin className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> {/* Changed Globe to MapPin */}
                      <a
                        href={event.google_maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline transition-all duration-300 ease-in-out transform hover:scale-105"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                )}
                {event.discount_code && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">DISCOUNT CODE</h4>
                    <div className="flex items-center text-foreground text-base">
                      <Badge variant="secondary" className="bg-primary/10 text-primary py-1 px-2 mr-2">
                        {event.discount_code}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCode(event.discount_code!)}
                        className="transition-all duration-300 ease-in-out transform hover:scale-105"
                      >
                        <Copy className="mr-2 h-4 w-4" /> Copy
                      </Button>
                    </div>
                  </div>
                )}
                {event.special_notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">SPECIAL NOTES</h4>
                    <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">{event.special_notes}</p>
                  </div>
                )}
                {event.organizer_contact && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">ORGANIZER</h4>
                    <p className="flex items-center text-foreground text-base leading-relaxed">
                      <User className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" /> {event.organizer_contact}
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-wrap justify-between items-center p-4 sm:p-6 border-t border-border mt-4"> {/* Adjusted padding and border */}
          <div className="flex gap-2">
            <BookmarkButton eventId={event.id} size="default" className="w-full sm:w-auto" />
            <Button variant="ghost" onClick={() => {
              const eventUrl = `${window.location.origin}/events/${event.id}`;
              navigator.clipboard.writeText(eventUrl)
                .then(() => toast.success('Event link copied to clipboard!'))
                .catch(() => toast.error('Failed to copy link. Please try again.'));
            }} className="text-primary hover:bg-accent transition-all duration-300 ease-in-out transform hover:scale-105">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0"> {/* Grouped right-aligned buttons */}
            <Button variant="outline" onClick={onClose} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              {cameFromCalendar ? 'Back to Calendar' : 'Close'}
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailDialog;