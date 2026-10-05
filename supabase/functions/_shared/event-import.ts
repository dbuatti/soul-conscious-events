// Pure parsing helpers for the event importer. No network or database access
// lives here so it can be unit-tested (see event-import.test.ts).

export interface ImportedEvent {
  event_name: string;
  event_date: string; // yyyy-MM-dd
  end_date: string | null;
  event_time: string | null;
  place_name: string | null;
  full_address: string | null;
  description: string | null;
  ticket_link: string | null;
  price: string | null;
  organizer_contact: string | null;
  event_type: string;
  geographical_state: string | null;
  image_url: string | null;
  recurring_pattern: 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | null;
  recurring_end_date: string | null;
  external_id: string;
}

// Used when a timestamp is in UTC and the source gives no zone of its own.
export const DEFAULT_TIME_ZONE = 'Australia/Sydney';

type JsonObject = Record<string, unknown>;

const isObject = (v: unknown): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v);
const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const str = (v: unknown): string | null => {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  return null;
};

// ---------------------------------------------------------------------------
// Text helpers

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', middot: '·', bull: '•',
};

export const decodeEntities = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? m;
  });

export const htmlToText = (html: string): string =>
  decodeEntities(
    html
      .replace(/<(br|\/p|\/div|\/li|\/h\d)\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const clip = (s: string | null, max: number): string | null =>
  s && s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

// ---------------------------------------------------------------------------
// URLs

/** Lower-cased host, no query/hash/trailing slash. Used to spot duplicates. */
export const normalizeUrl = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}`;
  } catch {
    return null;
  }
};

/** Blocks loopback, link-local and private-network targets. */
export const isPublicHttpUrl = (raw: string): boolean => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  return true;
};

const platformName = (url: string | null): string | null => {
  if (!url) return null;
  const host = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
  if (host.includes('humanitix')) return 'Humanitix';
  if (host.includes('eventbrite')) return 'Eventbrite';
  if (host.includes('megatix')) return 'Megatix';
  if (host.includes('trybooking')) return 'TryBooking';
  return null;
};

// Event detail URL shapes on the ticketing platforms we follow.
const TICKETING_EVENT_PATTERNS: RegExp[] = [
  /^https?:\/\/events\.humanitix\.com\/(?!host\b|hosts\b|search\b)[^/?#]+\/?$/i,
  /^https?:\/\/(www\.)?humanitix\.com\/[a-z]{2}\/events\/[^/?#]+\/?$/i,
  /^https?:\/\/(www\.)?eventbrite\.[a-z.]+\/e\/[^/?#]+\/?$/i,
  /^https?:\/\/(www\.)?megatix\.com\.au\/events\/[^/?#]+\/?$/i,
  /^https?:\/\/(www\.)?trybooking\.com\/(?:[A-Z0-9]{4,8}|events\/\d+[^?#]*)\/?$/,
  /^https?:\/\/book\.trybooking\.com\/event\/\d+/i,
];

/**
 * Path segments that list or navigate rather than describe one event. Matched
 * against a whole segment, so hyphenated variants ("past-events") are covered by
 * including them.
 */
const NON_EVENT_SEGMENT_RE = new RegExp(
  '^(?:categor(?:y|ies)|tags?|lists?|months?|weeks?|days?|today|thisweek(?:end)?|nextweek|'
  + 'nextmonth|trending|free|search|browse|pages?|feeds?|ical|photos?|maps?|venues?|hosts?|'
  + 'organisers?|organizers?|past-?events|archive|login|signin|signup|register|account|cart|'
  + 'checkout|donate|newsletter|contact|about|privacy|terms|faq|news|blog|shop|store|jobs|'
  + 'careers|sponsor|sponsors|partners|online|offline|all|upcoming|past|featured|popular|'
  + 'nearby|near|directory|home|index|start|view|more|tomorrow|yesterday|this-?month)$',
  'i',
);

/**
 * An events-ish section anywhere in the path. Written as tolerant patterns
 * rather than an exact segment list so unfamiliar sites match: /whats-on,
 * /whatson, /programs, /programme all count.
 */
const EVENT_TOKEN_RE = new RegExp(
  '(?:^|[\\/\\-_.\\s])(?:events?|what\'?s?[\\s-]?on|programs?(?:me|mes)?|calendars?|classes?|'
  + 'sessions?|workshops?|retreats?|courses?|meet[\\s-]?ups?|schedules?|happenings?|diary|'
  + 'festivals?|yoga|meditat\\w*|sound-?heal\\w*)(?:[\\/.\\s-]|$)',
  'i',
);

/**
 * Site-agnostic test for "this URL probably describes one event": an
 * event-ish section with a slug hanging directly off it. Purely structural, so
 * sites we've never seen still match.
 *
 * The slug must be the section's *immediate* child. Checking the whole prefix
 * instead would accept faceted browse pages like
 * /au/events/au--melbourne--3000/foodanddrink, where a location slug sits
 * between the section and the facet and hides it from a word match.
 */
export const looksLikeEventPath = (pathname: string): boolean => {
  const segments = pathname.toLowerCase().split('/').filter(Boolean);
  // Needs at least a section and a slug; "/events" alone is a listing page.
  if (segments.length < 2) return false;
  if (NON_EVENT_SEGMENT_RE.test(segments[segments.length - 1])) return false;
  // The parent must be the events-ish section itself.
  if (!EVENT_TOKEN_RE.test(segments[segments.length - 2])) return false;
  return true;
};

/**
 * Finds links on a listing/organiser page that look like individual event
 * pages: known ticketing shapes, or same-site paths under an events section.
 * Off-site links only count for platforms we recognise, to avoid wandering
 * into unrelated corners of the web.
 */
export const findEventLinks = (html: string, pageUrl: string): string[] => {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  };
  const found = new Map<string, string>();
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["']/gi)) {
    let abs: URL;
    try {
      abs = new URL(decodeEntities(match[1]), base);
    } catch {
      continue;
    }
    abs.hash = '';
    // Tracking params make the same event look like different URLs.
    for (const key of [...abs.searchParams.keys()]) {
      if (/^(utm_|aff|ref|fbclid|gclid|_gl)/i.test(key)) abs.searchParams.delete(key);
    }
    const href = abs.toString();
    // Known platforms win outright: their URL shapes aren't always structural
    // (Eventbrite uses /e/<slug>, which no section keyword would catch).
    const isTicketing = TICKETING_EVENT_PATTERNS.some((re) => re.test(href));
    if (!isTicketing) {
      if (abs.hostname !== base.hostname) continue;
      if (!looksLikeEventPath(abs.pathname)) continue;
      // A link back to the listing we came from isn't an event.
      if (abs.pathname.replace(/\/+$/, '') === base.pathname.replace(/\/+$/, '')) continue;
    }
    const key = normalizeUrl(href);
    if (key && !found.has(key)) found.set(key, href);
  }
  return [...found.values()];
};

/**
 * Same as normalizeUrl but keeps the query. Pagination lives entirely in the
 * query string, so ?page=2 and ?page=3 are different pages and must not
 * collapse onto one key.
 */
const paginatedKey = (raw: string): string | null => {
  try {
    const u = new URL(raw);
    const pairs = [...u.searchParams.entries()]
      .filter(([k]) => !/^(utm_|aff|ref|fbclid|gclid|_gl)/i.test(k))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${pairs.length ? `?${pairs.join('&')}` : ''}`;
  } catch {
    return null;
  }
};

