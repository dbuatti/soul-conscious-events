// supabase/functions/weekly-ig-slides/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/auth.ts";
import {
  generateCoverSlide,
  generateEventSlide,
  type EventSlideData,
} from "../_shared/ig-slide-template.tsx";

const BUCKET = "ig-weekly-slides";

interface EmailAttachment {
  content: string;
  filename: string;
  type: string;
}

function base64FromUint8Array(data: Uint8Array): string {
  let binary = "";
  const bytes = new Uint8Array(data);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments: EmailAttachment[]
) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.log("RESEND_API_KEY not set; skipping email send");
    return { sent: false, reason: "no_key" as const };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SoulFlow <noreply@soulflow.events>",
        to: [to],
        subject,
        html,
        text,
        attachments,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Resend error:", res.status, body);
      return { sent: false, reason: "resend_error" as const, status: res.status };
    }
    const json = await res.json();
    return { sent: true, id: json.id };
  } catch (e) {
    console.error("Email send failed", e);
    return { sent: false, reason: "exception" as const };
  }
}

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

  // This runs with the service-role key and sends email, so it is not public.
  // The scheduled action calls it with that key; anyone else must be an admin.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!(serviceKey && token === serviceKey)) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const toEmail = Deno.env.get("SLIDES_EMAIL_TO") || "daniele.buatti@gmail.com";

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

    const cover = await generateCoverSlide(weekStartISO, weekEndISO, selected.length);
    const eventSlides: Uint8Array<ArrayBuffer>[] = [];
    for (const ev of selected) {
      eventSlides.push(await generateEventSlide(ev));
    }

    const uploaded: { path: string; publicUrl: string }[] = [];
    const dateFolder = isoDate(weekStart);
    const attachments: EmailAttachment[] = [];

    const coverPath = `${dateFolder}/slide-01-cover.png`;
    const coverBlob = new Blob([cover], { type: "image/png" });
    await supabase.storage.from(BUCKET).upload(coverPath, coverBlob, {
      contentType: "image/png",
      upsert: true,
    });
    const { data: coverPub } = supabase.storage.from(BUCKET).getPublicUrl(coverPath);
    if (coverPub?.publicUrl) {
      uploaded.push({ path: coverPath, publicUrl: coverPub.publicUrl });
    }
    attachments.push({
      content: base64FromUint8Array(cover),
      filename: coverPath.split("/").pop() || "slide-01-cover.png",
      type: "image/png",
    });

    for (let i = 0; i < eventSlides.length; i++) {
      const path = `${dateFolder}/slide-${String(i + 2).padStart(2, "0")}-event.png`;
      const blob = new Blob([eventSlides[i]], { type: "image/png" });
      await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: "image/png",
        upsert: true,
      });
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (pub?.publicUrl) {
        uploaded.push({ path, publicUrl: pub.publicUrl });
      }
      attachments.push({
        content: base64FromUint8Array(eventSlides[i]),
        filename: path.split("/").pop() || `slide-${i + 2}.png`,
        type: "image/png",
      });
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

    const subject = `SoulFlow weekly slides – ${dateFolder}`;
    const html = `
      <div style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;color:#1C1C1C">
        <h2>SoulFlow – Weekly IG Slides</h2>
        <p>Week starting ${dateFolder}. ${selected.length} event${selected.length===1?"":"s"}.</p>
        <pre style="background:#F8F1EA;padding:16px;border-radius:8px;white-space:pre-wrap">${caption}</pre>
        <h3>Public URLs</h3>
        <ul>
          ${uploaded.map((u) => `<li><a href="${u.publicUrl}">${u.path}</a></li>`).join("")}
        </ul>
      </div>
    `;
    const emailRes = await sendEmail(toEmail, subject, html, caption, attachments);

    return jsonResponse({
      ok: true,
      weekStart: dateFolder,
      eventCount: selected.length,
      slides: uploaded,
      caption,
      email: emailRes,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
