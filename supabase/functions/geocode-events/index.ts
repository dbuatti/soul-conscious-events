import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from '../_shared/auth.ts';

// The geocoder's usage policy requires an identifying User-Agent and at most one
// request per second. A browser cannot satisfy either -- fetch() strips a
// User-Agent header -- which is why this runs here instead of in LeafletMap.
// Nominatim refuses hosted edge runtimes with "Access denied" -- it blocks
// datacentre IPs, and Supabase functions run on Google Cloud. Verified from the
// deployed function, so it cannot be used here. Photon is a Nominatim-derived
// geocoder that answers the same queries without a key or an IP allowlist.
const PHOTON = 'https://photon.komoot.io/api';
const REQUEST_INTERVAL_MS = 1100;
const USER_AGENT = 'SoulFlow-Australia-Community-App/1.0 (admin geocode-events)';

// Generous enough for Australia, tight enough to reject a geocode that landed
// somewhere else entirely. Mirrors the events_coordinates_in_australia_check.
const IN_BOUNDS = (lat: number, lng: number) =>
  lat >= -44.5 && lat <= -10 && lng >= 112 && lng <= 154;

// Photon has no country parameter, so results are biased toward Australia
// instead. Anything landing elsewhere still fails the bounds check above.
const PHOTON_BBOX = '112,-44.5,154,-10';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A hosted function is killed at its wall-clock limit, and at one request per
// second a few hundred addresses will not fit in one invocation. So each run
// spends a fixed budget, writes what it finds, and reports what is left. Running
// it again picks up exactly where it stopped.
const TIME_BUDGET_MS = 100_000;
const DEFAULT_BATCH = 60;
const MAX_BATCH = 300;

// The rate limit is one request per second, not one request in flight at a
// time. Nominatim's own latency is well over a second, so a purely sequential
// loop leaves most of the budget idle waiting on the network. Several requests
// stay in flight while leaving one second apart.
const CONCURRENCY = 4;

/** Space out requests without serialising them: each caller reserves its slot. */
const createRateGate = (intervalMs: number) => {
  let reserved = 0;
  return async () => {
    const now = Date.now();
    const at = Math.max(now, reserved);
    reserved = at + intervalMs;
    await sleep(at - now);
  };
};

/** Nominatim, then the venue name. Rejections are never a verdict on the address. */
const candidatesFor = (event: { full_address?: string | null; place_name?: string | null; geographical_state?: string | null }): string[] => {
  const queries: string[] = [];
  const full = event.full_address?.trim();
  if (full) {
    queries.push(full);
    // "12 Smith St, Collingwood VIC 3066" -> "Collingwood VIC 3066". Only worth
    // trying when the leading part is still an address: venue calendars often
    // store a bare name, and stripping the comma off "Fortress Melbourne, VIC"
    // leaves "VIC", which matches nothing.
    const parts = full.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      const withoutStreet = parts.slice(1).join(', ');
      const withoutPostcode = withoutStreet.replace(/\s+\d{4}$/, '').trim();
      // A bare state or country is not a location.
      if (withoutStreet.split(' ').length > 1 && withoutStreet !== full) queries.push(withoutStreet);
      if (withoutPostcode.split(' ').length > 1 && withoutPostcode !== withoutStreet) {
        queries.push(withoutPostcode);
      }
    }
  }
  const place = event.place_name?.trim();
  if (place && place !== full) queries.push(place);
  return [...new Set(queries.filter((q) => q.length > 3))];
};

type GeocodeResult =
  | { kind: 'hit'; lat: number; lng: number }
  | { kind: 'miss' }
  | { kind: 'error'; detail: string };

const geocode = async (query: string, gate: () => Promise<void>): Promise<GeocodeResult> => {
  await gate();
  const url = `${PHOTON}?limit=1&lang=en&bbox=${PHOTON_BBOX}&q=${encodeURIComponent(query)}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  } catch (err) {
    return { kind: 'error', detail: `network: ${String(err)}` };
  }

  // Only a clean 200 counts as "the geocoder says this address does not exist".
  // Every rejection -- 403 from bot filtering, 429 from rate limiting, 5xx --
  // is a statement about the request, not the address, so it must stay
  // retryable. Recording these as misses permanently buried good addresses.
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return { kind: 'error', detail: `HTTP ${response.status}: ${body.slice(0, 120)}` };
  }

  let data: { features?: Array<{ geometry?: { coordinates?: number[] } }> };
  try {
    data = await response.json();
  } catch (err) {
    return { kind: 'error', detail: `unreadable body: ${String(err)}` };
  }

  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return { kind: 'miss' };
  // GeoJSON is [longitude, latitude], the opposite of what we store.
  const [lng, lat] = coords;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return { kind: 'miss' };
  if (!IN_BOUNDS(lat, lng)) return { kind: 'miss' };
  return { kind: 'hit', lat, lng };
};

/** One request, reported verbatim. Cheaper than a 100-second batch of guesses. */
const probe = async (query: string): Promise<Record<string, unknown>> => {
  const url = `${PHOTON}?limit=1&lang=en&bbox=${PHOTON_BBOX}&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  const body = await response.text().catch(() => '');
  return {
    query,
    provider: 'photon',
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    body: body.slice(0, 400),
  };
};