/**
 * The same site's other listing pages, so we can walk past page one: rel="next"
 * plus common "2 / next / older" link labels and ?page=2 style targets.
 */
export const findPaginationLinks = (html: string, pageUrl: string): string[] => {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  };
  const out = new Set<string>();
  const seen = new Set<string>([paginatedKey(pageUrl) ?? pageUrl]);
  for (const match of html.matchAll(/<a\b([^>]*)>([^<]{0,24})</gi)) {
    const attrs = match[1];
    const label = match[2].toLowerCase().replace(/\s+/g, ' ').trim();
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const isNext = /\brel\s*=\s*["'][^"']*\bnext\b/i.test(attrs);
    const looksPaged = /^(next|next page|older|more|show more|load more|2|>>|›|»|>|\+)$/i.test(label)
      || /[?&](page|paged|p|pg|offset|start)=2\b/i.test(href);
    if (!isNext && !looksPaged) continue;
    try {
      const abs = new URL(decodeEntities(href), base);
      abs.hash = '';
      for (const key of [...abs.searchParams.keys()]) {
        if (/^(utm_|aff|ref|fbclid|gclid|_gl)/i.test(key)) abs.searchParams.delete(key);
      }
      if (abs.hostname !== base.hostname) continue;
      const key = paginatedKey(abs.toString());
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.add(abs.toString());
    } catch { /* not a usable URL */ }
  }
  return [...out];
};

