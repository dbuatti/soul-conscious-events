// supabase/functions/weekly-ig-slides/index.ts
//
// Builds a weekly event carousel: a cover plus one slide per approved event in
// the next seven days. Pass { state: "VIC" } to build a state-only carousel
// (kind "state-VIC"), otherwise it covers all of Australia (kind "weekly").
//
// Slides are SVG (resvg's WASM rasteriser exceeds the Edge runtime budget and
// causes a 546). The admin panel rasterises to a 1080x1350 PNG in the browser.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/auth.ts";
import {
  generateCoverSlideSvg,
  generateIndexSlideSvg,
  generateEventSlideSvg,
  generateStorySlideSvg,
  type EventSlideData,
} from "../_shared/ig-slide-template.tsx";

const BUCKET = "ig-weekly-slides";

const STATE_NAMES: Record<string, string> = {
  ACT: "Canberra",
  NSW: "New South Wales",
  NT: "Northern Territory",
  QLD: "Queensland",
  SA: "South Australia",
  TAS: "Tasmania",
  VIC: "Victoria",
  WA: "Western Australia",
};

function addDays(d: Date, days: number) {
  const nd = new Date(d);
  nd.setUTCDate(nd.getUTCDate() + days);
  return nd;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// The upcoming Saturday–Sunday window ("weekend picks"). From a Friday this is
// tomorrow; on a Sunday it rolls to the following weekend.
function weekendRange(now: Date): { start: Date; endExclusive: Date } {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const toSaturday = day === 6 ? 0 : day === 0 ? 6 : 6 - day;
  const saturday = addDays(d, toSaturday);
  return { start: saturday, endExclusive: addDays(saturday, 2) };
}

function formatAU(d: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return d;
  }
}

