import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isSameDay } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Sparkles, Globe, Share2, Edit, Trash2, Copy, ArrowLeft } from 'lucide-react';
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
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';

const formatPrice = (price?: string | null) => {
  if (!price) return 'N/A';
  const lowerCasePrice = price.toLowerCase();
  if (lowerCasePrice === 'free' || lowerCasePrice === 'donation') {
    return price;
  }
  if (/\d/.test(price) && !price.startsWith('$')) {
    return `$${price}`;
  }
  return price;
};

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
      const baseId = id.split('-')[0];
      
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
        setEvent(data);
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
    const baseId = event.id.split('-')[0];
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

  if (loading || isSessionLoading) {
    return (
      <div className="w-full max-w-6xl px-4">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <Skeleton className="w-full h-96 rounded-[3rem] mb-8" />
      </div>
    );
  }

  if (!event) return null;

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
    <div className="w-full max-w-6xl px-4">
      <div className="flex justify-start mb-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-full hover:bg-primary/10 text-primary font-bold">
          <ArrowLeft className="mr-2 h-5 w-5" /> Back to Events
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-8">
          {event.image_url ? (
            <div className="relative w-full aspect-video rounded-[3rem] overflow-hidden shadow-2xl">
              <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-primary/20 via-accent/10 to-secondary rounded-[3rem] flex items-center justify-center">
              <span className="text-primary/30 font-heading text-6xl italic font-bold tracking-tighter">SoulFlow</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              {event.event_type && (
                <Badge className="bg-primary/10 text-primary border-none px-4 py-1.5 rounded-full font-black tracking-widest text-[10px]">
                  {event.event_type.toUpperCase()}
                </Badge>
              )}
            </div>
            <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground leading-tight">
              {event.event_name}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>{dateDisplay}</span>
              </div>
              {event.event_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>{event.event_time}</span>
                </div>
              )}
            </div>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-xl leading-relaxed text-foreground/80 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <Card className="organic-card rounded-[2.5rem] p-8 space-y-8 sticky top-32">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em]">Event Details</h3>
              
              {event.full_address && (
                <div className="flex items-start gap-4 group">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{event.place_name || 'Location'}</p>
                    <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {event.full_address}
                    </a>
                  </div>
                </div>
              )}

              {event.price && (
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{formatPrice(event.price)}</p>
                    <p className="text-sm text-muted-foreground">Admission Fee</p>
                  </div>
                </div>
              )}

              {event.organizer_contact && (
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{event.organizer_contact}</p>
                    <p className="text-sm text-muted-foreground">Organizer</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {event.ticket_link && (
                <Button 
                  onClick={handleTicketLinkClick}
                  className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/80 text-primary-foreground text-lg font-black shadow-xl transition-transform hover:scale-[1.02]"
                >
                  <LinkIcon className="mr-2 h-5 w-5" /> Get Tickets
                </Button>
              )}
              
              <div className="flex gap-3">
                <BookmarkButton eventId={event.id} size="default" className="flex-1 h-14 rounded-2xl bg-secondary/50 hover:bg-secondary border-none" />
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const url = `${window.location.origin}/events/${event.id}`;
                    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
                  }}
                  className="flex-1 h-14 rounded-2xl bg-secondary/50 hover:bg-secondary border-none"
                >
                  <Share2 className="mr-2 h-5 w-5" /> Share
                </Button>
              </div>
            </div>

            {event.discount_code && (
              <div className="p-6 bg-primary/5 rounded-2xl border border-dashed border-primary/20 text-center space-y-2">
                <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Discount Code</p>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-2xl font-black text-primary tracking-wider">{event.discount_code}</code>
                  <Button variant="ghost" size="icon" onClick={() => handleCopyCode(event.discount_code!)} className="h-8 w-8 rounded-full hover:bg-primary/10">
                    <Copy className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            )}

            {isCreatorOrAdmin && (
              <div className="pt-6 border-t border-border/50 flex gap-3">
                <Button variant="outline" onClick={() => navigate(`/edit-event/${event.id}`)} className="flex-1 rounded-xl">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex-1 rounded-xl">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
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
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;