// ---------------------------------------------------------------------------
// Sitemaps
// ---------------------------------------------------------------------------

/** Sitemap URLs advertised in robots.txt ("Sitemap:" lines). */
export const sitemapsFromRobots = (robotsTxt: string): string[] => {
  const out = new Set<string>();
  for (const line of robotsTxt.split(/\r?\n/)) {
    const m = line.replace(/#.*/, '').match(/^\s*sitemap\s*:\s*(\S+)/i);
    if (m && /^https?:\/\//i.test(m[1])) out.add(m[1]);
  }
  return [...out];
};

const xmlUnescape = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

/**
 * Parses a sitemap or sitemap index. For an index the returned URLs are further
 * sitemap files rather than pages.
 */
export const parseSitemap = (xml: string): { urls: string[]; isIndex: boolean } => {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const urls: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)) {
    const loc = xmlUnescape(m[1]).trim();
    if (/^https?:\/\//i.test(loc)) urls.push(loc);
  }
  return isIndex
    ? { urls: urls.filter((l) => /\.xml(\?|$)/i.test(l)), isIndex: true }
    : { urls, isIndex: false };
};

/**
 * Orders a sitemap index's children so the ones most likely to hold event pages
 * are fetched first. A crawl budget spent on products.xml and category maps
 * before events.xml would find nothing, and index order is the site's choice
 * rather than a signal about content.
 */
export const orderSitemapsByLikelihood = (urls: string[]): string[] => {
  const score = (raw: string): number => {
    let name = raw;
    try {
      const p = new URL(raw).pathname;
      name = p.split('/').filter(Boolean).pop() ?? p;
    } catch { /* keep the raw string */ }
    name = decodeURIComponent(name).toLowerCase();
    if (/event|whats-?on|programme|program|calendar|class|workshop|retreat|session/.test(name)) return 0;
    if (/news|blog|post|article|product|shop|store|page|tag|categor|tenant|space|capacity|brand/.test(name)) return 2;
    return 1;
  };
  return urls
    .map((url, order) => ({ url, order, s: score(url) }))
    .sort((a, b) => a.s - b.s || a.order - b.order)
    .map((x) => x.url);
};

/**
 * How event-like a URL's final slug is. Real event pages carry an id or a
 * hyphenated title ("/events/12345", "/events/morning-yoga"); browse pages that
 * survive the filter above tend to be single plain words. Used to spend a
 * capped page budget on the likeliest events first.
 */
const slugSpecificity = (pathname: string): number => {
  const slug = pathname.split('/').filter(Boolean).pop() ?? '';
  const decoded = (() => { try { return decodeURIComponent(slug); } catch { return slug; } })();
  if (/\d/.test(decoded)) return 3;
  if (decoded.includes('-')) return 2;
  return 1;
};

/**
 * Same-host URLs from a sitemap that sit under an event-ish path, most
 * event-like first.
 */
export const eventUrlsFromSitemap = (urls: string[], siteUrl: string): string[] => {
  let host: string;
  try {
    host = new URL(siteUrl).hostname.replace(/^www\./, '');
  } catch {
    return [];
  }
  const scored: { url: string; score: number; order: number }[] = [];
  const seen = new Set<string>();
  urls.forEach((raw, order) => {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      return;
    }
    if (u.hostname.replace(/^www\./, '') !== host) return;
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|aff|ref|fbclid|gclid|_gl)/i.test(key)) u.searchParams.delete(key);
    }
    if (!looksLikeEventPath(u.pathname)) return;
    const key = `${u.pathname}${u.search}`;
    if (seen.has(key)) return;
    seen.add(key);
    scored.push({ url: u.toString(), score: slugSpecificity(u.pathname), order });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((s) => s.url);
};

// ---------------------------------------------------------------------------
// Dates & times

const pad = (n: number) => String(n).padStart(2, '0');

interface LocalParts { date: string; time: string | null }

/** Wall-clock parts of a timestamp in the given time zone. */
const partsInZone = (d: Date, timeZone: string): LocalParts => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = p.hour === '24' ? '00' : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
};

/**
 * Splits an ISO-8601 string into local date and HH:mm. Offsets like +11:00
 * already express local time, so their digits are used as-is; 'Z' timestamps
 * are converted into `timeZone`.
 */
