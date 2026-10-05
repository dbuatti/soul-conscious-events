import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, createAdminClient, jsonResponse, requireAdmin } from '../_shared/auth.ts';
import {
  eventsFromHtml, eventsFromIcs, extractJsonLdNodes, findEventLinks, findPaginationLinks,
  htmlToText, isPublicHttpUrl, jsonLdListUrls, looksLikeIcs, normalizeUrl, robotsAllows,
  classifyEventType, detectState, parseSitemap, sitemapsFromRobots, eventUrlsFromSitemap,
  type ImportedEvent, type MapOptions,
} from '../_shared/event-import.ts';

// Limits keep a run well inside the edge function wall-clock limit and keep
// us a light, polite visitor on other people's sites.
const RUN_DEADLINE_MS = 110_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BODY_BYTES = 3_000_000;
const DETAIL_PAGES_PER_SOURCE = 12;
const DETAIL_PAGES_PER_RUN = 40;
const AI_FALLBACKS_PER_RUN = 5;
const SAME_HOST_DELAY_MS = 600;
const USER_AGENT = 'SoulFlowBot/1.0 (+https://soulflowevents.vercel.app/about; community events guide)';
// Sitemaps let one source expose a whole site instead of just one page.
const MAX_SITEMAPS = 4;
const MAX_CANDIDATE_LINKS = 60;
const MAX_PAGINATION_HOPS = 1;

interface Source { id: string; url: string; label: string | null }

interface SourceResult {
  id: string;
  url: string;
  status: 'ok' | 'partial' | 'error';
  message: string;
  found: number;
  added: number;
}

class Budget {
  private start = Date.now();
  detailPages = 0;
  aiCalls = 0;
  timeLeft() { return RUN_DEADLINE_MS - (Date.now() - this.start); }
  expired() { return this.timeLeft() <= 5_000; }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const robotsCache = new Map<string, string>();
const lastHit = new Map<string, number>();

/** robots.txt body for an origin, cached for the run. Empty string = allow all. */
async function robotsFor(origin: string): Promise<string> {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  let body = '';
  try {
    const r = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6_000),
    });
    if (r.ok) body = (await r.text()).slice(0, 200_000);
  } catch { /* unreachable robots.txt: treat as allow-all */ }
  robotsCache.set(origin, body);
  return body;
}

