import React from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { CalendarIcon, Clock, MapPin, DollarSign, LinkIcon, Info, User, Tag, Frown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

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

interface AgendaOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  events: Event[];
  onEventSelect: (event: Event) => void;
}

const AgendaOverlay: React.FC<AgendaOverlayProps> = ({
  isOpen,
  onClose,
  selectedDate,
  events,
  onEventSelect,
}) => {
  const isMobile = useIsMobile();

  const Wrapper = isMobile ? Sheet : Dialog;
  const Content = isMobile ? SheetContent : DialogContent;
  const Header = isMobile ? SheetHeader : DialogHeader;
  const Title = isMobile ? SheetTitle : DialogTitle;
  const Footer = isMobile ? SheetFooter : DialogFooter;
  const Close = isMobile ? SheetClose : DialogClose;

  const renderEventCard = (event: Event) => {
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
      <Card key={event.id} className="group shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer dark:bg-secondary dark:border-border" onClick={() => onEventSelect(event)}>
        {event.image_url && (
          <div className="relative w-full h-32 overflow-hidden rounded-t-lg">
            <img
              src={event.image_url}
              alt={`Image for ${event.event_name}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-base font-semibold text-primary line-clamp-1">{event.event_name}</CardTitle>
          <CardDescription className="flex items-center text-muted-foreground text-xs mt-1">
            <CalendarIcon className="mr-1 h-3 w-3 text-primary" />
            {dateDisplay}
            {event.event_time && (
              <>
                <Clock className="ml-2 mr-1 h-3 w-3 text-primary" />
                {event.event_time}
              </>
            )}
          </CardDescription>
          {(event.place_name || event.full_address) && (
            <CardDescription className="flex items-center text-muted-foreground text-xs mt-1">
              <MapPin className="mr-1 h-3 w-3 text-primary" />
              {event.place_name || event.full_address}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-2">
          {event.description && (
            <p className="text-foreground text-sm line-clamp-2 mb-2">{event.description}</p>
          )}
          <div className="flex justify-end">
            <Button variant="link" size="sm" className="p-0 h-auto text-primary text-xs">View Details</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Wrapper open={isOpen} onOpenChange={onClose}>
      <Content className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto dark:bg-card dark:border-border">
        <Header>
          <Title className="text-3xl font-bold text-foreground text-center">
            Agenda for {selectedDate ? format(selectedDate, 'PPP') : 'Selected Day'}
          </Title>
        </Header>
        <div className="p-4 space-y-4">
          {events.length === 0 ? (
            <div className="p-8 bg-secondary rounded-lg border border-border text-center">
              <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-4">
                No events found for this date.
              </p>
              <Link to="/submit-event">
                <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                  Add a New Event
                </Button>
              </Link>
            </div>
          ) : (
            events.map((event) => renderEventCard(event))
          )}
        </div>
        <Footer className="flex justify-end p-4 border-t border-border">
          <Close asChild>
            <Button variant="secondary" className="transition-all duration-300 ease-in-out transform hover:scale-105">
              Close
            </Button>
          </Close>
        </Footer>
      </Content>
    </Wrapper>
  );
};

export default AgendaOverlay;