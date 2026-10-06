// Run with: deno test supabase/functions/_shared/event-import.test.ts
import assert from 'node:assert/strict';
import {
  classifyEventType, detectState, eventsFromHtml, eventsFromIcs, eventUrlsFromSitemap,
  findEventLinks, findPaginationLinks, isoToLocalParts, jsonLdListUrls, extractJsonLdNodes,
  looksLikeEventPath, nextOccurrenceOnOrAfter, normalizeUrl, orderSitemapsByLikelihood,
  parseSitemap, priceFromOffers,
  robotsAllows, scoreRelevance, sitemapsFromRobots,
} from './event-import.ts';

const OPTS = { today: '2026-10-05', maxDate: '2027-10-05' };

const humanitixPage = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Event",
 "name":"Full Moon Crystal Bowl Sound Bath &amp; Cacao",
 "startDate":"2026-10-12T19:00:00+11:00","endDate":"2026-10-12T20:30:00+11:00",
 "eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode",
 "location":{"@type":"Place","name":"The Yoga Space","address":{"@type":"PostalAddress","streetAddress":"123 Smith St","addressLocality":"Fitzroy","addressRegion":"VIC","postalCode":"3065","addressCountry":"AU"}},
 "image":["https://images.humanitix.com/abc.jpg"],
 "description":"<p>Drift into deep rest.</p><p>Bring a blanket.</p>",
 "offers":[{"@type":"Offer","price":"45.00","priceCurrency":"AUD","url":"https://events.humanitix.com/full-moon-sound-bath/tickets"},{"@type":"Offer","price":"35","priceCurrency":"AUD"}],
 "organizer":{"@type":"Organization","name":"Maya Lin"}}</script>
