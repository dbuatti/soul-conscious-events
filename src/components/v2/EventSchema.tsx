import React from 'react';
import { Event } from '@/types/event';
import { SITE_URL, buildEventJsonLd } from '@/lib/share-meta';
import { getBaseEventId } from '@/utils/event-utils';

interface EventSchemaProps {
  event: Event;
}

/**
 * Event JSON-LD for search engines. When the page was served by
 * api/page-meta (a direct visit to /events/:id), the same data is already in
 * the <head>, so this renders nothing and Google sees a single Event. It only
 * fills the gap when the page was reached by in-app navigation.
 */
const EventSchema: React.FC<EventSchemaProps> = ({ event }) => {
  if (typeof document !== 'undefined' && document.querySelector('script[data-page-meta]')) {
    return null;
  }
  const id = getBaseEventId(event.id);
  const schema = buildEventJsonLd({ ...event, id }, `${SITE_URL}/events/${id}`);
  return (
    <script
      type="application/ld+json"
      // Escape "<" so event text cannot close the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
};

export default EventSchema;