// Builds a caption hashtag line from the state and the event types on show.
function buildHashtags(events: { event_type?: string | null }[], label: string | null): string {
  const skip = new Set(["Other", "General", "Event", "Events", "Misc", "Miscellaneous"]);
  const tags = new Set<string>(["SoulFlow", "ConsciousEvents", "WellnessAustralia", "MindBodySpirit"]);
  if (label) tags.add(`${label.replace(/[^A-Za-z]/g, "")}Events`);
  for (const ev of events) {
    const t = (ev.event_type || "").replace(/[^A-Za-z]/g, "");
    if (t && !skip.has(t)) tags.add(t);
  }
  return [...tags].slice(0, 12).map((t) => `#${t}`).join(" ");
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

  try {
    const body = await req.json().catch(() => ({}));
    const rawState = (body?.state as string | undefined)?.toUpperCase();
    const scope = body?.window === "weekend" ? "weekend" : "week";
    // Weekend picks are always national — ignore any state passed alongside.
    const state = scope === "week" && rawState && STATE_NAMES[rawState] ? rawState : null;
    const format = body?.format === "story" ? "story" : "feed";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCHours(0, 0, 0, 0);
    const { start, endExclusive } = scope === "weekend"
      ? weekendRange(now)
      : { start: weekStart, endExclusive: addDays(weekStart, 7) };
    const dateFolder = isoDate(weekStart);
    const baseKind = scope === "weekend" ? "weekend" : state ? `state-${state}` : "weekly";
    const kind = format === "story" ? `${baseKind}-story` : baseKind;

    let query = supabase
      .from("events")
      .select("id,event_name,event_date,event_time,place_name,price,image_url,event_type")
      .eq("approval_status", "approved")
      .eq("is_deleted", false)
      .gte("event_date", isoDate(start))
      .lt("event_date", isoDate(endExclusive))
      .order("event_date", { ascending: true })
      .limit(8);

    if (state) query = query.eq("geographical_state", state);

    const { data: events, error } = await query;
    if (error) {
      console.error("Query error", error);
      return jsonResponse({ error: "Failed to query events" }, 500);
    }

    const selected = (events || []) as EventSlideData[];
    const label = state ? STATE_NAMES[state] : null;
    const title = scope === "weekend"
      ? "Weekend Picks"
      : label
        ? `${label} This Week`
        : "Conscious Events This Week";

    const uploaded: { path: string; publicUrl: string }[] = [];
    const upload = async (path: string, svg: string) => {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Blob([svg], { type: "image/svg+xml" }), {
          contentType: "image/svg+xml",
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (pub?.publicUrl) uploaded.push({ path, publicUrl: pub.publicUrl });
    };

    const displayStart = scope === "weekend" ? start : weekStart;
    const displayEnd = scope === "weekend" ? addDays(start, 1) : addDays(weekStart, 6);
    const coverSvg = await generateCoverSlideSvg(
      displayStart.toISOString(),
      displayEnd.toISOString(),
      selected.length,
      label ?? undefined,
      format,
      scope === "weekend" ? { headline: "This Weekend", subhead: "Conscious Events" } : undefined,
    );

    if (format === "story") {
      // Stories are single-image only. Prefer a rich summary of the week's events
      // (with a "see the feed" nudge — the API can't add link stickers), and fall
      // back to the plain cover when there's nothing on.
      const storySvg =
        selected.length > 0
          ? await generateStorySlideSvg(
              selected,
              label ?? undefined,
              displayStart.toISOString(),
              displayEnd.toISOString(),
              "story",
              scope === "weekend" ? { kicker: "This weekend in", city: "Australia" } : undefined,
            )
          : coverSvg;
      await upload(`${dateFolder}/${kind}/slide-01-story.svg`, storySvg);
    } else {
      await upload(`${dateFolder}/${kind}/slide-01-cover.svg`, coverSvg);
      // Index slide (slide 2): a numbered overview of every event, so viewers
      // can see the whole lineup up-front and swipe straight to the one they want.
      if (selected.length > 0) {
        const indexSvg = await generateIndexSlideSvg(selected);
        await upload(`${dateFolder}/${kind}/slide-02-index.svg`, indexSvg);
      }

      let n = 3;
      for (const ev of selected) {
        let svg: string;
        try {
          svg = await generateEventSlideSvg(ev);
        } catch (imgErr) {
          console.error("Event slide image failed, retrying without", imgErr);
          svg = await generateEventSlideSvg({ ...ev, image_url: null });
        }
        await upload(`${dateFolder}/${kind}/slide-${String(n).padStart(2, "0")}.svg`, svg);
        n++;
      }
    }

    const heading = scope === "weekend"
      ? "☀️ Plans this weekend? Here's what's on 🌿"
      : label
        ? `📍 ${label} — what's on this week 🌿`
        : "🌿 Conscious events across Australia this week";
    const lines = [heading, ""];
    for (const ev of selected) {
      const d = formatAU(ev.event_date);
      const where = ev.place_name ? ` · ${ev.place_name}` : "";
      lines.push(`• ${ev.event_name || "Event"}${d ? ` — ${d}` : ""}${where}`);
    }
    if (selected.length === 0) lines.push("• No approved upcoming events in the next 7 days.");
    lines.push("", "Tap the link in our bio to see every event, and save this post so you don't forget.");
    lines.push("", buildHashtags(selected, label));
    const caption = lines.join("\n");

    const { data: batchRow, error: batchError } = await supabase
      .from("ig_slide_batches")
      .upsert(
        { kind, title, week_start: dateFolder, caption, slides: uploaded, event_count: selected.length },
        { onConflict: "kind,week_start" },
      )
      .select("id")
      .single();

    if (batchError) {
      console.error("Failed to record batch", batchError);
      return jsonResponse({ error: "Failed to record batch" }, 500);
    }

    return jsonResponse({
      ok: true,
      kind,
      title,
      weekStart: dateFolder,
      eventCount: selected.length,
      slides: uploaded,
      caption,
      batchId: batchRow?.id,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: String(e) }, 500);
  }
});