export const isoToLocalParts = (iso: string | null | undefined, timeZone = DEFAULT_TIME_ZONE): LocalParts | null => {
  if (!iso) return null;
  const m = iso.trim().match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/i);
  if (!m) return null;
  const [, date, hh, mm, zone] = m;
  if (!hh) return { date, time: null };
  if (zone && zone.toUpperCase() === 'Z') {
    return partsInZone(new Date(`${date}T${hh}:${mm}:00Z`), timeZone);
  }
  return { date, time: `${hh}:${mm}` };
};

export const formatClock = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)}${suffix}`;
};

const formatTimeRange = (start: LocalParts, end: LocalParts | null): string | null => {
  if (!start.time) return null;
  // All-day-ish timestamps (exactly midnight with no end time) carry no real time.
  if (start.time === '00:00' && (!end || !end.time || end.time === '00:00')) return null;
  const startLabel = formatClock(start.time);
  if (end?.time && end.date === start.date && end.time !== start.time) {
    return `${startLabel} – ${formatClock(end.time)}`;
  }
  return startLabel;
};

// ---------------------------------------------------------------------------
// Location

const STATE_NAMES: Record<string, string> = {
  'new south wales': 'NSW', victoria: 'VIC', queensland: 'QLD', 'south australia': 'SA',
  'western australia': 'WA', tasmania: 'TAS', 'northern territory': 'NT', 'australian capital territory': 'ACT',
};

const stateFromPostcode = (pc: number): string | null => {
  if ((pc >= 200 && pc <= 299) || (pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920)) return 'ACT';
  if (pc >= 800 && pc <= 999) return 'NT';
  if (pc >= 1000 && pc <= 2999) return 'NSW';
  if (pc >= 3000 && pc <= 3999) return 'VIC';
  if (pc >= 4000 && pc <= 4999) return 'QLD';
  if (pc >= 5000 && pc <= 5999) return 'SA';
  if (pc >= 6000 && pc <= 6999) return 'WA';
  if (pc >= 7000 && pc <= 7999) return 'TAS';
  return null;
};

/** Best-effort Australian state from a region name, abbreviation or address. */
export const detectState = (...candidates: (string | null | undefined)[]): string | null => {
  const text = candidates.filter(Boolean).join(', ');
  if (!text) return null;
  const abbrev = text.match(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/i);
  if (abbrev) return abbrev[1].toUpperCase();
  const lower = text.toLowerCase();
  // Longest names first so "south australia" wins over "australia"-like overlaps.
  for (const name of Object.keys(STATE_NAMES).sort((a, b) => b.length - a.length)) {
    if (lower.includes(name)) return STATE_NAMES[name];
  }
  const postcode = text.match(/\b(\d{4})\b(?!.*\b\d{4}\b)/);
  return postcode ? stateFromPostcode(Number(postcode[1])) : null;
};

const NON_AU_COUNTRY = /^(?!au$|aus$|australia$).+/i;

interface Place { name: string | null; address: string | null; region: string | null; country: string | null; online: boolean }

const parseLocation = (loc: unknown): Place => {
  const empty: Place = { name: null, address: null, region: null, country: null, online: false };
  for (const item of asArray(loc as unknown)) {
    if (typeof item === 'string') return { ...empty, address: item };
    if (!isObject(item)) continue;
    const type = asArray(item['@type'] as string | string[]).join(' ');
    if (/VirtualLocation/i.test(type)) return { ...empty, name: 'Online', online: true };
    const addr = item.address;
    if (typeof addr === 'string') return { ...empty, name: str(item.name), address: addr };
    if (isObject(addr)) {
      const parts = [addr.streetAddress, addr.addressLocality, [addr.addressRegion, addr.postalCode].filter(Boolean).join(' '), addr.addressCountry]
        .map((p) => (isObject(p) ? str(p.name) : str(p)))
        .filter(Boolean) as string[];
      const country = isObject(addr.addressCountry) ? str(addr.addressCountry.name) : str(addr.addressCountry);
      return {
        name: str(item.name),
        address: parts.join(', ') || null,
        region: str(addr.addressRegion),
        country,
        online: false,
      };
    }
    return { ...empty, name: str(item.name) };
  }
  return empty;
};

// ---------------------------------------------------------------------------
// Price

const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

export const priceFromOffers = (offers: unknown): string | null => {
  const prices: number[] = [];
  let sawFree = false;
  for (const offer of asArray(offers as unknown)) {
    if (!isObject(offer)) continue;
    for (const key of ['price', 'lowPrice', 'highPrice']) {
      const raw = offer[key];
      const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw.replace(/[^0-9.]/g, '')) : NaN;
      if (Number.isFinite(n)) {
        if (n === 0) sawFree = true;
        else prices.push(n);
      }
    }
    if (isObject(offer.priceSpecification)) {
      const n = parseFloat(String(offer.priceSpecification.price ?? ''));
      if (Number.isFinite(n)) {
        if (n === 0) sawFree = true;
        else prices.push(n);
      }
    }
  }
  if (prices.length === 0) return sawFree ? 'Free' : null;
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`;
};