</head><body></body></html>`;

Deno.test('maps a ticketing page JSON-LD event', () => {
  const { events } = eventsFromHtml(humanitixPage, 'https://events.humanitix.com/full-moon-sound-bath', OPTS);
  assert.equal(events.length, 1);
  const e = events[0];
  assert.equal(e.event_name, 'Full Moon Crystal Bowl Sound Bath & Cacao');
  assert.equal(e.event_date, '2026-10-12');
  assert.equal(e.end_date, null);
  assert.equal(e.event_time, '7:00pm – 8:30pm');
  assert.equal(e.place_name, 'The Yoga Space');
  assert.equal(e.full_address, '123 Smith St, Fitzroy, VIC 3065, AU');
  assert.equal(e.geographical_state, 'VIC');
  assert.equal(e.price, '$35–$45');
  assert.equal(e.ticket_link, 'https://events.humanitix.com/full-moon-sound-bath/tickets');
  assert.equal(e.organizer_contact, 'Maya Lin (via Humanitix)');
  assert.equal(e.event_type, 'Sound Bath');
  assert.equal(e.image_url, 'https://images.humanitix.com/abc.jpg');
  assert.equal(e.description, 'Drift into deep rest.\nBring a blanket.');
  assert.equal(e.external_id, 'events.humanitix.com/full-moon-sound-bath/tickets');
});

const organiserPage = `<html><head><script type="application/ld+json">
[{"@context":"https://schema.org","@type":"ItemList","itemListElement":[
  {"@type":"ListItem","position":1,"item":{"@type":"Event","name":"Ecstatic Dance Journey","startDate":"2026-10-11T10:00:00+11:00","endDate":"2026-10-11T12:30:00+11:00","url":"https://www.eventbrite.com.au/e/ecstatic-dance-journey-tickets-111","location":{"@type":"Place","name":"Abbotsford Convent","address":"1 St Heliers St, Abbotsford VIC 3067"},"offers":{"@type":"AggregateOffer","lowPrice":"25","highPrice":"30"}}},
  {"@type":"ListItem","position":2,"item":{"@type":"Event","name":"Old Gathering","startDate":"2026-09-01T10:00:00+10:00","location":{"@type":"Place","name":"Hall"}}},
  {"@type":"ListItem","position":3,"item":{"@type":"MusicEvent","name":"London Kirtan","startDate":"2026-11-01T19:00:00Z","location":{"@type":"Place","name":"Hall","address":{"@type":"PostalAddress","addressLocality":"London","addressCountry":"GB"}}}},
  {"@type":"ListItem","position":4,"url":"https://www.eventbrite.com.au/e/breathwork-tickets-222"}
]}]</script></head><body>
<a href="https://www.eventbrite.com.au/e/breathwork-tickets-222?aff=ebdsoporgprofile">Breathwork</a>
<a href="https://www.eventbrite.com.au/e/ecstatic-dance-journey-tickets-111">Dance</a>
<a href="https://www.eventbrite.com.au/o/some-organiser-123">Organiser</a>
<a href="/help">Help</a>
</body></html>`;

Deno.test('reads events listed on an organiser page and skips past or overseas ones', () => {
  const url = 'https://www.eventbrite.com.au/o/some-organiser-123';
  const { events, skipped } = eventsFromHtml(organiserPage, url, OPTS);
  assert.deepEqual(events.map((e) => e.event_name), ['Ecstatic Dance Journey']);
  assert.equal(events[0].price, '$25–$30');
  assert.equal(events[0].geographical_state, 'VIC');
  assert.equal(events[0].event_type, 'Music');
  assert.equal(skipped.past, 1);
  assert.equal(skipped['not-australian'], 1);

  const links = findEventLinks(organiserPage, url);
  assert.deepEqual(links, [
    'https://www.eventbrite.com.au/e/breathwork-tickets-222',
    'https://www.eventbrite.com.au/e/ecstatic-dance-journey-tickets-111',
  ]);
  assert.deepEqual(jsonLdListUrls(extractJsonLdNodes(organiserPage), url), ['https://www.eventbrite.com.au/e/breathwork-tickets-222']);
});

const venuePage = `<html><body>
<a href="https://venue.example.com.au/event/kirtan-circle/">Kirtan</a>
<a href="/event/foraging-walk/?utm_source=x">Foraging</a>
<a href="/events/category/music/">Music category</a>
<a href="/events/">All events</a>
<a href="https://megatix.com.au/events/sunset-sound-journey">Sound journey</a>
<a href="https://other.example.com/event/elsewhere/">Elsewhere</a>
</body></html>`;

Deno.test('finds event links on a venue listing page', () => {
  assert.deepEqual(findEventLinks(venuePage, 'https://venue.example.com.au/events/'), [
    'https://venue.example.com.au/event/kirtan-circle/',
    'https://venue.example.com.au/event/foraging-walk/',
    'https://megatix.com.au/events/sunset-sound-journey',
  ]);
});

Deno.test('converts UTC timestamps into Australian local time', () => {
  // 08:00Z on 12 Oct is 7pm in Sydney (AEDT, UTC+11).
  assert.deepEqual(isoToLocalParts('2026-10-12T08:00:00Z'), { date: '2026-10-12', time: '19:00' });
  // ...and 6pm in Brisbane, which has no daylight saving.
  assert.deepEqual(isoToLocalParts('2026-10-12T08:00:00Z', 'Australia/Brisbane'), { date: '2026-10-12', time: '18:00' });
  assert.deepEqual(isoToLocalParts('2026-10-12'), { date: '2026-10-12', time: null });
  assert.equal(isoToLocalParts('not a date'), null);
});

const ics = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'X-WR-TIMEZONE:Australia/Melbourne',
  'BEGIN:VEVENT',
  'UID:abc-123@google.com',
  'DTSTART;TZID=Australia/Melbourne:20261014T183000',
  'DTEND;TZID=Australia/Melbourne:20261014T200000',
  'RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T000000Z',
  'SUMMARY:Breathwork Circle\\, Northcote',
  'LOCATION:Northcote Town Hall\\, 189 High St\\, Northcote VIC 3070',
  'DESCRIPTION:A gentle guided breathwork session.\\nBook: https://events.humanitix.com/breath',
  ' work-circle',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:allday-1',
  'DTSTART;VALUE=DATE:20261024',
  'DTEND;VALUE=DATE:20261026',
  'SUMMARY:Weekend Retreat',
  'LOCATION:Daylesford',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:utc-1',
  'DTSTART:20261020T083000Z',
  'SUMMARY:Sound Healing',
  'URL:https://example.com/sound',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:past-1',
  'DTSTART:20260101T090000Z',
  'SUMMARY:Old thing',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:cancel-1',
  'DTSTART:20261101T090000Z',
  'STATUS:CANCELLED',
  'SUMMARY:Cancelled thing',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:abc-123@google.com',
  'RECURRENCE-ID;TZID=Australia/Melbourne:20261028T183000',
  'DTSTART;TZID=Australia/Melbourne:20261028T190000',
  'SUMMARY:Breathwork Circle (moved)',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

Deno.test('parses a calendar feed', () => {
  const { events, skipped } = eventsFromIcs(ics, 'https://calendar.example.com/feed.ics', OPTS);
  assert.deepEqual(events.map((e) => e.event_name), ['Breathwork Circle, Northcote', 'Weekend Retreat', 'Sound Healing']);

  const [circle, retreat, sound] = events;
  assert.equal(circle.event_date, '2026-10-14');
  assert.equal(circle.event_time, '6:30pm – 8:00pm');
  assert.equal(circle.recurring_pattern, 'FORTNIGHTLY');
  assert.equal(circle.recurring_end_date, '2026-12-31');
  assert.equal(circle.place_name, 'Northcote Town Hall');
  assert.equal(circle.geographical_state, 'VIC');
  assert.equal(circle.ticket_link, 'https://events.humanitix.com/breathwork-circle');
  assert.equal(circle.event_type, 'Meditation');
  assert.equal(circle.external_id, 'abc-123@google.com');

  assert.equal(retreat.event_date, '2026-10-24');
  assert.equal(retreat.end_date, '2026-10-25');
  assert.equal(retreat.event_time, null);
  assert.equal(retreat.event_type, 'Community Gathering');

  // 08:30Z is 7:30pm in Melbourne (the calendar's zone).
  assert.equal(sound.event_time, '7:30pm');
  assert.equal(sound.ticket_link, 'https://example.com/sound');

  assert.equal(skipped.past, 1);
  assert.equal(skipped.invalid, 1);
});

Deno.test('detects states from names, abbreviations and postcodes', () => {
  assert.equal(detectState('Victoria'), 'VIC');
  assert.equal(detectState('12 Jonson St, Byron Bay 2481'), 'NSW');
  assert.equal(detectState('Canberra 2601'), 'ACT');
  assert.equal(detectState('Darwin 0800'), 'NT');
  assert.equal(detectState('South Australia'), 'SA');
  assert.equal(detectState('Somewhere'), null);
});

Deno.test('formats prices', () => {
  assert.equal(priceFromOffers([{ price: '0' }]), 'Free');
  assert.equal(priceFromOffers({ price: 20.5 }), '$20.50');
  assert.equal(priceFromOffers(undefined), null);
});

Deno.test('classifies event types', () => {
  assert.equal(classifyEventType('Gong bath under the stars'), 'Sound Bath');
  assert.equal(classifyEventType('Poetry open mic night'), 'Open Mic');
  assert.equal(classifyEventType('Intro to pottery class'), 'Workshop');
  assert.equal(classifyEventType('Something else entirely'), 'Other');
});

Deno.test('normalises URLs for duplicate detection', () => {
  assert.equal(normalizeUrl('https://WWW.Eventbrite.com.au/e/x-tickets-1/?aff=1#top'), 'eventbrite.com.au/e/x-tickets-1');
  assert.equal(normalizeUrl('mailto:hi@example.com'), null);
});

Deno.test('respects robots.txt', () => {
  const robots = 'User-agent: *\nDisallow: /private\nAllow: /private/events\n\nUser-agent: BadBot\nDisallow: /';
  assert.equal(robotsAllows(robots, '/events/x'), true);
  assert.equal(robotsAllows(robots, '/private/x'), false);
  assert.equal(robotsAllows(robots, '/private/events/x'), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /', '/anything'), false);
  assert.equal(robotsAllows('', '/anything'), true);
});

Deno.test('moves long-running recurring series to their next occurrence', () => {
  assert.equal(nextOccurrenceOnOrAfter('2026-09-07', 'WEEKLY', '2026-10-05'), '2026-10-05');
  assert.equal(nextOccurrenceOnOrAfter('2026-09-08', 'WEEKLY', '2026-10-05'), '2026-10-06');
  assert.equal(nextOccurrenceOnOrAfter('2026-09-01', 'FORTNIGHTLY', '2026-10-05'), '2026-10-13');
  assert.equal(nextOccurrenceOnOrAfter('2026-01-31', 'MONTHLY', '2026-10-05'), '2026-10-31');
  assert.equal(nextOccurrenceOnOrAfter('2026-01-31', 'MONTHLY', '2026-11-05'), '2026-11-30');
  assert.equal(nextOccurrenceOnOrAfter('2026-12-01', 'DAILY', '2026-10-05'), '2026-12-01');

  const feed = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'UID:w1', 'DTSTART;TZID=Australia/Melbourne:20260908T183000',
    'DTEND;TZID=Australia/Melbourne:20260908T200000', 'RRULE:FREQ=WEEKLY', 'SUMMARY:Weekly Breathwork', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:w2', 'DTSTART:20260101T090000Z', 'RRULE:FREQ=WEEKLY;UNTIL=20260301T000000Z', 'SUMMARY:Finished series', 'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const { events, skipped } = eventsFromIcs(feed, 'https://cal.example.com/x.ics', OPTS);
  assert.equal(events.length, 1);
  assert.equal(events[0].event_date, '2026-10-06');
  assert.equal(events[0].event_time, '6:30pm – 8:00pm');
  assert.equal(events[0].recurring_pattern, 'WEEKLY');
  assert.equal(skipped.past, 1);
});

// ---------------------------------------------------------------------------
// Site-agnostic discovery: sitemaps, pagination, unfamiliar URL shapes
// ---------------------------------------------------------------------------

Deno.test('recognises event paths on sites it has never seen', () => {
  for (const path of [
    '/events/morning-yoga',            // plain WordPress-ish
    '/classes/sound-bath',
    '/programs/retreat-2027',
    '/calendar/meditation-circle',
    '/event/1234',
    '/workshops/tibetan-buddhism-intro',
    '/whatson/guided-sit',             // hyphen-free variant
  ]) {
    assert.equal(looksLikeEventPath(path), true, `expected ${path} to match`);
  }
  // A bare section is a listing page, not an event.
  assert.equal(looksLikeEventPath('/whats-on'), false);
});

Deno.test('ignores faceted browse pages that hide a location slug first', () => {
  // Humanitix and similar sites nest filters under a location slug, so the
  // facet word is never the immediate parent. Matching the whole path prefix
  // would treat /events/<location>/foodanddrink as an event.
  assert.equal(looksLikeEventPath('/au/events/au--melbourne--3000/foodanddrink'), false);
  assert.equal(looksLikeEventPath('/au/events/au--melbourne--3000/trending--music'), false);
  assert.equal(looksLikeEventPath('/au/events/au--melbourne--3000/foryou'), false);
  // The location page itself is still a valid candidate.
  assert.equal(looksLikeEventPath('/au/events/au--vic--melbourne'), true);
});

Deno.test('ignores faceted, utility and non-event paths', () => {
  for (const path of [
    '/events/category/yoga',           // facet, not a single event
    '/events/tag/music',
    '/events/page/2',
    '/events/venue/123',
    '/events/search',
    '/about',
    '/shop',
    '/',
  ]) {
    assert.equal(looksLikeEventPath(path), false, `expected ${path} not to match`);
  }
});

Deno.test('finds event links on an unfamiliar venue site, skipping chrome', () => {
  const html = `<a href="/">Home</a>
    <a href="/events/guided-meditation-march">Guided Meditation</a>
    <a href="/events/sound-bath-intro">Sound Bath</a>
    <a href="/classes/yoga-flow">Yoga Flow</a>
    <a href="/news/new-studio">News</a>
    <a href="/donate">Donate</a>
    <a href="https://www.instagram.com/abbotsford">Instagram</a>
    <a href="/events?utm_source=facebook&x=1">Tracked link</a>`;
  const found = findEventLinks(html, 'https://abbotsfordconvent.org.au/whats-on');
  assert.deepEqual(found.map((u) => new URL(u).pathname), [
    '/events/guided-meditation-march',
    '/events/sound-bath-intro',
    '/classes/yoga-flow',
  ]);
  // The tracked duplicate collapses onto the same normalised URL, and a bare
  // "/events" section link is a listing rather than an event.
  assert.ok(!found.some((u) => u.includes('utm_source')));
  assert.ok(!found.some((u) => new URL(u).pathname === '/events'));
});

Deno.test('does not re-queue the listing page it is already on', () => {
  const pageUrl = 'https://mysite.com.au/au/events/au--melbourne--3000';
  const html = `<a href="/au/events/au--melbourne--3000">All Melbourne</a>
    <a href="/au/events/morning-yoga-12345">Morning Yoga</a>`;
  assert.deepEqual(findEventLinks(html, pageUrl), ['https://mysite.com.au/au/events/morning-yoga-12345']);
});

Deno.test('still follows known ticketing links pointing off-site', () => {
  const html = `<a href="https://events.humanitix.com/dreaming-big">Humanitix</a>
    <a href="https://www.eventbrite.com.au/e/some-event-tickets">Eventbrite</a>
    <a href="https://random-blog.example/post/1">Unrelated</a>`;
  const found = findEventLinks(html, 'https://mysite.com.au/events');
  assert.equal(found.length, 2);
});

Deno.test('picks up pagination links to walk past page one', () => {
  const html = `<a href="/whats-on?page=2">2</a>
    <a href="/whats-on">Home</a>
    <a href="/about">About</a>
    <a href="/whats-on?page=3" rel="next">Next</a>
    <a href="https://elsewhere.example/x">Elsewhere</a>`;
  const pages = findPaginationLinks(html, 'https://mysite.com.au/whats-on');
  assert.deepEqual(pages.map((u) => new URL(u).search), ['?page=2', '?page=3']);
  assert.ok(!pages.some((u) => u.includes('elsewhere')));
});

Deno.test('reads sitemap declarations out of robots.txt', () => {
  const robots = `User-agent: *\nAllow: /\nSitemap: https://mysite.com.au/sitemap.xml\n# comment\nSitemap: https://mysite.com.au/sitemaps/events.xml\n`;
  assert.deepEqual(sitemapsFromRobots(robots), [
    'https://mysite.com.au/sitemap.xml',
    'https://mysite.com.au/sitemaps/events.xml',
  ]);
});

