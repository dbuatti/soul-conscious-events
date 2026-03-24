import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isSameDay } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Sparkles, Share2, Edit, Trash2, Copy, Repeat } from 'lucide-react';
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-card dark:border-border p-0">
        <div className="relative">
          {event.image_url && (
            <div className="w-full h-64 overflow-hidden">
              <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
          )}
          <div className={event.image_url ? "absolute bottom-0 left-0 p-6 w-full" : "p-6 pt-8"}>
            <DialogTitle className={`text-3xl font-bold mb-2 ${event.image_url ? "text-white" : "text-foreground"}`}>{event.event_name}</DialogTitle>
            <DialogDescription className={`flex flex-wrap items-center text-sm gap-x-3 gap-y-1 ${event.image_url ? "text-white/90" : "text-muted-foreground"}`}>
              <span className="flex items-center"><Calendar className="mr-1 h-3.5 w-3.5" /> {dateDisplay}</span>
              {event.event_time && <span className="flex items-center"><Clock className="mr-1 h-3.5 w-3.5" /> {event.event_time}</span>}
            </DialogDescription>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Overview</h3>
            {event.full_address && (
              <div className="flex items-start text-foreground">
                <MapPin className="mr-3 h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{event.full_address}</a>
              </div>
            )}
            {event.price && (
              <div className="flex items-center text-foreground">
                <DollarSign className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">Price:</span> <span className="ml-1">{formatPrice(event.price)}</span>
              </div>
            )}
            {event.event_type && (
              <div className="flex items-center text-foreground">
                <Sparkles className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">Type:</span> <span className="ml-1">{event.event_type}</span>
              </div>
            )}
            {event.recurring_pattern && (
              <div className="flex items-center text-foreground">
                <Repeat className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">Repeats:</span> <span className="ml-1 capitalize">{event.recurring_pattern.toLowerCase()}</span>
              </div>
            )}
          </section>

          {event.description && (
            <>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Description</h3>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </section>
            </>
          )}

          {(event.ticket_link || event.special_notes || event.organizer_contact || event.discount_code) && (
            <>
              <Separator />
              <section className="space-y-4">
                <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Details</h3>
                {event.ticket_link && (
                  <div className="flex items-center">
                    <LinkIcon className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                    <Button variant="link" className="p-0 h-auto text-primary font-semibold" onClick={handleTicketLinkClick}>Get Tickets</Button>
                  </div>
                )}
                {event.discount_code && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary px-3 py-1">{event.discount_code}</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleCopyCode(event.discount_code!)}><Copy className="mr-2 h-3.5 w-3.5" /> Copy Code</Button>
                  </div>
                )}
                {event.special_notes && (
                  <div className="flex items-start">
                    <Info className="mr-3 h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground italic">{event.special_notes}</p>
                  </div>
                )}
                {event.organizer_contact && (
                  <div className="flex items-center">
                    <User className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">{event.organizer_contact}</span>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-wrap justify-between items-center p-6 border-t bg-secondary/30">
          <div className="flex gap-2">
            <BookmarkButton eventId={event.id} size="default" />
            <Button variant="ghost" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/events/${event.id.split('-')[0]}`);
              toast.success('Link copied!');
            }}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{cameFromCalendar ? 'Back' : 'Close'}</Button>
            {isCreatorOrAdmin && (
              <>
                <Button variant="outline" onClick={() => { onClose(); navigate(`/edit-event/${event.id.split('-')[0]}`); }}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Event?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
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