/** Fetches a public URL as text, honouring robots.txt and pacing per host. */
async function politeFetch(url: string): Promise<{ ok: true; text: string; finalUrl: string } | { ok: false; reason: string }> {
  if (!isPublicHttpUrl(url)) return { ok: false, reason: 'not a public http(s) URL' };
  const u = new URL(url);

  const robots = await robotsFor(u.origin);
  if (!robotsAllows(robots, u.pathname + u.search)) {
    return { ok: false, reason: 'blocked by robots.txt' };
  }

  const wait = (lastHit.get(u.host) ?? 0) + SAME_HOST_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(u.host, Date.now());

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,text/calendar;q=0.9,*/*;q=0.5',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    if (!isPublicHttpUrl(res.url || url)) return { ok: false, reason: 'redirected to a non-public URL' };
    const length = Number(res.headers.get('content-length') ?? 0);
    if (length > MAX_BODY_BYTES) return { ok: false, reason: 'page too large' };
    const text = await res.text();
    return { ok: true, text: text.slice(0, MAX_BODY_BYTES), finalUrl: res.url || url };
  } catch (err) {
    const reason = err instanceof Error && err.name === 'TimeoutError' ? 'timed out' : (err instanceof Error ? err.message : String(err));
    return { ok: false, reason };
  }
}

/**
 * Collects candidate event pages for a site. Three site-agnostic sources, in
 * order of reliability: the sitemap (every URL the site publishes, which is
 * what most sites exist to be crawled for), then links on the page itself, then
 * JSON-LD list entries. Pagination links are followed once so page two and
 * beyond aren't invisible.
 */
async function collectCandidateLinks(
  startUrl: string,
  budget: Budget,
): Promise<{ links: string[]; fromSitemap: number; paginationPages: number }> {
  const seen = new Set<string>();
  // On-page and sitemap candidates are kept apart: links found on the listing
  // page are proven to work, so the sitemap only tops up the queue rather than
  // crowding it out.
  const fromPage: string[] = [];
  const fromSiteMap: string[] = [];
  let fromSitemap = 0;
  let paginationPages = 0;

  const take = (raw: string, bucket: string[]) => {
    if (bucket.length >= MAX_CANDIDATE_LINKS) return;
    const key = normalizeUrl(raw);
    if (key && !seen.has(key)) {
      seen.add(key);
      bucket.push(raw);
    }
  };

  // 1. Links on the listing page itself, plus one hop of pagination.
  const first = await politeFetch(startUrl);
  if (first.ok) {
    const pageUrl = first.finalUrl || startUrl;
    for (const u of jsonLdListUrls(extractJsonLdNodes(first.text), pageUrl)) take(u, fromPage);
    for (const u of findEventLinks(first.text, pageUrl)) take(u, fromPage);

    for (const nextUrl of findPaginationLinks(first.text, pageUrl)) {
      if (paginationPages >= MAX_PAGINATION_HOPS || budget.expired()) break;
      const next = await politeFetch(nextUrl);
      if (!next.ok) continue;
      paginationPages++;
      for (const u of findEventLinks(next.text, next.finalUrl || nextUrl)) take(u, fromPage);
    }
  }

  // 2. Sitemaps as a top-up: robots.txt declarations first, then the
  // conventional paths.
  const origin = new URL(startUrl).origin;
  const robots = await robotsFor(origin);
  const sitemapUrls = new Set(sitemapsFromRobots(robots));
  for (const guess of ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml']) {
    if (sitemapUrls.size >= MAX_SITEMAPS) break;
    sitemapUrls.add(`${origin}${guess}`);
  }

  let pending = [...sitemapUrls];
  const seenSitemap = new Set<string>();
  while (pending.length && seenSitemap.size < MAX_SITEMAPS && !budget.expired()) {
    const sitemapUrl = pending.shift()!;
    const key = normalizeUrl(sitemapUrl);
    if (key && seenSitemap.has(key)) continue;
    if (key) seenSitemap.add(key);
    const page = await politeFetch(sitemapUrl);
    if (!page.ok) continue; // most small sites have no sitemap; that's normal
    const { urls, isIndex } = parseSitemap(page.text);
    if (isIndex) {
      pending = [...urls, ...pending].slice(0, MAX_SITEMAPS * 2);
    } else {
      for (const u of eventUrlsFromSitemap(urls, startUrl)) {
        take(u, fromSiteMap);
        fromSitemap++;
      }
    }
  }

  return { links: [...fromPage, ...fromSiteMap], fromSitemap, paginationPages };
}

/** Last resort for event pages without structured data: ask Gemini to read the page text. */
async function aiExtract(html: string, url: string, opts: MapOptions): Promise<ImportedEvent | null> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return null;
  const text = htmlToText(
    html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, ''),
  ).slice(0, 6000);
  if (text.length < 80) return null;

  const prompt = `Extract the single event described on this web page as JSON.
Today's date is ${opts.today}. Use YYYY-MM-DD dates. If the page does not describe one specific upcoming event in Australia, return {"isEvent": false}.
Return ONLY JSON with these keys: isEvent (boolean), eventName, eventDate, endDate (only for multi-day events), eventTime (e.g. "7:00pm – 9:00pm"), placeName, fullAddress, description (the event's own description, no boilerplate), price (e.g. "$45", "Free", "$20–$35"), organizerContact.
Page URL: ${url}
Page text:
"""${text}"""`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const json = JSON.parse(String(raw).match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    if (!json.isEvent || typeof json.eventName !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(json.eventDate ?? '')) return null;
    if (json.eventDate < opts.today || (opts.maxDate && json.eventDate > opts.maxDate)) return null;
    const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    return {
      event_name: json.eventName.trim().slice(0, 200),
      event_date: json.eventDate,
      end_date: /^\d{4}-\d{2}-\d{2}$/.test(json.endDate ?? '') && json.endDate > json.eventDate ? json.endDate : null,
      event_time: s(json.eventTime),
      place_name: s(json.placeName),
      full_address: s(json.fullAddress),
      description: s(json.description)?.slice(0, 4000) ?? null,
      ticket_link: url,
      price: s(json.price),
      organizer_contact: s(json.organizerContact),
      event_type: classifyEventType(json.eventName, json.description),
      geographical_state: detectState(json.fullAddress, json.placeName),
      image_url: html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null,
      recurring_pattern: null,
      recurring_end_date: null,
      external_id: normalizeUrl(url) ?? url,
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // The scheduled GitHub Action calls with the service-role key; people must be admins.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const isScheduled = !!serviceKey && token === serviceKey;
  let triggeredBy = 'schedule';
  if (!isScheduled) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
    triggeredBy = 'manual';
  }

  const db = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const sourceId: string | undefined = typeof body?.sourceId === 'string' ? body.sourceId : undefined;

  let query = db.from('event_sources').select('id, url, label').order('last_run_at', { ascending: true, nullsFirst: true });
  query = sourceId ? query.eq('id', sourceId) : query.eq('is_active', true);
  const { data: sources, error: sourcesError } = await query;
  if (sourcesError) {
    return jsonResponse({ error: `Could not load sources: ${sourcesError.message}. Has migration 0006 been run?` }, 500);
  }
  if (!sources?.length) return jsonResponse({ message: 'No active sources to check.', sources: [] });

  // Everything we already know about, including rejected and deleted events,
  // so declined imports don't come back.
  const knownExternalIds = new Set<string>();
  const knownLinks = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('events').select('ticket_link, external_id').range(from, from + 999);
    if (error) return jsonResponse({ error: `Could not load existing events: ${error.message}` }, 500);
    for (const row of data ?? []) {
      if (row.external_id) knownExternalIds.add(row.external_id);
      const link = normalizeUrl(row.ticket_link);
      if (link) knownLinks.add(link);
    }
    if (!data || data.length < 1000) break;
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
  const maxDateObj = new Date(`${today}T00:00:00Z`);
  maxDateObj.setUTCFullYear(maxDateObj.getUTCFullYear() + 1);
  const opts: MapOptions = { today, maxDate: maxDateObj.toISOString().slice(0, 10) };

  const { data: run } = await db.from('event_import_runs').insert({ triggered_by: triggeredBy }).select('id').single();
  const budget = new Budget();
  const results: SourceResult[] = [];

  for (const source of sources as Source[]) {
    if (budget.expired()) {
      results.push({ id: source.id, url: source.url, status: 'partial', message: 'Skipped: out of time this run', found: 0, added: 0 });
      continue;
    }

    const notes: string[] = [];
    let status: SourceResult['status'] = 'ok';
    const candidates: { event: ImportedEvent; strictLinkDedupe: boolean }[] = [];

    const page = await politeFetch(source.url);
    if (!page.ok) {
      const result: SourceResult = { id: source.id, url: source.url, status: 'error', message: `Couldn't read source: ${page.reason}`, found: 0, added: 0 };
      results.push(result);
      await db.from('event_sources').update({ last_run_at: new Date().toISOString(), last_status: 'error', last_message: result.message, last_found: 0, last_added: 0 }).eq('id', source.id);
      continue;
    }

    if (looksLikeIcs(page.text)) {
      const ics = eventsFromIcs(page.text, source.url, opts);
      // Calendar entries often share one booking link, so only their UID identifies them.
      ics.events.forEach((event) => candidates.push({ event, strictLinkDedupe: false }));
      notes.push(`calendar feed with ${ics.events.length} upcoming`);
    } else {
      const onPage = eventsFromHtml(page.text, page.finalUrl, opts);
      onPage.events.forEach((event) => candidates.push({ event, strictLinkDedupe: true }));
      const seenLinks = new Set(onPage.events.map((e) => normalizeUrl(e.ticket_link)).filter(Boolean) as string[]);

      // Sitemap + on-page links + one page of pagination, in one helper.
      const { links: candidatesFound, fromSitemap, paginationPages } = await collectCandidateLinks(source.url, budget);
      const links = candidatesFound.filter((link) => {
        const key = normalizeUrl(link);
        return key && !seenLinks.has(key) && !knownLinks.has(key) && !knownExternalIds.has(key);
      });
      if (fromSitemap) notes.push(`${fromSitemap} from the sitemap`);
      if (paginationPages) notes.push(`followed ${paginationPages} page${paginationPages === 1 ? '' : 's'} of listings`);

      // A single event page (not a listing) is fine too.
      if (onPage.events.length === 0 && links.length === 0 && budget.aiCalls < AI_FALLBACKS_PER_RUN) {
        budget.aiCalls++;
        const ai = await aiExtract(page.text, page.finalUrl, opts);
        if (ai) candidates.push({ event: ai, strictLinkDedupe: true });
      }

      let visited = 0;
      let failed = 0;
      let leftOver = 0;
      for (const link of links) {
        if (visited >= DETAIL_PAGES_PER_SOURCE || budget.detailPages >= DETAIL_PAGES_PER_RUN || budget.expired()) {
          status = 'partial';
          leftOver = links.length - visited;
          break;
        }
        visited++;
        budget.detailPages++;
        const detail = await politeFetch(link);
        if (!detail.ok) { failed++; continue; }
        const found = eventsFromHtml(detail.text, detail.finalUrl, opts);
        if (found.events.length) {
          found.events.forEach((event) => candidates.push({ event, strictLinkDedupe: true }));
        } else if (budget.aiCalls < AI_FALLBACKS_PER_RUN && !found.skipped.past) {
          budget.aiCalls++;
          const ai = await aiExtract(detail.text, detail.finalUrl, opts);
          if (ai) candidates.push({ event: ai, strictLinkDedupe: true });
        }
      }
      notes.push(`checked ${visited} event page${visited === 1 ? '' : 's'}${failed ? `, ${failed} unreadable` : ''}`);
      if (leftOver) notes.push(`${leftOver} more to check ${leftOver === 1 ? 'tomorrow' : 'over the coming days'}`);
    }

    // Drop anything already in SoulFlow, and duplicates within this batch.
    const fresh: ImportedEvent[] = [];
    for (const { event, strictLinkDedupe } of candidates) {
      const link = normalizeUrl(event.ticket_link);
      if (knownExternalIds.has(event.external_id)) continue;
      if (strictLinkDedupe && link && knownLinks.has(link)) continue;
      knownExternalIds.add(event.external_id);
      if (strictLinkDedupe && link) knownLinks.add(link);
      fresh.push(event);
    }

    let added = 0;
    if (fresh.length) {
      const now = new Date().toISOString();
      const { error } = await db.from('events').insert(fresh.map((e) => ({
        ...e,
        source_id: source.id,
        imported_at: now,
        approval_status: 'pending',
        is_deleted: false,
        user_id: null,
      })));
      if (error) {
        status = 'error';
        notes.push(`saving failed: ${error.message}`);
      } else {
        added = fresh.length;
      }
    }

    const headline = added > 0
      ? `${added} new event${added === 1 ? '' : 's'} waiting for your review`
      : candidates.length > 0
        ? `Nothing new — all ${candidates.length} already imported`
        : 'No events found on this page';

    const result: SourceResult = {
      id: source.id,
      url: source.url,
      status,
      message: `${headline}${notes.length ? ` · ${notes.join(' · ')}` : ''}`,
      found: candidates.length,
      added,
    };
    results.push(result);
    await db.from('event_sources').update({
      last_run_at: new Date().toISOString(),
      last_status: status,
      last_message: result.message.slice(0, 500),
      last_found: result.found,
      last_added: added,
    }).eq('id', source.id);
  }

  const totals = {
    sources_checked: results.length,
    events_found: results.reduce((n, r) => n + r.found, 0),
    events_added: results.reduce((n, r) => n + r.added, 0),
  };
  if (run?.id) {
    await db.from('event_import_runs').update({ ...totals, finished_at: new Date().toISOString(), details: results }).eq('id', run.id);
  }

  return jsonResponse({ ...totals, sources: results });
});
