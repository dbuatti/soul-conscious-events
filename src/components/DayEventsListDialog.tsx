import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
}

interface DayEventsListDialogProps {
  events: Event[];
  selectedDate: Date | null;
  isOpen: boolean;
  onClose: () => void;
  onEventSelect: (event: Event) => void;
}

const DayEventsListDialog: React.FC<DayEventsListDialogProps> = ({
  events,
  selectedDate,
  isOpen,
  onClose,
  onEventSelect,
}) => {
  const formattedSelectedDate = selectedDate ? format(selectedDate, 'PPP') : 'Selected Day';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Events on {formattedSelectedDate}</DialogTitle>
          <DialogDescription>
            Select an event to view more details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {events.length === 0 ? (
            <p className="text-center text-gray-600">No events found for this day.</p>
          ) : (
            events.map((event) => {
              const googleMapsLink = event.full_address
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.full_address)}`
                : '#';

              const formattedStartDate = event.event_date
                ? format(parseISO(event.event_date), 'PPP')
                : 'Date TBD';
              const formattedEndDate = event.end_date
                ? format(parseISO(event.end_date), 'PPP')
                : '';

              const dateDisplay =
                event.end_date && event.event_date !== event.end_date
                  ? `${formattedStartDate} - ${formattedEndDate}`
                  : formattedStartDate;

              return (
                <Card
                  key={event.id}
                  className="group shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => onEventSelect(event)}
                >
                  {event.image_url && (
                    <div className="relative w-full h-32 overflow-hidden rounded-t-lg">
                      <img
                        src={event.image_url}
                        alt={`Image for ${event.event_name}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                  )}
                  <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-lg font-semibold text-purple-700 line-clamp-1">{event.event_name}</CardTitle>
                    <CardDescription className="flex items-center text-gray-600 text-sm mt-1">
                      <Calendar className="mr-1 h-4 w-4 text-blue-500" />
                      {dateDisplay}
                      {event.event_time && (
                        <>
                          <Clock className="ml-2 mr-1 h-4 w-4 text-green-500" />
                          {event.event_time}
                        </>
                      )}
                    </CardDescription>
                    {(event.place_name || event.full_address) && (
                      <CardDescription className="flex items-center text-gray-600 text-sm mt-1">
                        <MapPin className="mr-1 h-4 w-4 text-red-500" />
                        {event.place_name || event.full_address}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    {event.description && (
                      <p className="text-foreground text-sm line-clamp-2 mb-2">{event.description}</p>
                    )}
                    <div className="flex justify-end">
                      <Button variant="link" size="sm" className="p-0 h-auto text-blue-600 text-xs">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose} className="transition-all duration-300 ease-in-out transform hover:scale-105">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DayEventsListDialog;