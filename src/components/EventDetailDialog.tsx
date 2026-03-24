import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isSameDay } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Sparkles, Share2, Edit, Trash2, Copy, Repeat, X } from 'lucide-react';
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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { formatPrice } from '@/utils/event-utils';

interface EventDetailDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  cameFromCalendar?: boolean;
}

const EventDetailDialog: React.FC<EventDetailDialogProps> = ({ event, isOpen, onClose, cameFromCalendar = false }) => {
  const navigate = useNavigate();
  const { user } = useSession();

  const handleDelete = async () => {
    if (!event) return;
    const baseId = event.id.split('-')[0];
    const { error } = await supabase.from('events').delete().eq('id', baseId);

    if (error) {
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
      toast.success('Discount code copied!');
      await supabase.from('discount_code_usage_logs').insert([{
        event_id: event?.id,
        user_id: user?.id || null,
        copied_at: new Date().toISOString(),
      }]);
    } catch (err) {
      toast.error('Failed to copy code.');
    }
  };

  const handleTicketLinkClick = async () => {
    if (!event?.ticket_link) return;
    await supabase.from('event_analytics_logs').insert([{
      event_id: event.id,
      user_id: user?.id || null,
      log_type: 'ticket_click',
    }]);
    window.open(event.ticket_link, '_blank');
  };

  if (!isOpen) return null;

  if (!event) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-card dark:border-border">
          <DialogHeader><Skeleton className="h-8 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></DialogHeader>
          <Skeleton className="w-full h-64 rounded-lg mb-4" />
          <div className="space-y-4"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  const googleMapsLink = event.google_maps_link || (event.full_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.full_address)}` : '#');
  const isCreatorOrAdmin = user?.id === event.user_id || user?.email === 'daniele.buatti@gmail.com';
  const startDate = parseISO(event.event_date);
  const endDate = event.end_date ? parseISO(event.end_date) : null;
  const dateDisplay = endDate && !isSameDay(startDate, endDate) ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}` : format(startDate, 'MMM d, yyyy');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[92vh] overflow-y-auto dark:bg-card dark:border-border p-0 border-none shadow-2xl">
        <div className="relative">
          {event.image_url ? (
            <div className="w-full h-[300px] sm:h-[350px] overflow-hidden">
              <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
            </div>
          ) : (
            <div className="w-full h-24 bg-primary/10"></div>
          )}
          
          <DialogClose className="absolute top-4 right-4 rounded-full bg-black/20 hover:bg-black/40 p-2 text-white backdrop-blur-md transition-all z-50">
            <X className="h-5 w-5" />
          </DialogClose>

          <div className={event.image_url ? "absolute bottom-0 left-0 p-6 sm:p-8 w-full" : "p-8 pt-10"}>
            <div className="flex flex-wrap gap-2 mb-3">
              {event.event_type && (
                <Badge variant="secondary" className="bg-primary/20 text-primary border-none font-bold px-3 py-1">
                  {event.event_type.toUpperCase()}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-3xl sm:text-4xl font-bold mb-3 font-heading tracking-tight text-foreground leading-tight">
              {event.event_name}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center text-base gap-x-4 gap-y-2 text-muted-foreground font-medium">
              <span className="flex items-center"><Calendar className="mr-2 h-4 w-4 text-primary" /> {dateDisplay}</span>
              {event.event_time && <span className="flex items-center"><Clock className="mr-2 h-4 w-4 text-primary" /> {event.event_time}</span>}
            </DialogDescription>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-8">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground/70">Location & Price</h3>
              {event.full_address && (
                <div className="flex items-start text-foreground group">
                  <MapPin className="mr-3 h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors leading-snug">
                    {event.place_name && <span className="block font-bold mb-0.5">{event.place_name}</span>}
                    <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">{event.full_address}</span>
                  </a>
                </div>
              )}
              {event.price && (
                <div className="flex items-center text-foreground">
                  <DollarSign className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-bold">{formatPrice(event.price)}</span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground/70">Organizer & Details</h3>
              {event.organizer_contact && (
                <div className="flex items-center text-foreground">
                  <User className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium">{event.organizer_contact}</span>
                </div>
              )}
              {event.recurring_pattern && (
                <div className="flex items-center text-foreground">
                  <Repeat className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium capitalize">Repeats {event.recurring_pattern.toLowerCase()}</span>
                </div>
              )}
            </div>
          </section>

          {event.description && (
            <section className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground/70">About this event</h3>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap text-lg">
                {event.description}
              </p>
            </section>
          )}

          {(event.ticket_link || event.special_notes || event.discount_code) && (
            <section className="bg-secondary/30 rounded-2xl p-6 space-y-5 border border-border/50">
              <h3 className="text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground/70">Booking Information</h3>
              
              {event.ticket_link && (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.02]" 
                  onClick={handleTicketLinkClick}
                >
                  <LinkIcon className="mr-2 h-5 w-5" /> Get Your Tickets
                </Button>
              )}

              {event.discount_code && (
                <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-background rounded-xl border border-dashed border-primary/30">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Discount Code</p>
                    <code className="text-xl font-black text-primary tracking-wider">{event.discount_code}</code>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCopyCode(event.discount_code!)} className="rounded-lg">
                    <Copy className="mr-2 h-4 w-4" /> Copy Code
                  </Button>
                </div>
              )}

              {event.special_notes && (
                <div className="flex items-start bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/20">
                  <Info className="mr-3 h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80 italic leading-relaxed">{event.special_notes}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="flex flex-wrap justify-between items-center p-6 sm:p-8 border-t bg-secondary/20 gap-4">
          <div className="flex gap-2">
            <BookmarkButton eventId={event.id} size="default" className="rounded-xl px-4" />
            <Button variant="ghost" className="rounded-xl px-4" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/events/${event.id.split('-')[0]}`);
              toast.success('Link copied!');
            }}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
          <div className="flex gap-2">
            {isCreatorOrAdmin && (
              <>
                <Button variant="outline" className="rounded-xl" onClick={() => { onClose(); navigate(`/edit-event/${event.id.split('-')[0]}`); }}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="rounded-xl">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-heading text-2xl">Delete Event?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone. This event will be permanently removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive rounded-xl">Delete</AlertDialogAction>
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