interface PendingEvent {
  id: string;
  event_name: string;
  full_address?: string | null;
  place_name?: string | null;
  geographical_state?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const db = auth.admin;

  // The map only ever plots upcoming, approved, undeleted events, and rows that
  // have already been tried once are left alone. Past events and repeat misses
  // stayed in the queue forever otherwise, which is what stalled the first run.
  const todoQuery = () =>
    db
      .from('events')
      .select('id, full_address, place_name, geographical_state, event_name')
      .is('latitude', null)
      .is('geocode_failed_at', null)
      .not('full_address', 'is', null)
      .eq('is_deleted', false)
      .eq('approval_status', 'approved')
      .gte('event_date', new Date().toISOString().slice(0, 10));

  let limit = DEFAULT_BATCH;
  let retry = false;
  let wantProbe = false;
  let probeQuery = '';
  try {
    const body = await req.json();
    if (typeof body?.limit === 'number' && body.limit > 0) {
      limit = Math.min(Math.floor(body.limit), MAX_BATCH);
    }
    retry = body?.retry === true;
    wantProbe = body?.probe === true;
    if (typeof body?.query === 'string') probeQuery = body.query;
  } catch {
    // No body is fine; the defaults apply.
  }

  // The query rides in the body rather than a custom header: Access-Control-
  // Allow-Headers is fixed in _shared/auth.ts and a header the preflight does
  // not allow blocks the request before the function is ever invoked.
  if (wantProbe) {
    return jsonResponse(await probe(probeQuery || 'Fortress Melbourne, VIC'));
  }

  // Addresses that were fixed after the fact are worth another look.
  if (retry) {
    await db
      .from('events')
      .update({ geocode_failed_at: null })
      .is('latitude', null)
      .not('geocode_failed_at', 'is', null)
      .eq('is_deleted', false)
      .eq('approval_status', 'approved');
  }

  const { data: pending, error } = await todoQuery()
    .order('event_date', { ascending: true })
    .limit(limit);

  if (error) return jsonResponse({ error: error.message }, 400);

  const events = (pending ?? []) as PendingEvent[];
  const failed: Array<{ id: string; event_name: string; reason: string }> = [];
  const transient: Array<{ id: string; event_name: string; reason: string }> = [];
  const gate = createRateGate(REQUEST_INTERVAL_MS);
  const startedAt = Date.now();
  let cursor = 0;
  let located = 0;
  let stoppedEarly = false;
  let blocked = false;

  const process = async (event: PendingEvent) => {
    const candidates = candidatesFor(event);
    if (candidates.length === 0) {
      failed.push({ id: event.id, event_name: event.event_name, reason: 'no usable address' });
      await db.from('events').update({ geocode_failed_at: new Date().toISOString() }).eq('id', event.id);
      return;
    }

    let hit: { lat: number; lng: number } | null = null;
    let transientDetail: string | null = null;
    for (const query of candidates) {
      const result = await geocode(query, gate);
      if (result.kind === 'hit') {
        hit = { lat: result.lat, lng: result.lng };
        break;
      }
      if (result.kind === 'error') {
        transientDetail = `${result.detail} (q="${query}")`;
        break;
      }
    }

    if (transientDetail) {
      transient.push({ id: event.id, event_name: event.event_name, reason: transientDetail });
      return;
    }

    if (!hit) {
      // Every candidate came back a clean 200 with nothing in it.
      failed.push({
        id: event.id,
        event_name: event.event_name,
        reason: `no match for ${candidates.map((q) => `"${q}"`).join(' | ')}`,
      });
      // Remember the dead end. Without this the row looks untouched and every
      // rerun spends its budget re-failing the same hopeless addresses.
      await db.from('events').update({ geocode_failed_at: new Date().toISOString() }).eq('id', event.id);
      return;
    }

    const { error: updateError } = await db
      .from('events')
      .update({ latitude: hit.lat, longitude: hit.lng })
      .eq('id', event.id);
    if (updateError) {
      transient.push({ id: event.id, event_name: event.event_name, reason: updateError.message });
      return;
    }
    located++;
  };

  const worker = async () => {
    while (cursor < events.length) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        stoppedEarly = true;
        return;
      }
      // Repeated rejections mean Nominatim is refusing us outright. Grinding on
      // would just burn the budget, so bail and let a human retry later.
      if (transient.length >= 3) {
        blocked = true;
        return;
      }
      await process(events[cursor++]);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const { count: remaining } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .is('latitude', null)
    .is('geocode_failed_at', null)
    .not('full_address', 'is', null)
    .eq('is_deleted', false)
    .eq('approval_status', 'approved')
    .gte('event_date', new Date().toISOString().slice(0, 10));

  const { count: deadEnds } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .is('latitude', null)
    .not('geocode_failed_at', 'is', null)
    .eq('is_deleted', false);

  const parts = [`${located} located`];
  if (failed.length) parts.push(`${failed.length} unmatched`);
  if (transient.length) parts.push(`${transient.length} retryable`);
  parts.push(`${remaining ?? '?'} still to do`);

  return jsonResponse({
    attempted: located + failed.length + transient.length,
    located,
    failed: failed.slice(0, 40),
    transient: transient.slice(0, 20),
    transientCount: transient.length,
    remaining: remaining ?? null,
    deadEnds: deadEnds ?? null,
    stoppedEarly,
    blocked,
    message: `${parts.join(', ')}.`,
  });
});