const offerUrl = (offers: unknown): string | null => {
  for (const offer of asArray(offers as unknown)) {
    if (isObject(offer) && str(offer.url)) return str(offer.url);
  }
  return null;
};

// ---------------------------------------------------------------------------
// Categories (must match src/lib/constants.ts eventTypes)

const CATEGORY_RULES: [string, RegExp][] = [
  ['Sound Bath', /sound\s*(bath|healing|journey|meditation)|gong|singing bowls?|crystal bowls?|soundscape|vibrational/i],
  ['Open Mic', /open\s*mic|open\s*stage|spoken\s*word|poetry\s*slam/i],
  ['Foraging', /foraging|wild\s*food|bush\s*tucker|mushroom\s*walk|wild\s*plants|bushcraft/i],
  ['Meditation', /meditat|mindful|breath\s*work|breathwork|pranayama|yoga\s*nidra|vipassana|stillness|cacao/i],
  ['Music', /live\s*music|concert|\bgig\b|\bband\b|\bdj\b|orchestra|choir|kirtan|ecstatic\s*dance|acoustic|jazz|folk/i],
  ['Workshop', /workshop|masterclass|\bclass\b|course|training|intensive|seminar|lecture|tutorial|certification/i],
  ['Community Gathering', /retreat|festival|ceremony|\bcircle\b|market|gathering|community|meet\s*up|meetup|celebration|fundraiser|satsang|ritual/i],
];

export const classifyEventType = (...texts: (string | null | undefined)[]): string => {
  const text = texts.filter(Boolean).join(' \n ');
  for (const [category, re] of CATEGORY_RULES) {
    if (re.test(text)) return category;
  }
  return 'Other';
};

// ---------------------------------------------------------------------------
// JSON-LD

/** All JSON-LD objects on a page, flattened through arrays, @graph and ItemList. */
export const extractJsonLdNodes = (html: string): JsonObject[] => {
  const out: JsonObject[] = [];
  const visit = (v: unknown, depth: number) => {
    if (depth > 6) return;
    if (Array.isArray(v)) return v.forEach((x) => visit(x, depth + 1));
    if (!isObject(v)) return;
    out.push(v);
    if (Array.isArray(v['@graph'])) visit(v['@graph'], depth + 1);
    if (v.itemListElement) {
      for (const li of asArray(v.itemListElement as unknown)) {
        if (isObject(li) && li.item) visit(li.item, depth + 1);
        else visit(li, depth + 1);
      }
    }
    if (v.subEvent) visit(v.subEvent, depth + 1);
  };
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    try {
      visit(JSON.parse(raw), 0);
    } catch {
      // Some sites emit invalid JSON (trailing commas, raw newlines); try a light repair.
      try {
        // eslint-disable-next-line no-control-regex -- stripping raw control characters is the point
        visit(JSON.parse(raw.replace(/,\s*([}\]])/g, '$1').replace(/[\u0000-\u001f]+/g, ' ')), 0);
      } catch { /* give up on this block */ }
    }
  }
  return out;
};

const isEventNode = (n: JsonObject): boolean => {
  const types = asArray(n['@type'] as string | string[]).map(String);
  return types.some((t) => /Event$/.test(t) && t !== 'EventSeries') && !!str(n.name) && !!str(n.startDate);
};

/** Other URLs worth visiting that a listing page exposes via JSON-LD ItemLists. */
export const jsonLdListUrls = (nodes: JsonObject[], pageUrl: string): string[] => {
  const urls: string[] = [];
  for (const n of nodes) {
    if (isEventNode(n)) continue;
    const types = asArray(n['@type'] as string | string[]).map(String);
    if (types.includes('ListItem') && str(n.url)) {
      try { urls.push(new URL(str(n.url)!, pageUrl).toString()); } catch { /* skip */ }
    }
  }
  return urls;
};

