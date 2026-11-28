/**
 * Server-side page metadata for link previews.
 *
 * SoulFlow is a single-page app: WhatsApp, Instagram, Messenger, iMessage,
 * Slack and most crawlers do not run JavaScript, so every shared URL used to
 * preview as the generic homepage card. `api/page-meta.ts` (a Vercel
 * function) uses these helpers to write the real title, description, image
 * and Event JSON-LD into index.html before it is served.
 *
 * Keep this file free of imports (no '@/' alias, no date-fns): it is bundled
 * into the Vercel function as well as the app and its tests.
 */

export const SITE_URL = 'https://soulflowau.vercel.app';
export const DEFAULT_IMAGE = `${SITE_URL}/social-preview.jpeg`;

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  type: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
}

/** The subset of an `events` row the previews need. */
export interface ShareableEvent {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string | null;
  event_time?: string | null;
  place_name?: string | null;
  full_address?: string | null;
  geographical_state?: string | null;
  description?: string | null;
  price?: string | null;
  image_url?: string | null;
  ticket_link?: string | null;
  organizer_contact?: string | null;
}

export interface ShareableCity {
  slug: string;
  name: string;
  seoDescription: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Recurring instance ids look like `{uuid}-{yyyyMMdd}`; return the uuid, or null if invalid. */
export const baseEventIdFromPath = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const base = raw.split('-').slice(0, 5).join('-');
  return UUID_RE.test(base) ? base.toLowerCase() : null;
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

const truncate = (text: string, max: number) => {
  const clean = collapse(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2027-02-06" → "Sat 6 Feb 2027". Date-only, so no time-zone drift. */
export const formatEventDate = (isoDate: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** First dollar amount in a price string, for schema.org offers ("$54.26–$255.43" → "54.26"). */
export const lowestPrice = (price?: string | null): string | null => {
  if (!price) return null;
  if (/free|donation|by donation|koha/i.test(price)) return '0';
  const m = price.replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/);
  return m ? m[0] : null;
};

export const buildEventJsonLd = (event: ShareableEvent, url: string): Record<string, unknown> => {
  const price = lowestPrice(event.price);
  const startDate = event.event_date.slice(0, 10);
  const endDate = event.end_date ? event.end_date.slice(0, 10) : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.event_name,
    description: event.description ? truncate(event.description, 500) : undefined,
    startDate,
    endDate: endDate && endDate !== startDate ? endDate : undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    image: event.image_url ? [event.image_url] : undefined,
    location: {
      '@type': 'Place',
      name: event.place_name || event.full_address || undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.full_address || undefined,
        addressRegion: event.geographical_state || undefined,
        addressCountry: 'AU',
      },
    },
    organizer: event.organizer_contact ? { '@type': 'Organization', name: event.organizer_contact } : undefined,
    offers: price != null
      ? {
          '@type': 'Offer',
          url: event.ticket_link || url,
          price,
          priceCurrency: 'AUD',
          availability: 'https://schema.org/InStock',
        }
      : undefined,
  };
};

export const buildEventMeta = (event: ShareableEvent): PageMeta => {
  const url = `${SITE_URL}/events/${event.id}`;
  const when = [formatEventDate(event.event_date), event.event_time?.trim()].filter(Boolean).join(' · ');
  const where = [event.place_name?.trim(), event.geographical_state?.trim()].filter(Boolean).join(', ');
  const lead = [when, where].filter(Boolean).join(' — ');
  const blurb = event.description ? truncate(event.description, 200 - lead.length) : '';
  const description = blurb ? `${lead}. ${blurb}` : `${lead}. Details and booking on SoulFlow.`;
  return {
    title: `${collapse(event.event_name)} | SoulFlow`,
    description,
    url,
    image: event.image_url && /^https:\/\//i.test(event.image_url) ? event.image_url : DEFAULT_IMAGE,
    type: 'article',
    jsonLd: buildEventJsonLd(event, url),
  };
};

export const buildCityMeta = (city: ShareableCity): PageMeta => ({
  title: `Conscious events in ${city.name} | SoulFlow`,
  description: city.seoDescription,
  url: `${SITE_URL}/${city.slug}`,
  image: DEFAULT_IMAGE,
  type: 'website',
});

/** Replace the attribute value of the first tag matching `tagPattern`. */
const setTag = (html: string, tagPattern: RegExp, value: string) =>
  html.replace(tagPattern, (tag) => tag.replace(/(content|href)="[^"]*"/, `$1="${escapeHtml(value)}"`));

const metaProp = (prop: string) => new RegExp(`<meta[^>]+property="${prop}"[^>]*>`);
const metaName = (name: string) => new RegExp(`<meta[^>]+name="${name}"[^>]*>`);

/** Write `meta` into the index.html shell. Tags missing from the shell are left alone. */
export const injectPageMeta = (html: string, meta: PageMeta): string => {
  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  out = setTag(out, metaName('description'), meta.description);
  out = setTag(out, /<link[^>]+rel="canonical"[^>]*>/, meta.url);
  out = setTag(out, metaProp('og:title'), meta.title);
  out = setTag(out, metaProp('og:description'), meta.description);
  out = setTag(out, metaProp('og:url'), meta.url);
  out = setTag(out, metaProp('og:type'), meta.type);
  out = setTag(out, metaProp('og:image'), meta.image);
  out = setTag(out, metaName('twitter:title'), meta.title);
  out = setTag(out, metaName('twitter:description'), meta.description);
  out = setTag(out, metaName('twitter:image'), meta.image);
  if (meta.image !== DEFAULT_IMAGE) {
    // The shell's 1200×630 dimensions describe the default image only.
    out = out.replace(/\s*<meta[^>]+property="og:image:(width|height)"[^>]*>/g, '');
  }
  if (meta.jsonLd) {
    // Escape "<" so a description containing "</script>" cannot end the block.
    const json = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c');
    out = out.replace('</head>', `    <script type="application/ld+json" data-page-meta>${json}</script>\n  </head>`);
  }
  return out;
};
