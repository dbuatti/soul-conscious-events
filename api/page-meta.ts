/**
 * Serves index.html with page-specific title, description, image and
 * JSON-LD for /events/:id and the city guides, so links shared to WhatsApp,
 * Instagram, Messenger etc. (which don't run JavaScript) preview the real
 * event instead of the generic homepage card. See src/lib/share-meta.ts.
 *
 * Routed from vercel.json. On any failure it redirects to the same URL with
 * ?spa=1, which vercel.json serves as the plain SPA, so a page never breaks.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  baseEventIdFromPath,
  buildCityMeta,
  buildEventMeta,
  injectPageMeta,
  type PageMeta,
  type ShareableEvent,
} from '../src/lib/share-meta';
import { CITY_GUIDES } from '../src/lib/cities';

// Public values (the same ones shipped in the browser bundle). Reads go
// through Row Level Security as the anonymous role.
const SUPABASE_URL = 'https://tbyjdhxpbfvqsrzzdjwi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRieWpkaHhwYmZ2cXNyenpkandpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NzYyNzIsImV4cCI6MjA2OTE1MjI3Mn0.1BpuFdmZnV_-jjncopxWODAGn7-Coh716jzbYeTrNT4';

const EVENT_COLUMNS = [
  'id', 'event_name', 'event_date', 'end_date', 'event_time', 'place_name', 'full_address',
  'geographical_state', 'description', 'price', 'image_url', 'ticket_link', 'organizer_contact',
].join(',');

let shellCache: { html: string; at: number } | null = null;
const SHELL_TTL_MS = 5 * 60 * 1000;

const loadShell = async (origin: string): Promise<string> => {
  if (shellCache && Date.now() - shellCache.at < SHELL_TTL_MS) return shellCache.html;
  let html: string | null = null;
  try {
    html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  } catch {
    const res = await fetch(`${origin}/index.html`, { headers: { 'user-agent': 'soulflow-page-meta' } });
    if (!res.ok) throw new Error(`index.html fetch failed: ${res.status}`);
    html = await res.text();
  }
  if (!html.includes('<div id="root">')) throw new Error('unexpected index.html');
  shellCache = { html, at: Date.now() };
  return html;
};

const fetchEvent = async (id: string): Promise<ShareableEvent | null> => {
  const url = `${SUPABASE_URL}/rest/v1/events?select=${EVENT_COLUMNS}&id=eq.${id}&approval_status=eq.approved&is_deleted=eq.false&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`event fetch failed: ${res.status}`);
  const rows = (await res.json()) as ShareableEvent[];
  return rows[0] ?? null;
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'soulflowau.vercel.app';
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  const origin = `${proto}://${host}`;
  const reqUrl = new URL(req.url ?? '/', origin);
  const type = reqUrl.searchParams.get('type');

  // The path the visitor asked for (rewrites keep the original query string).
  const visiblePath = type === 'event'
    ? `/events/${reqUrl.searchParams.get('id') ?? ''}`
    : `/${reqUrl.searchParams.get('slug') ?? ''}`;
  const passthrough = new URLSearchParams(reqUrl.search);
  ['type', 'id', 'slug'].forEach((k) => passthrough.delete(k));

  try {
    let meta: PageMeta | null = null;
    if (type === 'event') {
      const id = baseEventIdFromPath(reqUrl.searchParams.get('id'));
      const event = id ? await fetchEvent(id) : null;
      if (event) meta = buildEventMeta(event);
    } else if (type === 'city') {
      const city = CITY_GUIDES.find((c) => c.slug === reqUrl.searchParams.get('slug'));
      if (city) meta = buildCityMeta(city);
    }

    const shell = await loadShell(origin);
    const html = meta ? injectPageMeta(shell, meta) : shell;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
    res.end(html);
  } catch (err) {
    console.error('page-meta failed', err);
    passthrough.set('spa', '1');
    res.statusCode = 307;
    res.setHeader('Location', `${visiblePath}?${passthrough.toString()}`);
    res.setHeader('Cache-Control', 'no-store');
    res.end();
  }
}