const pickImage = (image: unknown): string | null => {
  for (const img of asArray(image as unknown)) {
    if (typeof img === 'string' && /^https?:\/\//i.test(img)) return img;
    if (isObject(img) && str(img.url)) return str(img.url);
  }
  return null;
};

const organizerName = (org: unknown): string | null => {
  for (const o of asArray(org as unknown)) {
    if (typeof o === 'string') return o.trim() || null;
    if (isObject(o) && str(o.name)) return str(o.name);
  }
  return null;
};

export interface MapOptions {
  today: string; // yyyy-MM-dd, events before this are skipped
  maxDate?: string; // events after this are skipped
  timeZone?: string;
}

export type SkipReason = 'past' | 'too-far' | 'not-australian' | 'invalid';

export const jsonLdToEvent = (
  node: JsonObject,
  pageUrl: string,
  opts: MapOptions,
): ImportedEvent | SkipReason => {
  if (!isEventNode(node)) return 'invalid';
  const tz = opts.timeZone ?? DEFAULT_TIME_ZONE;
  const start = isoToLocalParts(str(node.startDate), tz);
  if (!start) return 'invalid';
  const end = isoToLocalParts(str(node.endDate), tz);

  const lastDay = end?.date && end.date > start.date ? end.date : start.date;
  if (lastDay < opts.today) return 'past';
  if (opts.maxDate && start.date > opts.maxDate) return 'too-far';

  const place = parseLocation(node.location);
  if (place.country && NON_AU_COUNTRY.test(place.country.trim())) return 'not-australian';

  const name = decodeEntities(str(node.name)!);
  const description = clip(htmlToText(str(node.description) ?? ''), 4000) || null;
  const eventUrl = str(node.url);
  const ticketLink = offerUrl(node.offers) || (eventUrl ? new URL(eventUrl, pageUrl).toString() : pageUrl);
  const organizer = organizerName(node.organizer);
  const platform = platformName(ticketLink) || platformName(pageUrl);

  return {
    event_name: clip(name, 200)!,
    event_date: start.date,
    end_date: end?.date && end.date > start.date ? end.date : null,
    event_time: formatTimeRange(start, end),
    place_name: place.name ? decodeEntities(place.name) : null,
    full_address: place.address ? decodeEntities(place.address) : null,
    description,
    ticket_link: ticketLink,
    price: priceFromOffers(node.offers),
    organizer_contact: organizer ? (platform ? `${organizer} (via ${platform})` : organizer) : null,
    event_type: classifyEventType(name, asArray(node['@type'] as string | string[]).join(' '), description),
    geographical_state: place.online ? null : detectState(place.region, place.address),
    image_url: pickImage(node.image),
    recurring_pattern: null,
    recurring_end_date: null,
    external_id: normalizeUrl(ticketLink) ?? `${name}|${start.date}`,
  };
};

/** Every importable event described on a page via JSON-LD. */
export const eventsFromHtml = (html: string, pageUrl: string, opts: MapOptions) => {
  const events: ImportedEvent[] = [];
  const skipped: Partial<Record<SkipReason, number>> = {};
  for (const node of extractJsonLdNodes(html)) {
    if (!isEventNode(node)) continue;
    const result = jsonLdToEvent(node, pageUrl, opts);
    if (typeof result === 'string') skipped[result] = (skipped[result] ?? 0) + 1;
    else events.push(result);
  }
  return { events, skipped };
};

// ---------------------------------------------------------------------------
// iCalendar (.ics)

interface IcsProp { name: string; params: Record<string, string>; value: string }
export interface IcsEvent { props: IcsProp[]; get(name: string): IcsProp | undefined }

const unescapeIcs = (v: string) =>
  v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

export const parseIcs = (text: string): { events: IcsEvent[]; calendarTimeZone: string | null } => {
  // Unfold continuation lines (RFC 5545 §3.1).
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events: IcsEvent[] = [];
  let current: IcsProp[] | null = null;
  let calendarTimeZone: string | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [rawName, ...rawParams] = head.split(';');
    const name = rawName.toUpperCase();
    if (name === 'BEGIN' && value.toUpperCase() === 'VEVENT') { current = []; continue; }
    if (name === 'END' && value.toUpperCase() === 'VEVENT') {
      if (current) {
        const props = current;
        events.push({ props, get: (n) => props.find((p) => p.name === n) });
      }
      current = null;
      continue;
    }
    if (!current) {
      if (name === 'X-WR-TIMEZONE') calendarTimeZone = value.trim();
      continue;
    }
    const params: Record<string, string> = {};
    for (const p of rawParams) {
      const [k, ...rest] = p.split('=');
      params[k.toUpperCase()] = rest.join('=').replace(/^"|"$/g, '');
    }
    current.push({ name, params, value });
  }
  return { events, calendarTimeZone };
};

