import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { format, parseISO, isSameDay } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Share2, Edit, Trash2, Copy, Repeat, X, CalendarPlus, ChevronDown, Check, Navigation } from 'lucide-react';
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { formatPrice, getGoogleCalendarUrl, downloadIcalFile, getBaseEventId } from '@/utils/event-utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { openInMaps } from '@/lib/utils';
import LeafletMap from '@/components/v2/LeafletMap';

interface EventDetailDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  cameFromCalendar?: boolean;
}

const EventDetailDialog: React.FC<EventDetailDialogProps> = ({ event, isOpen, onClose, cameFromCalendar = false }) => {
  const navigate = useNavigate();
  const { user } = useSession();
  const isMobile = useIsMobile();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleDelete = async () => {
    if (!event) return;
    const baseId = getBaseEventId(event.id);
    const { error } = await supabase.from('events').update({ is_deleted: true }).eq('id', baseId);
    if (error) {
      toast.error('Failed to move event to trash.');
    } else {
      toast.success('Event moved to trash successfully!');
      onClose();
      window.location.reload();
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success('Discount code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
      await supabase.from('discount_code_usage_logs').insert([{
        event_id: event?.id,
        user_id: user?.id || null,
        copied_at: new Date().toISOString(),
      }]);
    } catch (err) {
      toast.error('Failed to copy code.');
    }
  };

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!event?.full_address) return;
    try {
      await navigator.clipboard.writeText(event.full_address);
      setCopiedAddress(true);
      toast.success('Address copied!');
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      toast.error('Failed to copy address.');
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const baseId = getBaseEventId(event.id);
    const shareData = {
      title: event.event_name,
      text: `Check out this soulful event: ${event.event_name}`,
      url: `${window.location.origin}/events/${baseId}`,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share.');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link.');
      }
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

  if (!isOpen || !event) return null;

  const startDate = parseISO(event.event_date);
  const endDate = event.end_date ? parseISO(event.end_date) : null;
  const dateDisplay = endDate && !isSameDay(startDate, endDate) ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}` : format(startDate, 'MMM d, yyyy');
  const isCreatorOrAdmin = user?.id === event.user_id || user?.email === 'daniele.buatti@gmail.com';

  const Content = (
    <div className="flex flex-col h-full min-h-0">
      <div className="relative flex-shrink-0">
        {event.image_url ? (
          <div className="w-full h-[200px] sm:h-[300px] overflow-hidden bg-secondary/20">
            <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover image-fade-in" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
          </div>
        ) : (
          <div className="w-full h-32 sm:h-40 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center">
            <span className="text-primary/30 font-heading text-3xl sm:text-5xl italic font-bold tracking-tighter">SoulFlow</span>
          </div>
        )}
        
        {!isMobile && (
          <DialogClose className="absolute top-4 right-4 rounded-full bg-black/20 hover:bg-black/40 p-2 text-white backdrop-blur-md transition-all z-50">
            <X className="h-5 w-5" />
          </DialogClose>
        )}

        <div className={event.image_url ? "absolute bottom-0 left-0 p-4 sm:p-6 w-full" : "p-4 sm:p-6 pt-6 sm:pt-8"}>
          <div className="flex flex-wrap gap-2 mb-2">
            {event.event_type && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none font-bold px-2 py-0.5 text-[10px] sm:text-xs">
                {event.event_type.toUpperCase()}
              </Badge>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 font-heading tracking-tight text-foreground leading-tight">
            {event.event_name}
          </h2>
          <div className="flex flex-wrap items-center text-xs sm:text-sm gap-x-3 gap-y-1 text-muted-foreground font-medium">
            <span className="flex items-center"><Calendar className="mr-1.5 h-3.5 w-3.5 text-primary" /> {dateDisplay}</span>
            {event.event_time && <span className="flex items-center"><Clock className="mr-1.5 h-3.5 w-3.5 text-primary" /> {event.event_time}</span>}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6 overflow-y-auto flex-grow min-h-0">
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/70">Location & Price</h3>
            {event.full_address && (
              <div className="space-y-3">
                <div className="flex items-start text-foreground group relative">
                  <MapPin className="mr-2 h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <button onClick={() => openInMaps(event.full_address!)} className="text-left hover:text-primary transition-colors leading-snug block">
                      {event.place_name && <span className="block font-bold mb-0.5 text-sm">{event.place_name}</span>}
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">{event.full_address}</span>
                    </button>
                  </div>
                </div>
                
                <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden border border-border shadow-sm">
                  <LeafletMap 
                    events={[event]} 
                    onViewDetails={() => {}} 
                    className="h-full w-full" 
                    zoom={15}
                    interactive={false}
                    showWatermark={false}
                  />
                  <div 
                    className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center cursor-pointer z-10"
                    onClick={() => openInMaps(event.full_address!)}
                  >
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg opacity-0 hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                      <Navigation className="h-3 w-3" /> Get Directions
                    </div>
                  </div>
                </div>
              </div>
            )}
            {event.price && (
              <div className="flex items-center text-foreground">
                <DollarSign className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-bold text-sm">{formatPrice(event.price)}</span>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/70">Organizer & Details</h3>
            {event.organizer_contact && (
              <div className="flex items-center text-foreground">
                <User className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-medium text-sm">{event.organizer_contact}</span>
              </div>
            )}
            {event.recurring_pattern && (
              <div className="flex items-center text-foreground">
                <Repeat className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-medium capitalize text-sm">Repeats {event.recurring_pattern.toLowerCase()}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl h-9 px-3 text-[10px] font-bold">
                    <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Add to Calendar <ChevronDown className="ml-1.5 h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl">
                  <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(event), '_blank')} className="cursor-pointer">
                    Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadIcalFile(event)} className="cursor-pointer">
                    Download iCal File
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {event.full_address && (
                <Button variant="outline" size="sm" onClick={handleCopyAddress} className="rounded-xl h-9 px-3 text-[10px] font-bold">
                  {copiedAddress ? <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  {copiedAddress ? 'Copied!' : 'Copy Address'}
                </Button>
              )}
            </div>
          </div>
        </section>

        {event.description && (
          <section className="space-y-2">
            <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/70">About this event</h3>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {event.description}
            </p>
          </section>
        )}

        {(event.ticket_link || event.special_notes || event.discount_code) && (
          <section className="bg-secondary/30 rounded-2xl p-5 space-y-5 border border-border/50">
            <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/70">Booking Information</h3>
            
            {event.ticket_link && (
              <Button 
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-black py-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.01]" 
                onClick={handleTicketLinkClick}
              >
                <LinkIcon className="mr-2 h-5 w-5" /> Get Your Tickets
              </Button>
            )}

            {event.discount_code && (
              <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-background rounded-xl border border-dashed border-primary/30">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-0.5">Discount Code</p>
                  <code className="text-xl font-black text-primary tracking-wider">{event.discount_code}</code>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleCopyCode(event.discount_code!)} className="rounded-lg min-w-[120px] h-10 text-xs font-bold">
                  {copiedCode ? <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
            )}

            {event.special_notes && (
              <div className="flex items-start bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/20">
                <Info className="mr-3 h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 italic leading-relaxed">{event.special_notes}</p>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="flex flex-wrap justify-between items-center p-4 sm:p-6 border-t bg-secondary/20 gap-4 mt-auto flex-shrink-0">
        <div className="flex gap-2">
          <div onClick={(e) => e.stopPropagation()}>
            <BookmarkButton eventId={event.id} size="default" className="rounded-xl px-4 h-10" />
          </div>
          
          <Button variant="ghost" className="rounded-xl px-4 h-10 text-xs sm:text-sm font-bold" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
        <div className="flex gap-2">
          {isCreatorOrAdmin && (
            <>
              <Button variant="outline" className="rounded-xl h-10 text-xs sm:text-sm font-bold" onClick={() => { onClose(); navigate(`/edit-event/${getBaseEventId(event.id)}`); }}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="rounded-xl h-10 text-xs sm:text-sm font-bold">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] w-[90vw] max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-heading text-2xl">Delete Event?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This event will be permanently removed.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="rounded-xl mt-0">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive rounded-xl">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[94vh] rounded-t-[2.5rem] border-none shadow-2xl">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4 mt-2" />
          <DrawerHeader className="sr-only">
            <DrawerTitle>{event.event_name}</DrawerTitle>
            <DrawerDescription>Event details for {event.event_name}</DrawerDescription>
          </DrawerHeader>
          {Content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[90vh] max-h-[90vh] overflow-hidden dark:bg-card dark:border-border p-0 border-none shadow-2xl flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{event.event_name}</DialogTitle>
          <DialogDescription>Event details for {event.event_name}</DialogDescription>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailDialog;