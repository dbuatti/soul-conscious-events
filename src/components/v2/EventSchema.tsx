import React from 'react';
import { Event } from '@/types/event';
import { format, parseISO } from 'date-fns';

interface EventSchemaProps {
  event: Event;
}

/**
 * Outputs JSON-LD structured data (Event schema.org) for search engine
 * rich results. Helps events appear with date, time, location and ticket
 * information directly in Google search.
 */
const EventSchema: React.FC<EventSchemaProps> = ({ event }) => {
  const startDate = parseISO(event.event_date);
  const endDate = event.end_date ? parseISO(event.end_date) : null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.event_name,
    description: event.description,
    // Date-only (no bogus time) keeps Google from shifting the day across time zones.
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.place_name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.place_name,
        addressRegion: event.geographical_state,
        addressCountry: 'AU',
      },
    },
    image: event.image_url,
    organizer: event.organizer_contact
      ? {
          '@type': 'Person',
          name: event.organizer_contact,
        }
      : undefined,
    offers: event.price && !event.price.toLowerCase().includes('free')
      ? {
          '@type': 'Offer',
          url: event.ticket_link,
          price: event.price.replace(/[^\d.]/g, ''),
          priceCurrency: 'AUD',
          availability: 'https://schema.org/InStock',
          validFrom: new Date().toISOString(),
        }
      : {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'AUD',
          availability: 'https://schema.org/InStock',
        },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default EventSchema;