const isValidZone = (tz: string) => {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
};

const icsDateToParts = (prop: IcsProp | undefined, fallbackZone: string): LocalParts | null => {
  if (!prop) return null;
  const v = prop.value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/i);
  if (!m) return null;
  const [, y, mo, d, hh, mm, , z] = m;
  const date = `${y}-${mo}-${d}`;
  if (!hh || prop.params.VALUE === 'DATE') return { date, time: null };
  if (z) return partsInZone(new Date(`${date}T${hh}:${mm}:00Z`), fallbackZone);
  // TZID or floating time: the digits are already local wall-clock time.
  return { date, time: `${hh}:${mm}` };
};

const isoToUtcDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const addDaysIso = (iso: string, days: number) => {
  const d = isoToUtcDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((isoToUtcDate(b).getTime() - isoToUtcDate(a).getTime()) / 86_400_000);

/** First date in the series starting at `start` that is on or after `today`. */
export const nextOccurrenceOnOrAfter = (
  start: string,
  pattern: NonNullable<ImportedEvent['recurring_pattern']>,
  today: string,
): string => {
  if (start >= today) return start;
  if (pattern === 'MONTHLY') {
    const s = isoToUtcDate(start);
    const t = isoToUtcDate(today);
    let months = (t.getUTCFullYear() - s.getUTCFullYear()) * 12 + (t.getUTCMonth() - s.getUTCMonth());
    for (;; months++) {
      const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + months, 1));
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(s.getUTCDate(), lastDay));
      const iso = d.toISOString().slice(0, 10);
      if (iso >= today) return iso;
    }
  }
  const step = pattern === 'DAILY' ? 1 : pattern === 'WEEKLY' ? 7 : 14;
  const elapsed = daysBetween(start, today);
  return addDaysIso(start, Math.ceil(elapsed / step) * step);
};

const RRULE_PATTERNS: Record<string, ImportedEvent['recurring_pattern']> = {
  DAILY: 'DAILY', WEEKLY: 'WEEKLY', MONTHLY: 'MONTHLY',
};

