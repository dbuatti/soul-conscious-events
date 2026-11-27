import { describe, expect, it } from 'vitest';
import {
  buildEventShareCaption,
  buildOrganiserShareCaption,
  buildTrackedUrl,
  eventAnalyticsId,
  getEventShareUrl,
  getVisitActionType,
} from '@/lib/growth';

const event = {
  id: '11111111-1111-4111-8111-111111111111-20261205',
  event_name: 'Golden Hour Piano',
  event_date: '2026-12-05',
  event_time: '6:00 PM',
  place_name: 'The Serenity Studio',
  geographical_state: 'VIC',
  price: '25',
};

describe('growth links and captions', () => {
  it('adds consistent UTM parameters', () => {
    const url = new URL(buildTrackedUrl('/melbourne', {
      source: 'instagram',
      campaign: 'weekly-picks',
      content: 'bio',
    }, 'https://soulflowau.vercel.app'));

    expect(url.pathname).toBe('/melbourne');
    expect(url.searchParams.get('utm_source')).toBe('instagram');
    expect(url.searchParams.get('utm_medium')).toBe('social');
    expect(url.searchParams.get('utm_campaign')).toBe('weekly-picks');
    expect(url.searchParams.get('utm_content')).toBe('bio');
  });

  it('keeps a recurring instance date in the shared event URL', () => {
    const url = new URL(getEventShareUrl(event, 'instagram', 'weekly-picks', 'https://soulflowau.vercel.app'));
    expect(url.pathname).toBe(`/events/${event.id}`);
  });

  it('strips recurring suffixes only for analytics writes', () => {
    expect(eventAnalyticsId(event.id)).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('builds a useful attendee caption', () => {
    const caption = buildEventShareCaption(event);
    expect(caption).toContain('Golden Hour Piano');
    expect(caption).toContain('Saturday 5 December 2026');
    expect(caption).toContain('The Serenity Studio, VIC');
    expect(caption).toContain('Entry: $25');
  });

  it('builds an organiser caption with a tracked link', () => {
    const caption = buildOrganiserShareCaption(event, 'venue-story', 'https://soulflowau.vercel.app');
    expect(caption).toContain("We're listed on SoulFlow");
    expect(caption).toContain('utm_source=venue-story');
    expect(caption).toContain('utm_campaign=organiser_share');
  });

  it('marks free events clearly', () => {
    expect(buildEventShareCaption({ ...event, price: 'free' })).toContain('Entry: Free');
  });

  it('preserves normal visits and encodes UTM visits for attribution', () => {
    expect(getVisitActionType('')).toBe('visit');
    expect(getVisitActionType('?utm_source=instagram&utm_campaign=weekly-picks'))
      .toBe('visit:instagram:weekly-picks');
  });
});
