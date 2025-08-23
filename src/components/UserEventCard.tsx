import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Share2, ExternalLink, Calendar, Clock, MapPin } from 'lucide-react'; // Added MapPin
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
import { Badge } from '@/components/ui/badge';
import EventDetailDialog from './EventDetailDialog';
import { Event } from '@/types/event'; // Import the shared Event type

interface UserEventCardProps {
  event: Event;
  onEventDeleted: () => void; // Callback to refresh the list after deletion
}

const UserEventCard: React.FC<UserEventCardProps> = ({ event, onEventDeleted }) => {
  const location = useLocation();
  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);

  const dateDisplay = event.end_date && event.event_date !== event.end_date
    ? `${format(parseISO(event.event_date), 'PPP')} - ${format(parseISO(event.end_date), 'PPP')}`
    : format(parseISO(event.event_date), 'PPP');

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    navigator.clipboard.writeText(eventUrl)
      .then(() => toast.success('Event link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link. Please try again.'));
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('events').update({ is_deleted: true }).eq('id', event.id);
    if (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to move event to trash.');
    } else {
      toast.success('Event moved to trash successfully!');
      onEventDeleted(); // Trigger refresh of the parent list
    }
  };

  const handleViewDetails = () => {
    setIsEventDetailDialogOpen(true);
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <Card className="group flex flex-col justify-between shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-102 overflow-hidden">
        {event.image_url && (
          <div className="relative w-full aspect-video overflow-hidden">
            <img
              src={event.image_url}
              alt={event.event_name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
          <CardTitle className="text-xl sm:text-2xl font-bold text-primary mb-1 sm:mb-2">{event.event_name}</CardTitle>
          <CardDescription className="flex items-center text-muted-foreground text-sm sm:text-base">
            <Calendar className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
            {dateDisplay}
            {event.event_time && (
              <>
                <Clock className="ml-2 sm:ml-4 mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
                {event.event_time}
              </>
            )}
          </CardDescription>
          {event.approval_status && ( // Display approval_status
            <div className="mt-2">
              <Badge variant={getStatusBadgeVariant(event.approval_status)}>
                Status: {event.approval_status.charAt(0).toUpperCase() + event.approval_status.slice(1)}
              </Badge>
            </div>
          )}
          {event.geographical_state && ( // Display geographical_state
            <div className="mt-1 flex items-center text-muted-foreground text-sm sm:text-base">
              <MapPin className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
              {event.geographical_state}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2 space-y-1 sm:space-y-2">
          {event.description && <p className="text-foreground leading-relaxed text-sm sm:text-base line-clamp-3">{event.description}</p>}
        </CardContent>
        <CardFooter className="flex flex-col items-start pt-2 sm:pt-4">
          <div className="flex justify-end w-full space-x-1 sm:space-x-2">
            <Button variant="outline" size="icon" onClick={handleViewDetails} title="View Details" className="h-7 w-7 sm:h-9 sm:w-9">
              <ExternalLink className="h-3.5 w-3.5 sm:h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare} title="Share Event" className="h-7 w-7 sm:h-9 sm:w-9">
              <Share2 className="h-3.5 w-3.5 sm:h-4 w-4" />
            </Button>
            <Link to={`/edit-event/${event.id}`} state={{ from: location.pathname }}>
              <Button variant="outline" size="icon" title="Edit Event" className="h-7 w-7 sm:h-9 sm:w-9">
                <Edit className="h-3.5 w-3.5 sm:h-4 w-4" />
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" title="Delete Event" className="h-7 w-7 sm:h-9 sm:w-9">
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="dark:bg-card dark:border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will move your event to the trash. It will be hidden from public view but can be restored from the Admin Panel.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/80 text-destructive-foreground">Move to Trash</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>
      <EventDetailDialog event={event} isOpen={isEventDetailDialogOpen} onClose={() => setIsEventDetailDialogOpen(false)} />
    </>
  );
};

export default UserEventCard;