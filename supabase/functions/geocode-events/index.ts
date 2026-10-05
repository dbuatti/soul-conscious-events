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

const geocode = async (query: string): Promise<{ lat: number; lng: number } | null> => {
  const url = `${NOMINATIM}?format=json&limit=1&countrycodes=au&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) return null;
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = Number.parseFloat(data[0].lat);
  const lng = Number.parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng) || !IN_BOUNDS(lat, lng)) return null;
  return { lat, lng };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const db = auth.admin;

  let limit = DEFAULT_BATCH;
  try {
    const body = await req.json();
    if (typeof body?.limit === 'number' && body.limit > 0) {
      limit = Math.min(Math.floor(body.limit), MAX_BATCH);
    }
  } catch {
    // No body is fine; the defaults apply.
  }

  // Only rows that still need work, so a rerun costs nothing.
  const { data: pending, error } = await db
    .from('events')
    .select('id, full_address, place_name, geographical_state, event_name')
    .is('latitude', null)
    .not('full_address', 'is', null)
    .eq('is_deleted', false)
    .order('event_date', { ascending: true })
    .limit(limit);

  if (error) return jsonResponse({ error: error.message }, 400);

  const events = pending ?? [];
  const failed: Array<{ id: string; event_name: string; reason: string }> = [];
  const startedAt = Date.now();
  let located = 0;
  let stoppedEarly = false;

  for (const event of events) {
    // One request per second for the whole run, including the misses.
    await sleep(REQUEST_INTERVAL_MS);
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      stoppedEarly = true;
      break;
    }

    let hit: { lat: number; lng: number } | null = null;
    let lastQuery = '';
    for (const query of candidatesFor(event)) {
      lastQuery = query;
      try {
        hit = await geocode(query);
      } catch (err) {
        console.error('[geocode-events] request failed', query, err);
      }
      if (hit) break;
      await sleep(REQUEST_INTERVAL_MS);
    }

    if (!hit) {
      failed.push({ id: event.id, event_name: event.event_name, reason: `no match for "${lastQuery}"` });
      continue;
    }

    const { error: updateError } = await db
      .from('events')
      .update({ latitude: hit.lat, longitude: hit.lng })
      .eq('id', event.id);
    if (updateError) {
      failed.push({ id: event.id, event_name: event.event_name, reason: updateError.message });
      continue;
    }
    located++;
  }

  const { count: remaining } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .is('latitude', null)
    .not('full_address', 'is', null)
    .eq('is_deleted', false);

  return jsonResponse({
    attempted: located + failed.length,
    located,
    failed,
    remaining: remaining ?? null,
    stoppedEarly,
    message: `${located} located, ${failed.length} unmatched, ${remaining ?? '?'} still to do.`,
  });
});