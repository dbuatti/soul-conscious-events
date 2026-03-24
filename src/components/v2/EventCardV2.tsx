import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, Share2, Edit, Trash2, ArrowRight } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { Event } from '@/types/event';
import BookmarkButton from '@/components/BookmarkButton';
import { Badge } from '@/components/ui/badge';

interface EventCardV2Props {
  event: Event;
  onShare: (event: Event, e: React.MouseEvent) => void;
  onDelete: (eventId: string, e: React.MouseEvent) => void;
  onViewDetails: (event: Event) => void;
  isFeaturedToday?: boolean;
}

const EventCardV2: React.FC<EventCardV2Props> = ({
  event,
  onShare,
  onDelete,
  onViewDetails,
  isFeaturedToday = false,
}) => {
  const { user } = useSession();
  const isAdmin = user?.email === 'daniele.buatti@gmail.com';
  const isCreatorOrAdmin = user?.id === event.user_id || isAdmin;

  const displayPrice = event.price ? event.price.replace(/\$/g, '') : '';

  return (
    <Card 
      className="group flex flex-col organic-card rounded-[2.5rem] overflow-hidden cursor-pointer animate-in fade-in slide-in-from-bottom-8 duration-700"
      onClick={() => onViewDetails(event)}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <span className="text-primary/20 font-heading text-4xl italic">SoulFlow</span>
          </div>
        )}
        
        <div className="absolute top-6 left-6 flex flex-wrap gap-2">
          {event.event_type && (
            <Badge className="bg-white/90 dark:bg-black/60 text-primary text-[10px] px-4 py-1.5 font-black tracking-widest border-none shadow-lg rounded-full">
              {event.event_type.toUpperCase()}
            </Badge>
          )}
          {isFeaturedToday && (
            <Badge className="bg-accent text-white text-[10px] px-4 py-1.5 font-black tracking-widest border-none shadow-lg rounded-full animate-pulse">
              TODAY
            </Badge>
          )}
        </div>

        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 transition-all duration-500">
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => onShare(event, e)}
            className="h-10 w-10 rounded-full shadow-xl"
          >
            <Share2 className="h-4 w-4 text-primary" />
          </Button>
          <BookmarkButton eventId={event.id} size="icon" className="h-10 w-10 rounded-full shadow-xl bg-white dark:bg-black" />
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-6">
          <CardTitle className="text-3xl font-black text-foreground leading-tight font-heading tracking-tight group-hover:text-primary transition-colors">
            {event.event_name}
          </CardTitle>
          {event.price && (
            <div className="flex items-center bg-primary text-white px-4 py-1.5 rounded-full shadow-md">
              <DollarSign className="h-3.5 w-3.5 mr-0.5" />
              <span className="font-black text-sm">{displayPrice}</span>
            </div>
          )}
        </div>

        <div className="space-y-4 text-muted-foreground text-sm mb-8">
          <div className="flex items-center font-bold text-foreground/80">
            <Calendar className="mr-3 h-5 w-5 text-primary" />
            <span>{format(parseISO(event.event_date), 'EEEE, MMMM d')}</span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-3 h-5 w-5 text-primary/60" />
            <span>{event.event_time || 'Time TBD'}</span>
          </div>
          <div className="flex items-start">
            <MapPin className="mr-3 h-5 w-5 text-primary/60 mt-0.5" />
            <span className="line-clamp-1">{event.place_name || event.geographical_state || 'Location TBD'}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-6 border-t border-border/50">
          <div className="flex gap-1">
            {isCreatorOrAdmin && (
              <>
                <Link to={`/edit-event/${event.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-primary/10 rounded-full">
                    <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={(e) => onDelete(event.id, e)} className="h-10 w-10 hover:bg-destructive/10 rounded-full">
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </>
            )}
          </div>
          <Button variant="link" className="text-primary font-black p-0 group/btn text-base">
            Explore <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/btn:translate-x-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EventCardV2;