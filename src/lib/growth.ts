import { format, parseISO } from 'date-fns';
import type { Event } from '@/types/event';
import { formatPrice, getBaseEventId } from '@/utils/event-utils';

export interface UtmOptions {
  source: string;
  medium?: string;
  campaign: string;
  content?: string;
}

/** Build a shareable URL with consistent campaign attribution. */
export const buildTrackedUrl = (
  path: string,
  { source, medium = 'social', campaign, content }: UtmOptions,
  origin = window.location.origin,
) => {
  const url = new URL(path, origin);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  if (content) url.searchParams.set('utm_content', content);
  return url.toString();
};

export const getEventShareUrl = (
  event: Pick<Event, 'id'>,
  source = 'soulflow',
  campaign = 'event_share',
  origin = window.location.origin,
) => buildTrackedUrl(
  `/events/${encodeURIComponent(event.id)}`,
  { source, campaign, content: 'share_button' },
  origin,
);

const eventDateLabel = (event: Pick<Event, 'event_date' | 'event_time' | 'end_date'>) => {
  const start = parseISO(event.event_date);
  if (Number.isNaN(start.getTime())) return event.event_date;

  const end = event.end_date ? parseISO(event.end_date) : null;
  const date = end && !Number.isNaN(end.getTime()) && end.getTime() !== start.getTime()
    ? `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
    : format(start, 'EEEE d MMMM yyyy');

  return event.event_time ? `${date} · ${event.event_time}` : date;
};

/** A caption attendees can paste beside the event link. */
export const buildEventShareCaption = (
  event: Pick<Event, 'event_name' | 'event_date' | 'event_time' | 'end_date' | 'place_name' | 'geographical_state' | 'price'>,
) => {
  const location = [event.place_name, event.geographical_state].filter(Boolean).join(', ');
  const price = event.price && event.price.toLowerCase() !== 'free'
    ? formatPrice(event.price)
    : event.price?.toLowerCase() === 'free' ? 'Free' : null;

  return [
    event.event_name,
    eventDateLabel(event),
    location || null,
    price ? `Entry: ${price}` : null,
  ].filter(Boolean).join('\n');
};

/** A ready-to-post organiser caption with a tracked SoulFlow link. */
export const buildOrganiserShareCaption = (
  event: Pick<Event, 'id' | 'event_name' | 'event_date' | 'event_time' | 'end_date' | 'place_name' | 'geographical_state' | 'price'>,
  source = 'organiser',
  origin = window.location.origin,
) => {
  const details = buildEventShareCaption(event);
  return `${details}\n\nWe're listed on SoulFlow — a free guide to conscious events across Australia.\nDetails & booking: ${getEventShareUrl(event, source, 'organiser_share', origin)}`;
};

/** Keep visit analytics backwards-compatible while retaining UTM attribution. */
export const getVisitActionType = (search = window.location.search) => {
  const params = new URLSearchParams(search);
  const source = params.get('utm_source')?.trim();
  const campaign = params.get('utm_campaign')?.trim();
  if (!source) return 'visit';
  return `visit:${source.slice(0, 40)}${campaign ? `:${campaign.slice(0, 60)}` : ''}`;
};

/** All event analytics writes use the real base UUID, never a recurring suffix. */
export const eventAnalyticsId = (eventId: string) => getBaseEventId(eventId);
