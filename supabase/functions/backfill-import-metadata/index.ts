// One-off backfill: fills in `description` and `import_relevance` for events the
// importer already created. Everything here already exists in the database --
// this only repairs the metadata those rows were born without.
//
// Why it exists: sites routinely truncate the schema.org description (Humanitix
// cuts at ~120 characters) and those rows were inserted with a stub, or with no
// description at all, so the public event pages showed nothing and relevance
// scoring had no text to read.
//
// Admin-only, opt-in, and safe to run twice: it only ever fills blanks and
// records what it changed.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, createAdminClient, jsonResponse, requireAdmin } from '../_shared/auth.ts';
import { politeFetch } from '../_shared/page-fetch.ts';
import { extractJsonLdNodes, extendTruncatedDescription, scoreRelevance } from '../_shared/event-import.ts';

const BUDGET_MS = 90_000;
const MAX_LIMIT = 300;

/** Pulls the description off an event page the same way the importer would. */
const descriptionFrom = (html: string): string | null => {
  for (const node of extractJsonLdNodes(html)) {
    if (node['@type'] !== 'Event') continue;
    const raw = typeof node.description === 'string' ? node.description : '';
    const text = extendTruncatedDescription(html, raw);
    if (text.trim()) return text.trim();
  }
  return null;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405);

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  let body: { limit?: number; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch { /* empty body is fine: defaults apply */ }

  const limit = Math.min(Number(body.limit) || 40, MAX_LIMIT);
  const dryRun = body.dryRun === true;
  const supabase = createAdminClient();

  // Only rows the importer created, and only where the text is actually
  // missing -- never overwrite a description a human wrote or AI parsed.
  const { data: rows, error } = await supabase
    .from('events')
    .select('id, event_name, ticket_link, description, import_relevance, source_id')
    .not('source_id', 'is', null)
    .is('description', null)
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
    const description = descriptionFrom(page.text);
    if (!description) {
      skipped.push({ event_name: row.event_name, reason: 'no description on page' });
      continue;
    }

    const verdict = scoreRelevance(row.event_name, description, null);
    scored[verdict] = (scored[verdict] ?? 0) + 1;

    if (!dryRun) {
      const patch: Record<string, unknown> = { description };
      if (!row.import_relevance) patch.import_relevance = verdict;
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
    descriptions_filled: filled.length,
    relevance_scores: scored,
    skipped: skipped.length,
    skipped_detail: skipped.slice(0, 10),
    still_missing: Math.max(0, (rows?.length ?? 0) - filled.length - skipped.length),
    sample: filled.slice(0, 5),
  });
});