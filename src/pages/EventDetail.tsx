import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Globe, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
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
  image_url?: string; // Added image_url
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details.');
        navigate('/404');
      } else if (data) {
        setEvent(data);
      } else {
        navigate('/404');
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id, navigate]);

  const handleShare = () => {
    if (event) {
      const eventUrl = `${window.location.origin}/events/${event.id}`;
      navigator.clipboard.writeText(eventUrl)
        .then(() => toast.success('Event link copied to clipboard!'))
        .catch(() => toast.error('Failed to copy link. Please try again.'));
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="flex justify-end mt-8 space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const googleMapsLink = event.full_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.full_address)}`
    : '#';

  return (
    <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-6">{event.event_name}</h1>

      {event.image_url && (
        <div className="mb-6">
          <img
            src={event.image_url}
            alt={event.event_name}
            className="w-full h-64 object-cover rounded-lg shadow-md"
          />
        </div>
      )}

      <Card className="shadow-md border-none">
        <CardHeader>
          <CardDescription className="flex items-center text-gray-600 mt-2">
            <Calendar className="mr-2 h-4 w-4 text-blue-500" />
            {event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBD'}
            {event.event_time && (
              <>
                <Clock className="ml-4 mr-2 h-4 w-4 text-green-500" />
                {event.event_time}
              </>
            )}
          </CardDescription>
          {(event.place_name || event.full_address || event.state) && (
            <CardDescription className="flex flex-col items-start text-gray-600 mt-1">
              {event.place_name && (
                <div className="flex items-center mb-1">
                  <MapPin className="mr-2 h-4 w-4 text-red-500" />
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-base py-1 px-2">
                    {event.place_name}
                  </Badge>
                </div>
              )}
              {event.full_address && (
                <div className="flex items-center">
                  {!event.place_name && <MapPin className="mr-2 h-4 w-4 text-red-500" />}
                  <a
                    href={googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-base"
                  >
                    {event.full_address}
                  </a>
                </div>
              )}
              {event.state && (
                <div className="flex items-center mt-1">
                  <Globe className="mr-2 h-4 w-4 text-orange-500" />
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-base py-1 px-2">
                    {event.state}
                  </Badge>
                </div>
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {event.description && (
            <div>
              <h3 className="font-semibold text-lg text-gray-800 mb-2">Description:</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
          {event.price && (
            <p className="flex items-center text-gray-700">
              <DollarSign className="mr-2 h-5 w-5 text-green-600" />
              <span className="font-medium">Price:</span> {event.price}
              {event.price.toLowerCase() === 'free' && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Free</Badge>
              )}
            </p>
          )}
          {event.ticket_link && (
            <div className="flex items-center">
              <LinkIcon className="mr-2 h-5 w-5 text-purple-600" />
              <Button asChild variant="link" className="p-0 h-auto text-blue-600 text-base">
                <a href={event.ticket_link} target="_blank" rel="noopener noreferrer">
                  Ticket/Booking Link
                </a>
              </Button>
            </div>
          )}
          {event.special_notes && (
            <p className="flex items-start text-gray-700">
              <Info className="mr-2 h-5 w-5 text-orange-500 mt-1" />
              <span className="font-medium">Special Notes:</span> {event.special_notes}
            </p>
          )}
          {event.organizer_contact && (
            <p className="flex items-center text-gray-700">
              <User className="mr-2 h-5 w-5 text-indigo-500" />
              <span className="font-medium">Organizer:</span> {event.organizer_contact}
            </p>
          )}
          {event.event_type && (
            <p className="flex items-center text-gray-700">
              <Tag className="mr-2 h-5 w-5 text-pink-500" />
              <span className="font-medium">Event Type:</span> {event.event_type}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end mt-8 space-x-2">
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Events
        </Button>
        <Button onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share Event
        </Button>
      </div>
    </div>
  );
};

export default EventDetail;