export const icsToEvent = (
  ev: IcsEvent,
  calendarUrl: string,
  opts: MapOptions & { calendarTimeZone?: string | null },
): ImportedEvent | SkipReason => {
  const summary = ev.get('SUMMARY');
  const dtstart = ev.get('DTSTART');
  if (!summary || !dtstart) return 'invalid';
  if (/^CANCELLED$/i.test(ev.get('STATUS')?.value ?? '')) return 'invalid';

  const zoneCandidate = dtstart.params.TZID || opts.calendarTimeZone || opts.timeZone || DEFAULT_TIME_ZONE;
  const zone = isValidZone(zoneCandidate) ? zoneCandidate : DEFAULT_TIME_ZONE;
  const start = icsDateToParts(dtstart, zone);
  if (!start) return 'invalid';
  let end = icsDateToParts(ev.get('DTEND'), zone);
  // An all-day event's DTEND is exclusive (a one-day event ends the next day).
  if (end && !end.time && !start.time) {
    const d = new Date(`${end.date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    end = { date: d.toISOString().slice(0, 10), time: null };
  }

  // Recurrence: map simple RRULEs onto the app's patterns.
  let recurring: ImportedEvent['recurring_pattern'] = null;
  let recurringEnd: string | null = null;
  const rrule = ev.get('RRULE')?.value;
  if (rrule) {
    const parts = Object.fromEntries(rrule.split(';').map((p) => p.split('=')).map(([k, v]) => [k.toUpperCase(), v]));
    const interval = Number(parts.INTERVAL || 1);
    if (parts.FREQ === 'WEEKLY' && interval === 2) recurring = 'FORTNIGHTLY';
    else if (interval === 1) recurring = RRULE_PATTERNS[parts.FREQ] ?? null;
    if (parts.UNTIL) recurringEnd = `${parts.UNTIL.slice(0, 4)}-${parts.UNTIL.slice(4, 6)}-${parts.UNTIL.slice(6, 8)}`;
  }

  const lastDay = recurring ? (recurringEnd ?? '9999-12-31') : (end?.date && end.date > start.date ? end.date : start.date);
  if (lastDay < opts.today) return 'past';

  // A long-running series keeps its original DTSTART; move it to the next
  // occurrence so the listing shows an upcoming date.
  if (recurring && start.date < opts.today) {
    const next = nextOccurrenceOnOrAfter(start.date, recurring, opts.today);
    if (recurringEnd && next > recurringEnd) return 'past';
    const shiftDays = daysBetween(start.date, next);
    start.date = next;
    if (end) end = { ...end, date: addDaysIso(end.date, shiftDays) };
  }
  if (!recurring && opts.maxDate && start.date > opts.maxDate) return 'too-far';

  const name = unescapeIcs(summary.value).trim();
  const descriptionRaw = ev.get('DESCRIPTION') ? unescapeIcs(ev.get('DESCRIPTION')!.value) : '';
  const description = clip(/<[a-z][\s\S]*>/i.test(descriptionRaw) ? htmlToText(descriptionRaw) : descriptionRaw.trim(), 4000) || null;
  const location = ev.get('LOCATION') ? unescapeIcs(ev.get('LOCATION')!.value).trim() : null;
  const [placeName, ...addressRest] = (location ?? '').split(/,\s*/);
  const url = ev.get('URL')?.value.trim() || description?.match(/https?:\/\/[^\s<>"')]+/)?.[0] || null;
  const uid = ev.get('UID')?.value.trim();
  const organizer = ev.get('ORGANIZER');

  return {
    event_name: clip(name, 200)!,
    event_date: start.date,
    end_date: end?.date && end.date > start.date ? end.date : null,
    event_time: formatTimeRange(start, end),
    place_name: placeName?.trim() || null,
    full_address: addressRest.length ? location : null,
    description,
    ticket_link: url,
    price: null,
    organizer_contact: organizer?.params.CN ?? null,
    event_type: classifyEventType(name, description),
    geographical_state: detectState(location),
    image_url: null,
    recurring_pattern: recurring,
    recurring_end_date: recurringEnd,
    external_id: uid ? `${uid}` : `${normalizeUrl(calendarUrl)}|${name}|${start.date}`,
  };
};

export const eventsFromIcs = (text: string, calendarUrl: string, opts: MapOptions) => {
  const { events: vevents, calendarTimeZone } = parseIcs(text);
  const events: ImportedEvent[] = [];
  const skipped: Partial<Record<SkipReason, number>> = {};
  const seen = new Set<string>();
  for (const v of vevents) {
    // Modified single occurrences of a series share the UID; keep the first.
    if (v.get('RECURRENCE-ID')) continue;
    const result = icsToEvent(v, calendarUrl, { ...opts, calendarTimeZone });
    if (typeof result === 'string') { skipped[result] = (skipped[result] ?? 0) + 1; continue; }
    if (seen.has(result.external_id)) continue;
    seen.add(result.external_id);
    events.push(result);
  }
  return { events, skipped };
};

export const looksLikeIcs = (text: string) => /^\s*BEGIN:VCALENDAR/i.test(text);

// ---------------------------------------------------------------------------
// robots.txt

/** Whether `path` may be fetched by our bot under a robots.txt body. */
export const robotsAllows = (robotsTxt: string, path: string, botName = 'SoulFlowBot'): boolean => {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, key, value] = m;
    const k = key.toLowerCase();
    if (k === 'user-agent') {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((k === 'allow' || k === 'disallow') && current) {
      if (value) current.rules.push({ allow: k === 'allow', path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  const bot = botName.toLowerCase();
  const group = groups.find((g) => g.agents.some((a) => a !== '*' && bot.includes(a)))
    ?? groups.find((g) => g.agents.includes('*'));
  if (!group) return true;
  const toRegex = (p: string) =>
    new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
  let best: { allow: boolean; len: number } | null = null;
  for (const rule of group.rules) {
    if (toRegex(rule.path).test(path) && (!best || rule.path.length > best.len || (rule.path.length === best.len && rule.allow))) {
      best = { allow: rule.allow, len: rule.path.length };
    }
  }
  return best ? best.allow : true;
};
