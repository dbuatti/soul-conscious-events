// supabase/functions/ig-insights/index.ts
//
// Read-only Instagram analytics for the admin panel. Pulls the account summary
// (followers, media count, recent reach) and per-post metrics for the batches
// the panel asks about. Uses the same Meta Graph credentials as
// publish-instagram (META_IG_USER_ID / META_ACCESS_TOKEN).
//
// Body: { mediaIds?: string[] }
// Returns: { account, media: [...] }
//
// Insights are best-effort: like/comment counts come from the media node itself,
// so a failure on the insights endpoint still returns something useful.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/auth.ts";

const GRAPH = Deno.env.get("META_GRAPH_BASE") ?? "https://graph.facebook.com/v26.0";

interface AccountSummary {
  username: string | null;
  followers_count: number | null;
  media_count: number | null;
  reach: number | null;
}

interface MediaInsight {
  id: string;
  media_type: string | null;
  permalink: string | null;
  timestamp: string | null;
  like_count: number | null;
  comments_count: number | null;
  insights: { reach: number | null; saved: number | null; shares: number | null; views: number | null } | null;
  insightsError?: string;
}

async function graphGet(path: string, params: Record<string, string>, token: string): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json as { error?: unknown }).error) {
    const message = (json as { error?: { message?: string } }).error?.message || `Graph API error (${res.status})`;
    throw new Error(message);
  }
  return json as Record<string, unknown>;
}

// Instagram returns lifetime metrics as [{ name, values: [{ value }] }], but
// some metrics now come back as a single total_value. Handle both.
function pickMetric(data: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
  for (const row of rows) {
    const name = String(row.name ?? "");
    if (!name) continue;
    const total = (row.total_value as { value?: number } | undefined)?.value;
    if (typeof total === "number") {
      out[name] = total;
      continue;
    }
    const values = Array.isArray(row.values) ? (row.values as Array<{ value?: number }>) : [];
    const first = values[0]?.value;
    const allNumeric = values.length > 0 && values.every((v) => typeof v.value === "number");
    if (allNumeric) {
      // Time-series: sum the window.
      out[name] = values.reduce((sum, v) => sum + (v.value ?? 0), 0);
    } else if (typeof first === "number") {
      out[name] = first;
    }
  }
  return out;
}

async function fetchAccount(igUserId: string, token: string): Promise<AccountSummary> {
  const account: AccountSummary = { username: null, followers_count: null, media_count: null, reach: null };
  try {
    const fields = await graphGet(igUserId, { fields: "username,followers_count,media_count" }, token);
    account.username = (fields.username as string) ?? null;
    account.followers_count = (fields.followers_count as number) ?? null;
    account.media_count = (fields.media_count as number) ?? null;
  } catch (e) {
    console.error("account fields failed", e);
  }
  try {
    const insights = await graphGet(`${igUserId}/insights`, { metric: "reach", period: "day" }, token);
    account.reach = pickMetric(insights.data).reach ?? null;
  } catch (e) {
    console.error("account reach failed", e);
  }
  return account;
}

async function fetchMedia(id: string, token: string): Promise<MediaInsight> {
  const media: MediaInsight = {
    id,
    media_type: null,
    permalink: null,
    timestamp: null,
    like_count: null,
    comments_count: null,
    insights: null,
  };
  try {
    const fields = await graphGet(id, {
      fields: "id,media_type,permalink,timestamp,like_count,comments_count",
    }, token);
    media.media_type = (fields.media_type as string) ?? null;
    media.permalink = (fields.permalink as string) ?? null;
    media.timestamp = (fields.timestamp as string) ?? null;
    media.like_count = (fields.like_count as number) ?? null;
    media.comments_count = (fields.comments_count as number) ?? null;
  } catch (e) {
    media.insightsError = e instanceof Error ? e.message : String(e);
    return media;
  }
  try {
    const insights = await graphGet(`${id}/insights`, { metric: "reach,saved,shares,views" }, token);
    const picked = pickMetric(insights.data);
    media.insights = {
      reach: picked.reach ?? null,
      saved: picked.saved ?? null,
      shares: picked.shares ?? null,
      views: picked.views ?? null,
    };
  } catch (e) {
    media.insightsError = e instanceof Error ? e.message : String(e);
  }
  return media;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!(serviceKey && token === serviceKey)) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  const igUserId = Deno.env.get("META_IG_USER_ID");
  const accessToken = Deno.env.get("META_ACCESS_TOKEN");
  if (!igUserId || !accessToken) {
    return jsonResponse(
      {
        error:
          "Instagram isn't connected yet. Add META_IG_USER_ID and META_ACCESS_TOKEN to the project's Edge Function secrets first.",
        code: "not_configured",
      },
      400,
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mediaIds: string[] = Array.isArray(body?.mediaIds)
      ? (body.mediaIds as unknown[]).filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, 25)
      : [];
    const account = await fetchAccount(igUserId, accessToken);
    const media: MediaInsight[] = [];
    for (const id of mediaIds) {
      media.push(await fetchMedia(id, accessToken));
    }
    return jsonResponse({ ok: true, account, media });
  } catch (e) {
    console.error("ig-insights error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