Deno.test('parses a urlset sitemap and keeps its event pages', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://mysite.com.au/</loc></url>
  <url><loc>https://mysite.com.au/events/meditation-retreat?x=1</loc></url>
  <url><loc>https://mysite.com.au/events/yoga-teacher-training</loc></url>
  <url><loc>https://mysite.com.au/events/past/2024</loc></url>
  <url><loc>https://mysite.com.au/events/online</loc></url>
  <url><loc>https://other-site.com/events/somewhere-else</loc></url>
</urlset>`;
  const { urls, isIndex } = parseSitemap(xml);
  assert.equal(isIndex, false);
  assert.equal(urls.length, 6);
  const events = eventUrlsFromSitemap(urls, 'https://mysite.com.au/whats-on');
  // Archive and browse pages are dropped even though they sit under /events/.
  assert.deepEqual(events.map((u) => new URL(u).pathname), [
    '/events/meditation-retreat',
    '/events/yoga-teacher-training',
  ]);
});

Deno.test('spends a capped sitemap budget on the most event-like pages first', () => {
  const xml = `<urlset>
  <url><loc>https://mysite.com.au/events/yoga</loc></url>
  <url><loc>https://mysite.com.au/events/morning-yoga</loc></url>
  <url><loc>https://mysite.com.au/events/12345</loc></url>
</urlset>`;
  const { urls } = parseSitemap(xml);
  assert.deepEqual(
    eventUrlsFromSitemap(urls, 'https://mysite.com.au').map((u) => new URL(u).pathname),
    ['/events/12345', '/events/morning-yoga', '/events/yoga'],
  );
});

Deno.test('parses a sitemap index into its child sitemaps', () => {
  const xml = `<sitemapindex>
  <sitemap><loc>https://mysite.com.au/sitemaps/posts.xml</loc></sitemap>
  <sitemap><loc>https://mysite.com.au/sitemaps/events-1.xml</loc></sitemap>
</sitemapindex>`;
  const { urls, isIndex } = parseSitemap(xml);
  assert.equal(isIndex, true);
  assert.deepEqual(urls, [
    'https://mysite.com.au/sitemaps/posts.xml',
    'https://mysite.com.au/sitemaps/events-1.xml',
  ]);
});

Deno.test('reaches event sitemaps even when the index lists other maps first', () => {
  const urls = [
    'https://mysite.com.au/page-sitemap.xml',
    'https://mysite.com.au/tenant-sitemap.xml',
    'https://mysite.com.au/product-sitemap.xml',
    'https://mysite.com.au/event-sitemap.xml',
    'https://mysite.com.au/news-sitemap.xml',
  ];
  // With a budget of four sitemaps, "event" has to come first to be reachable.
  assert.deepEqual(orderSitemapsByLikelihood(urls).slice(0, 3), [
    'https://mysite.com.au/event-sitemap.xml',
    'https://mysite.com.au/page-sitemap.xml',
    'https://mysite.com.au/tenant-sitemap.xml',
  ]);
});

Deno.test('unescapes entities inside sitemap URLs', () => {
  const xml = `<urlset><url><loc>https://mysite.com.au/events/dawn&amp;dusk-retreat</loc></url></urlset>`;
  const { urls } = parseSitemap(xml);
  assert.deepEqual(urls, ['https://mysite.com.au/events/dawn&dusk-retreat']);
});

