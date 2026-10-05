import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from '../_shared/auth.ts';

// Nominatim's usage policy requires an identifying User-Agent and at most one
// request per second. A browser cannot satisfy either -- fetch() strips a
// User-Agent header -- which is why this runs here instead of in LeafletMap.
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const REQUEST_INTERVAL_MS = 1100;
const USER_AGENT = 'SoulFlow-Australia-Community-App/1.0 (admin geocode-events)';

// Generous enough for Australia, tight enough to reject a geocode that landed
// somewhere else entirely. Mirrors the events_coordinates_in_australia_check.
const IN_BOUNDS = (lat: number, lng: number) =>
  lat >= -44.5 && lat <= -10 && lng >= 112 && lng <= 154;

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

/** Nominatim, then a progressively broader address, then the venue name. */
const candidatesFor = (event: { full_address?: string | null; place_name?: string | null; geographical_state?: string | null }): string[] => {
  const queries: string[] = [];
  const full = event.full_address?.trim();
  if (full) {
    queries.push(full);
    // "12 Smith St, Collingwood VIC 3066" -> "Collingwood VIC 3066"
    const withoutStreet = full.split(',').slice(1).join(',').trim();
    if (withoutStreet && withoutStreet !== full) queries.push(withoutStreet);
    // "Collingwood VIC 3066" -> "Collingwood VIC"
    const withoutPostcode = withoutStreet.replace(/\s+\d{4}\s*$/, '').trim();
    if (withoutPostcode && withoutPostcode !== withoutStreet) queries.push(withoutPostcode);
  }
  if (event.place_name?.trim()) {
    queries.push(`${event.place_name.trim()}, ${event.geographical_state ?? 'Australia'}`);
  }
  return [...new Set(queries.filter(Boolean))];
};

type GeocodeResult =
  | { kind: 'hit'; lat: number; lng: number }
  | { kind: 'miss' }
  | { kind: 'error'; detail: string };

const geocode = async (query: string, gate: () => Promise<void>): Promise<GeocodeResult> => {
  await gate();
  const url = `${NOMINATIM}?format=json&limit=1&countrycodes=au&q=${encodeURIComponent(query)}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  } catch (err) {
    // Transient: worth another run, so it must not be recorded as a dead end.
    return { kind: 'error', detail: String(err) };
  }
  if (response.status === 429 || response.status >= 500) {
    return { kind: 'error', detail: `nominatim ${response.status}` };
  }
  if (!response.ok) return { kind: 'miss' };

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { kind: 'error', detail: 'unreadable response' };
  }
  if (!Array.isArray(data) || data.length === 0) return { kind: 'miss' };

  const lat = Number.parseFloat(data[0].lat);
  const lng = Number.parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng) || !IN_BOUNDS(lat, lng)) return { kind: 'miss' };
  return { kind: 'hit', lat, lng };
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
  try {
    const body = await req.json();
    if (typeof body?.limit === 'number' && body.limit > 0) {
      limit = Math.min(Math.floor(body.limit), MAX_BATCH);
    }
    retry = body?.retry === true;
  } catch {
    // No body is fine; the defaults apply.
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

  const process = async (event: PendingEvent) => {
    let hit: { lat: number; lng: number } | null = null;
    let lastQuery = '';
    for (const query of candidatesFor(event)) {
      lastQuery = query;
      const result = await geocode(query, gate);
      if (result.kind === 'hit') {
        hit = { lat: result.lat, lng: result.lng };
        break;
      }
      if (result.kind === 'error') {
        transient.push({ id: event.id, event_name: event.event_name, reason: result.detail });
        return;
      }
    }

    if (!hit) {
      failed.push({ id: event.id, event_name: event.event_name, reason: `no match for "${lastQuery}"` });
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
    message: `${parts.join(', ')}.`,
  });
});