// One-off backfill: fills in what the importer left blank on events it already
// created -- description, import_relevance, and the start time. Everything here
// already exists on the page; this only repairs metadata those rows were born
// without and never had revisited.
//
// Why it exists: sites routinely truncate the schema.org description (Humanitix
// cuts at ~120 characters), and a listing page states only the date, so events
// imported from one arrived with no time at all. Those rows showed "Time TBC"
// on the public event pages, and relevance scoring had no text to read.
//
// Admin-only, opt-in, and safe to run twice: it only ever fills blanks, and
// records what it changed.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, createAdminClient, jsonResponse, requireAdmin } from '../_shared/auth.ts';
import { politeFetch } from '../_shared/page-fetch.ts';
import { eventsFromHtml, scoreRelevance } from '../_shared/event-import.ts';

const BUDGET_MS = 90_000;
const MAX_LIMIT = 300;

/**
 * Reads a page the same way the importer does.
 *
 * This used to hand-roll the extraction and match `@type === 'Event'` exactly,
 * which silently skipped every Eventbrite page -- theirs are `EducationEvent` --
 * so their descriptions were never filled either. Reusing the importer's own
 * parser keeps the two from drifting apart again.
 *
 * `today` is set to the epoch so events that have already happened are still
 * read: the rows being repaired may well be past.
 */
const metaFrom = (html: string, pageUrl: string) => {
  const { events } = eventsFromHtml(html, pageUrl, { today: '1970-01-01' });
  const event = events[0];
  if (!event) return null;
  return { description: event.description, time: event.event_time, endDate: event.end_date };
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405);

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: { limit?: number; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch { /* empty body is fine: defaults apply */ }

  const limit = Math.min(Number(body.limit) || 40, MAX_LIMIT);
  const dryRun = body.dryRun === true;
  const supabase = createAdminClient();

  // Only rows the importer created, and only where something is actually
  // missing -- never overwrite a description a human wrote or AI parsed.
  const { data: rows, error } = await supabase
    .from('events')
    .select('id, event_name, ticket_link, description, event_time, end_date, import_relevance, source_id')
    .not('source_id', 'is', null)
    .or('description.is.null,event_time.is.null')
    .eq('is_deleted', false)
    // Declined events are never shown, so spending crawl budget on them is waste.
    .neq('approval_status', 'rejected')
    .not('ticket_link', 'is', null)
    .order('event_date', { ascending: false })
    .limit(limit);
  if (error) return jsonResponse({ error: error.message }, 500);

  const started = Date.now();
  const filled: string[] = [];
  const scored: Record<string, number> = {};
  const skipped: { event_name: string; reason: string }[] = [];
  let descriptions = 0;
  let times = 0;

  for (const row of rows ?? []) {
    if (Date.now() - started > BUDGET_MS) {
      skipped.push({ event_name: row.event_name, reason: 'budget exhausted, run again' });
      continue;
    }
    const page = await politeFetch(row.ticket_link);
    if (!page.ok) {
      skipped.push({ event_name: row.event_name, reason: page.reason });
      continue;
    }
    const meta = metaFrom(page.text, page.finalUrl);
    if (!meta) {
      skipped.push({ event_name: row.event_name, reason: 'no event data on page' });
      continue;
    }

    const patch: Record<string, unknown> = {};
    if (!row.description && meta.description) {
      patch.description = meta.description;
      descriptions++;
    }
    if (!row.event_time && meta.time) {
      patch.event_time = meta.time;
      times++;
    }
    if (!row.end_date && meta.endDate) patch.end_date = meta.endDate;
    if (!row.import_relevance) {
      const verdict = scoreRelevance(row.event_name, meta.description ?? row.description ?? '', null);
      patch.import_relevance = verdict;
      scored[verdict] = (scored[verdict] ?? 0) + 1;
    }

    if (Object.keys(patch).length === 0) {
      skipped.push({ event_name: row.event_name, reason: 'nothing to fill' });
      continue;
    }

    if (!dryRun) {
      const { error: upErr } = await supabase.from('events').update(patch).eq('id', row.id);
      if (upErr) {
        skipped.push({ event_name: row.event_name, reason: `update failed: ${upErr.message}` });
        continue;
      }
    }
    filled.push(row.event_name);
  }

  return jsonResponse({
    dryRun,
    examined: rows?.length ?? 0,
    rows_filled: filled.length,
    descriptions_filled: descriptions,
    times_filled: times,
    relevance_scores: scored,
    skipped: skipped.length,
    skipped_detail: skipped.slice(0, 10),
    still_missing: Math.max(0, (rows?.length ?? 0) - filled.length - skipped.length),
    sample: filled.slice(0, 5),
  });
});