// Relevance scoring. The on-topic names are real events kept from a Melbourne
// ticketing-platform import that produced 97 off-topic rows out of 114; the
// off-topic ones are what that same import also produced.
Deno.test('keeps the real soul-conscious events from a noisy source', () => {
  const kept = [
    'Cosmic Mass: A Collective Vocal Experience',
    'MYTHIC MOVEMENT',
    'Sunday Soul Dance Creswick',
    'Movement and Meditation Session',
    'Curative Eurythmy Weekly Classes at MTS',
    'Calmer Community Monthly Yoga Flow',
    'The Joy Spiral: A Transformational Circle for Big-Hearted Women Who Care',
    'MECCAVERSITY: Power Pilates with KICSTUDIO',
    'Meditation Hour 2026',
    'Wellbeing Toolkit for Exam Success',
  ];
  for (const name of kept) {
    assert.equal(scoreRelevance(name), 'on-topic', `expected on-topic: ${name}`);
  }
});

Deno.test('flags the noise a city-wide listing is mostly made of', () => {
  const junk = [
    'Battle of the Bands - Heats',
    'Open Mic Comedy @ Newcastle Comedy Club',
    'Wildlife Photographer of the Year',
    'Exhibition tickets | Archibald Prize 2026',
    'M/FW 26: CULT STATUS RUNWAY - 6.30pm',
    '21st International Celiac Disease Symposium 2026- Patient Session',
    'Diabetes Expo 2026',
    'RIGGED: A Murder Mystery',
  ];
  for (const name of junk) {
    assert.equal(scoreRelevance(name), 'off-topic', `expected off-topic: ${name}`);
  }
});

