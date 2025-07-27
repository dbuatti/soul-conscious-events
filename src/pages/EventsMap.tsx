import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, Clock, DollarSign, LinkIcon, Info, User, Tag, Globe } from 'lucide-react';

// Fix for default Leaflet icon issue with Webpack/Vite
// The problematic line has been removed. The mergeOptions below correctly handles the icon paths.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  location?: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  ticket_link?: string;
  price?: string;
  special_notes?: string;
  organizer_contact?: string;
  event_type?: string;
  state?: string;
}

const EventsMap = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const defaultCenter: [number, number] = [-25.2744, 133.7751]; // Center of Australia
  const defaultZoom = 4;

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .not('latitude', 'is', null) // Only fetch events with latitude
        .not('longitude', 'is', null); // Only fetch events with longitude

      if (error) {
        console.error('Error fetching events for map:', error);
        toast.error('Failed to load events for the map.');
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl border border-gray-200 flex flex-col items-center justify-center min-h-[500px]">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Loading Events Map...</h2>
        <Skeleton className="w-full h-[400px] rounded-lg" />
        <p className="text-center text-gray-600 mt-4">Fetching event locations...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Events Map</h2>
      <p className="text-center text-gray-600 mb-8">
        Explore SoulFlow events across Australia on the map.
      </p>
      <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-md border border-gray-300">
        <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom={true} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {events.map((event) => (
            event.latitude && event.longitude ? (
              <Marker key={event.id} position={[event.latitude, event.longitude]}>
                <Popup>
                  <div className="font-sans text-sm">
                    <h3 className="font-bold text-base text-purple-700 mb-1">{event.event_name}</h3>
                    <p className="flex items-center text-gray-700 mb-0.5">
                      <Calendar className="mr-1 h-3 w-3 text-blue-500" />
                      {event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBD'}
                    </p>
                    {event.event_time && (
                      <p className="flex items-center text-gray-700 mb-0.5">
                        <Clock className="mr-1 h-3 w-3 text-green-500" />
                        {event.event_time}
                      </p>
                    )}
                    {event.full_address && (
                      <p className="flex items-center text-gray-700 mb-0.5">
                        <MapPin className="mr-1 h-3 w-3 text-red-500" />
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {event.full_address}
                        </a>
                      </p>
                    )}
                    {event.state && (
                      <p className="flex items-center text-gray-700 mb-0.5">
                        <Globe className="mr-1 h-3 w-3 text-orange-500" />
                        {event.state}
                      </p>
                    )}
                    {event.description && (
                      <p className="text-gray-700 mt-1">
                        {event.description.length > 100 ? `${event.description.substring(0, 100)}...` : event.description}
                      </p>
                    )}
                    {event.ticket_link && (
                      <p className="flex items-center text-gray-700 mt-1">
                        <LinkIcon className="mr-1 h-3 w-3 text-purple-600" />
                        <a href={event.ticket_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Ticket Link
                        </a>
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default EventsMap;