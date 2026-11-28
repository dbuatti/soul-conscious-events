import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMAGE,
  baseEventIdFromPath,
  buildCityMeta,
  buildEventMeta,
  formatEventDate,
  injectPageMeta,
  lowestPrice,
} from './share-meta';

const shell = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

const event = {
  id: '21c3a96c-eee5-4d68-a941-d946a0645657',
  event_name: 'Weaving is Healing  Melbourne',
  event_date: '2027-02-06',
  end_date: '2027-02-07',
  event_time: '10:30am',
  place_name: 'CERES Community Environment Park',
  full_address: 'Roberts Street, Brunswick East, VIC 3057',
  geographical_state: 'VIC',
  description: 'Weave two baskets in a "ceremony-style" weekend </script><script>alert(1)</script>',
  price: '$54.26–$255.43',
  image_url: 'https://img.example.com/weave.jpg',
  ticket_link: 'https://tickets.example.com/weave',
};

describe('share meta helpers', () => {
  it('recovers the base uuid from recurring instance ids and rejects junk', () => {
    expect(baseEventIdFromPath('21c3a96c-eee5-4d68-a941-d946a0645657-20270206')).toBe(event.id);
    expect(baseEventIdFromPath(event.id.toUpperCase())).toBe(event.id);
    expect(baseEventIdFromPath('not-a-real-id')).toBeNull();
    expect(baseEventIdFromPath(undefined)).toBeNull();
  });

  it('formats dates without time-zone drift', () => {
    expect(formatEventDate('2027-02-06')).toBe('Sat 6 Feb 2027');
  });

  it('takes the lowest price for structured data', () => {
    expect(lowestPrice('$54.26–$255.43')).toBe('54.26');
    expect(lowestPrice('$1,200')).toBe('1200');
    expect(lowestPrice('Free')).toBe('0');
    expect(lowestPrice('Contact host')).toBeNull();
  });
});

describe('injectPageMeta', () => {
  it('writes event title, description, image and url into every preview tag', () => {
    const html = injectPageMeta(shell, buildEventMeta(event));
    expect(html).toContain('<title>Weaving is Healing Melbourne | SoulFlow</title>');
    expect(html).toContain('property="og:title" content="Weaving is Healing Melbourne | SoulFlow"');
    expect(html).toContain('name="twitter:image" content="https://img.example.com/weave.jpg"');
    expect(html).toContain(`property="og:url" content="https://soulflowau.vercel.app/events/${event.id}"`);
    expect(html).toContain(`rel="canonical" href="https://soulflowau.vercel.app/events/${event.id}"`);
    expect(html).toContain('Sat 6 Feb 2027 · 10:30am — CERES Community Environment Park, VIC.');
    expect(html).not.toContain('og:image:width');
    expect(html).not.toContain('content="SoulFlow | Discover Soulful Events in Australia"');
  });

  it('cannot be broken out of by event text', () => {
    const html = injectPageMeta(shell, buildEventMeta(event));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&quot;ceremony-style&quot;');
    const ld = html.match(/<script type="application\/ld\+json" data-page-meta>([\s\S]*?)<\/script>/);
    expect(ld).not.toBeNull();
    const parsed = JSON.parse(ld![1]);
    expect(parsed.offers.price).toBe('54.26');
    expect(parsed.location.address.streetAddress).toBe(event.full_address);
  });

  it('uses the default card for city pages and keeps its dimensions', () => {
    const html = injectPageMeta(shell, buildCityMeta({ slug: 'melbourne', name: 'Melbourne', seoDescription: 'Find events in Melbourne.' }));
    expect(html).toContain('<title>Conscious events in Melbourne | SoulFlow</title>');
    expect(html).toContain(`property="og:image" content="${DEFAULT_IMAGE}"`);
    expect(html).toContain('og:image:width');
    expect(html).not.toContain('data-page-meta');
  });
});
