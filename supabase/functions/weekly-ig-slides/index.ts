// supabase/functions/weekly-ig-slides/index.ts
//
// Builds the week's Instagram carousel: a cover slide plus one slide per
// approved event in the next seven days. Slides are rendered as SVG and stored
// in the public ig-weekly-slides bucket, and a row is written to ig_slide_batches
// so the admin panel can show the carousel and caption. The admin panel
// rasterises each SVG to a 1080x1350 PNG in the browser for posting.
//
// SVG (not PNG) is deliberate: resvg's WASM rasteriser exceeds the Edge
// runtime's 256MB / 2s budget and caused a 546 WORKER_RESOURCE_LIMIT. Satori's
// SVG output is cheap, and the browser rasterises natively for free.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/auth.ts";
import {
  generateCoverSlideSvg,
  generateEventSlideSvg,
  type EventSlideData,
} from "../_shared/ig-slide-template.tsx";

const BUCKET = "ig-weekly-slides";

function addDays(d: Date, days: number) {
  const nd = new Date(d);
  nd.setUTCDate(nd.getUTCDate() + days);
  return nd;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // This runs with the service-role key, so it is not public. The scheduled
  // action calls it with that key; anyone else must be an admin.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!(serviceKey && token === serviceKey)) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = addDays(weekStart, 7);

    const { data: events, error } = await supabase
      .from("events")
      .select(
        // No venue_name: the events table has place_name, and selecting a column
        // that does not exist makes PostgREST fail the whole query.
        "id,event_name,event_date,event_time,place_name,price,image_url,event_type"
      )
      .eq("approval_status", "approved")
      .eq("is_deleted", false)
      .gte("event_date", isoDate(weekStart))
      .lt("event_date", isoDate(weekEnd))
      .order("event_date", { ascending: true })
      .limit(9);

    if (error) {
      console.error("Query error", error);
      return jsonResponse({ error: "Failed to query events" }, 500);
    }

    const selected = (events || []) as EventSlideData[];
    const weekStartISO = weekStart.toISOString();
    const weekEndISO = addDays(weekStart, 6).toISOString();

    const uploaded: { path: string; publicUrl: string }[] = [];
    const dateFolder = isoDate(weekStart);

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

const coverSvg = await generateCoverSlideSvg(
      weekStart.toISOString(),
      addDays(weekStart, 6).toISOString(),
      selected.length,
    );
    await upload(`${weekStartISO}/slide-01-cover.svg`, coverSvg);

    let n = 2;
    for (const ev of selected) {
      let svg: string;
      try {
        svg = await generateEventSlideSvg(ev);
      } catch (imgErr) {
        // A broken/unreachable image URL makes satori throw; retry without it.
        console.error("Event slide image failed, retrying without", imgErr);
        svg = await generateEventSlideSvg({ ...ev, image_url: null });
      }
      const label = String(n).padStart(2, "0");
      await upload(`${weekStartISO}/slide-${label}.svg`, svg);
      n++;
    }

    const lines = ["Soul Conscious Events this week:"];
    for (const ev of selected) {
      const d = formatAU(ev.event_date);
      const name = ev.event_name || "Event";
      lines.push(`• ${name}${d ? ` – ${d}` : ""}`);
    }
    if (selected.length === 0) {
      lines.push("• No approved upcoming events in the next 7 days.");
    }
    lines.push("");
    lines.push("Link in bio.");
    const caption = lines.join("\n");

    const { error: batchError } = await supabase
      .from("ig_slide_batches")
      .upsert(
        {
          kind: "weekly",
          week_start: weekStartISO,
          caption,
          slides: uploaded,
          event_count: selected.length,
        },
        { onConflict: "kind,week_start" },
      );

    if (batchError) {
      console.error("Failed to record batch", batchError);
      return jsonResponse({ error: "Failed to record batch" }, 500);
    }

    return jsonResponse({
      ok: true,
      weekStart: weekStartISO,
      eventCount: selected.length,
      slides: uploaded,
      caption,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: String(e) }, 500);
  }
});