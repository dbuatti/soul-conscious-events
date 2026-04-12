import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isSameDay } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Share2, Edit, Trash2, Copy, Repeat, X, CalendarPlus, ChevronDown, Check } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { formatPrice, getGoogleCalendarUrl, downloadIcalFile } from '@/utils/event-utils';

interface EventDetailDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  cameFromCalendar?: boolean;
}

const EventDetailDialog: React.FC<EventDetailDialogProps> = ({ event, isOpen, onClose, cameFromCalendar = false }) => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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
      toast.success('Address copied to clipboard!');
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      toast.error('Failed to copy address.');
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const baseId = event.id.split('-')[0];
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
            <div className="w-full h-[300px] sm:h-[350px] overflow-hidden bg-secondary/20">
              <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover image-fade-in" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
            </div>
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center">
              <span className="text-primary/30 font-heading text-5xl italic font-bold tracking-tighter">SoulFlow</span>
            </div>
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
                <div className="flex items-start text-foreground group relative">
                  <MapPin className="mr-3 h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors leading-snug block">
                      {event.place_name && <span className="block font-bold mb-0.5">{event.place_name}</span>}
                      <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">{event.full_address}</span>
                    </a>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ml-2" 
                        onClick={handleCopyAddress}
                      >
                        {copiedAddress ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{copiedAddress ? 'Copied!' : 'Copy Address'}</p></TooltipContent>
                  </Tooltip>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-lg h-9 px-3 text-xs font-bold">
                    <CalendarPlus className="mr-2 h-4 w-4" /> Add to Calendar <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
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
                  className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.02]" 
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleCopyCode(event.discount_code!)} className="rounded-lg min-w-[120px]">
                        {copiedCode ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copiedCode ? 'Copied!' : 'Copy Code'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copy to clipboard</p></TooltipContent>
                  </Tooltip>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <div onClick={(e) => e.stopPropagation()}>
                  <BookmarkButton eventId={event.id} size="default" className="rounded-xl px-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent><p>Bookmark</p></TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className="rounded-xl px-4" onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Share Event</p></TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            {isCreatorOrAdmin && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="rounded-xl" onClick={() => { onClose(); navigate(`/edit-event/${event.id.split('-')[0]}`); }}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Edit Details</p></TooltipContent>
                </Tooltip>

                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="rounded-xl">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent><p>Delete Event</p></TooltipContent>
                  </Tooltip>
                  <AlertDialogContent className="rounded-[2rem]">
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