Deno.test('reports unsure rather than guessing', () => {
  // No signal either way: the honest verdict, and the one that stays visible.
  assert.equal(scoreRelevance('Winter Solstice Potluck'), 'unsure');
  assert.equal(scoreRelevance(''), 'unsure');
  assert.equal(scoreRelevance(null, undefined), 'unsure');
});

Deno.test('unsure covers titles that simply give nothing away', () => {
  // Three events a human kept from that import. Nothing in the title says
  // whether they belong here, so guessing either way would be a lie.
  assert.equal(scoreRelevance('RELICS: A New World Rises - October'), 'unsure');
  assert.equal(scoreRelevance('VIVE BIEN - MELBOURNE'), 'unsure');
  assert.equal(scoreRelevance('The BIG Event: Health through a DIFFERENT lens'), 'unsure');
});

Deno.test('intention language rescues a community-framed listing', () => {
  // A real Humanitix listing whose only format words are "party" and "DJ", but
  // whose description is framed entirely around meaning and community. The
  // intention terms are checked first, so this stays visible in the inbox.
  const blurb = [
    'building our community based on the meaningful, the magical and everything inbetween',
    'we are having a freeeee party to celebrate!',
    'a welcome drink (nonalcoholic), snacks, a panel talk and a DJ playing',
  ].join(' ');
  assert.equal(scoreRelevance('Wildly Human Podcast Launch Party', blurb), 'on-topic');
});

Deno.test('an on-topic signal wins when an event looks like both', () => {
  // A sound bath inside a festival is still a sound bath.
  assert.equal(scoreRelevance('Sunrise Sound Bath at Earth Frequency Festival'), 'on-topic');
});

Deno.test('relevance reads the description, not just the title', () => {
  assert.equal(scoreRelevance('Community evening', 'A guided breathwork session with gongs.'), 'on-topic');
  assert.equal(scoreRelevance('Main Stage', 'Three live bands performing. A DJ set closes the night.'), 'off-topic');
});

Deno.test('imported events carry a relevance verdict', () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Evening Sound Bath',
    startDate: '2026-10-20T19:00:00+10:00',
    location: { '@type': 'Place', address: { addressLocality: 'Fitzroy', addressRegion: 'VIC', addressCountry: 'AU' } },
  })}</script>`;
  const { events } = eventsFromHtml(html, 'https://example.org/events', OPTS);
  assert.equal(events.length, 1);
  assert.equal(events[0].import_relevance, 'on-topic');
});
