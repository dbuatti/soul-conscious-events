// Polite, robots-respecting page fetching shared by the importer and the
// metadata backfill. Extracted so both crawl with identical pacing and the same
// robots.txt decisions -- a backfill is still crawling someone's website.

import { isPublicHttpUrl, robotsAllows } from './event-import.ts';

export const FETCH_TIMEOUT_MS = 12_000;
export const MAX_BODY_BYTES = 3_000_000;
export const SAME_HOST_DELAY_MS = 600;
export const USER_AGENT = 'SoulFlowBot/1.0 (+https://soulflowevents.vercel.app/about; community events guide)';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const robotsCache = new Map<string, string>();
const lastHit = new Map<string, number>();

/** robots.txt body for an origin, cached for the run. Empty string = allow all. */
export async function robotsFor(origin: string): Promise<string> {
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
export async function politeFetch(
  url: string
): Promise<{ ok: true; text: string; finalUrl: string } | { ok: false; reason: string }> {
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
    const reason = err instanceof Error && err.name === 'TimeoutError'
      ? 'timed out'
      : (err instanceof Error ? err.message : String(err));
    return { ok: false, reason };
  }
}