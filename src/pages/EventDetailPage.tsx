import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isSameDay } from 'date-fns';
import { MapPin, Clock, Ticket, User, Share2, Edit, Trash2, Copy, ArrowLeft, CalendarPlus, Download, Repeat, ExternalLink } from 'lucide-react';
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
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { getBaseEventId, formatPrice, getGoogleCalendarUrl, downloadIcalFile } from '@/utils/event-utils';
import SEO from '@/components/SEO';
import EventCardFallback from '@/components/EventCardFallback';


const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: isSessionLoading } = useSession();
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
      const baseId = getBaseEventId(id);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', baseId)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details.');
        navigate('/404');
      } else if (data) {
        // If the URL contains a synthetic recurring-instance ID (uuid-yyyyMMdd),
        // override the displayed date so the page shows the clicked instance, not the base event.
        let displayData = data;
        if (id && id !== baseId) {
          const idParts = id.split('-');
          if (idParts.length > 5) {
            const suffix = idParts.slice(5).join('');
            if (/^\d{8}$/.test(suffix)) {
              displayData = {
                ...data,
                event_date: `${suffix.slice(0, 4)}-${suffix.slice(4, 6)}-${suffix.slice(6, 8)}`,
                is_recurring_instance: true,
              };
            }
          }
        }
        setEvent(displayData);
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
    const baseId = getBaseEventId(event.id);
    const { error } = await supabase.from('events').delete().eq('id', baseId);

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

  const handleTicketLinkClick = () => {
    if (!event?.ticket_link) return;
    
    // Open the link immediately to preserve the user gesture and prevent mobile popup blockers
    window.open(event.ticket_link, '_blank');
    
    // Log the analytics asynchronously in the background
    supabase.from('event_analytics_logs').insert([
      {
        event_id: event.id,
        user_id: user?.id || null,
        log_type: 'ticket_click',
      },
    ]).then(({ error }) => {
      if (error) console.error('Error logging ticket link click:', error);
    });
  };

  if (loading || isSessionLoading) {
    return (
      <div className="w-full max-w-6xl px-4">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <Skeleton className="w-full h-96 rounded-[2rem] mb-8" />
      </div>
    );
  }

  if (!event) return null;

  const googleMapsLink = event.google_maps_link || (event.full_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.full_address)}`
    : '#');

  const isCreatorOrAdmin = (!!user && user.id === event.user_id) || isAdmin;
  const startDate = parseISO(event.event_date);
  const endDate = event.end_date ? parseISO(event.end_date) : null;
  const dateDisplay = endDate && !isSameDay(startDate, endDate)
    ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
    : format(startDate, 'MMM d, yyyy');

  const isMultiDay = !!endDate && !isSameDay(startDate, endDate);
  const shareUrl = `${window.location.origin}/events/${getBaseEventId(event.id)}`;

  const handleShare = async () => {
    const shareData = { title: event.event_name, text: `Check out ${event.event_name} on SoulFlow`, url: shareUrl };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); } catch { /* dismissed */ }
      return;
    }
    navigator.clipboard.writeText(shareUrl).then(() => toast.success('Link copied!'));
  };

  const detailRow = (Icon: React.ElementType, title: React.ReactNode, sub?: React.ReactNode) => (
    <div className="flex items-start gap-3.5">
      <span className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 pt-0.5">
        <div className="font-semibold text-foreground leading-snug">{title}</div>
        {sub && <div className="text-sm text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-6xl px-2 sm:px-4 pb-24 lg:pb-0">
      <SEO
        title={`${event.event_name} | SoulFlow Australia`}
        description={event.description || `Join us for ${event.event_name} on ${dateDisplay}. Discover more details and book tickets on SoulFlow.`}
        image={event.image_url || undefined}
        type="article"
      />

      <button
        type="button"
        onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
        className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> All events
      </button>

      <header className="mb-8 max-w-4xl">
        <p className="eyebrow mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {event.event_type && <span>{event.event_type}</span>}
          {event.geographical_state && <span className="text-muted-foreground">· {event.geographical_state}</span>}
          {event.recurring_pattern && (
            <span className="inline-flex items-center gap-1 text-sage normal-case tracking-normal text-xs">
              <Repeat className="h-3.5 w-3.5" /> Repeats {event.recurring_pattern.toLowerCase()}
            </span>
          )}
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold font-heading text-foreground leading-[1.05]">
          {event.event_name}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {isMultiDay ? `${format(startDate, 'EEE d MMM')} – ${format(endDate!, 'EEE d MMM yyyy')}` : format(startDate, 'EEEE d MMMM yyyy')}
          {event.event_time && <> · {event.event_time}</>}
          {event.place_name && <> · {event.place_name}</>}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-7 space-y-10">
          <div className="relative w-full aspect-[16/10] rounded-[1.75rem] overflow-hidden bg-secondary shadow-[0_30px_60px_-30px_hsl(20_40%_20%/0.45)]">
            {event.image_url ? (
              <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover" />
            ) : (
              <EventCardFallback event={event} />
            )}
          </div>

          {event.description && (
            <section>
              <h2 className="text-2xl font-semibold font-heading text-foreground mb-4">About this gathering</h2>
              <p className="text-[1.0625rem] leading-[1.8] text-foreground/80 whitespace-pre-wrap max-w-prose">
                {event.description}
              </p>
            </section>
          )}

          {event.event_days && event.event_days.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold font-heading text-foreground mb-4">Daily schedule</h2>
              <ol className="relative border-l border-border ml-2 space-y-5">
                {event.event_days.map((day) => (
                  <li key={day.date} className="pl-6 relative">
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="font-semibold text-foreground">{format(parseISO(day.date), 'EEEE d MMMM')}</p>
                    {(day.start_time || day.end_time) && (
                      <p className="text-sm text-muted-foreground">{[day.start_time, day.end_time].filter(Boolean).join(' – ')}</p>
                    )}
                    {day.notes && <p className="text-sm text-muted-foreground/80 italic mt-0.5">{day.notes}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {event.full_address && (
            <section>
              <h2 className="text-2xl font-semibold font-heading text-foreground mb-4">Getting there</h2>
              <a
                href={googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-4 organic-card organic-card-hover rounded-[var(--radius)] p-5"
              >
                <span className="flex items-start gap-3.5 min-w-0">
                  <span className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><MapPin className="h-[18px] w-[18px]" /></span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{event.place_name || 'Venue'}</span>
                    <span className="block text-sm text-muted-foreground">{event.full_address}</span>
                  </span>
                </span>
                <span className="text-sm font-medium text-primary inline-flex items-center gap-1 shrink-0">
                  Directions <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            </section>
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="organic-card rounded-[1.75rem] p-6 sm:p-7 space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center w-16 h-[4.5rem] rounded-2xl bg-primary text-primary-foreground leading-none shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{format(startDate, 'MMM')}</span>
                <span className="font-heading text-3xl font-semibold mt-0.5">{format(startDate, 'd')}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mt-0.5">{format(startDate, 'EEE')}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {isMultiDay ? `${format(startDate, 'EEE d MMM')} – ${format(endDate!, 'EEE d MMM')}` : format(startDate, 'EEEE d MMMM')}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3.5 w-3.5" /> {event.event_time || 'Time to be confirmed'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {event.price && detailRow(Ticket, formatPrice(event.price), 'Admission')}
              {event.organizer_contact && detailRow(User, event.organizer_contact, 'Host')}
              {event.full_address && !event.price && !event.organizer_contact && detailRow(MapPin, event.place_name || 'Venue', event.full_address)}
            </div>

            {event.ticket_link && (
              <Button
                onClick={handleTicketLinkClick}
                className="w-full h-12 rounded-full text-base font-semibold shadow-lg shadow-primary/25"
              >
                Get tickets <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <BookmarkButton eventId={event.id} size="default" className="h-11 rounded-full bg-secondary hover:bg-secondary/70 border-none" />
              <Button variant="secondary" onClick={handleShare} className="h-11 rounded-full">
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button variant="ghost" asChild className="h-10 rounded-full text-sm text-muted-foreground hover:text-foreground">
                <a href={getGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                  <CalendarPlus className="mr-2 h-4 w-4" /> Google Cal
                </a>
              </Button>
              <Button variant="ghost" onClick={() => downloadIcalFile(event)} className="h-10 rounded-full text-sm text-muted-foreground hover:text-foreground">
                <Download className="mr-2 h-4 w-4" /> Apple / Outlook
              </Button>
            </div>

            {event.discount_code && (
              <div className="p-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.18em]">SoulFlow code</p>
                  <code className="text-xl font-semibold text-foreground tracking-wider">{event.discount_code}</code>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleCopyCode(event.discount_code!)} className="rounded-full bg-card">
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                </Button>
              </div>
            )}

            {isCreatorOrAdmin && (
              <div className="pt-5 border-t border-border/60 flex gap-2.5">
                <Button variant="outline" onClick={() => navigate(`/edit-event/${event.id}`)} className="flex-1 rounded-full">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="flex-1 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[1.75rem]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-heading text-2xl">Delete this event?</AlertDialogTitle>
                      <AlertDialogDescription>It will be removed from SoulFlow for everyone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive rounded-full">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile ticket bar */}
      {event.ticket_link && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{event.price ? formatPrice(event.price) : 'Tickets'}</p>
            <p className="text-xs text-muted-foreground truncate">{format(startDate, 'EEE d MMM')}{event.event_time ? ` · ${event.event_time}` : ''}</p>
          </div>
          <Button onClick={handleTicketLinkClick} className="rounded-full h-11 px-6 font-semibold shrink-0">
            Get tickets
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;