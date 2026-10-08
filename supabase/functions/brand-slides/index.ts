// supabase/functions/brand-slides/index.ts
//
// Generates the evergreen "welcome / who we are" Instagram carousel: a cover
// plus a handful of intro slides. Same mechanism as weekly-ig-slides -- SVG in
// the public ig-weekly-slides bucket, a row in ig_slide_batches with
// kind='brand', and the admin panel rasterises to PNG for posting.
//
// Re-run any time; it reuses today's date so a rebuild replaces today's set.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/auth.ts";
import {
  generateBrandCoverSvg,
  generateBrandTextSlideSvg,
  type BrandSlide,
} from "../_shared/ig-slide-template.tsx";

const BUCKET = "ig-weekly-slides";

const BRAND_SLIDES: BrandSlide[] = [
  {
    kicker: "Who we are",
    title: "A home for conscious living",
    body: [
      "SoulFlow is a community-driven guide to conscious and wellness events across Australia.",
      "We gather the retreats, circles and workshops usually scattered across the internet into one calm, searchable place.",
    ],
  },
  {
    kicker: "What we're about",
    title: "Connection over noise",
    body: [
      "Wellbeing should feel welcoming, not overwhelming.",
      "Thoughtfully curated events, honest details, and a space that honours every kind of journey.",
    ],
  },
  {
    kicker: "What we do",
    title: "Find your next gathering",
    body: [
      "• Search events by type, date and location",
      "• Explore a growing map of conscious gatherings",
      "• Save favourites and plan your week",
      "• Organisers list an event in minutes",
    ],
  },
  {
    kicker: "How it works",
    title: "Browse. Feel it. Show up.",
    body: [
      "Every listing is human-reviewed, so what you see is real.",
      "Find your next practice on the map or calendar, then tap through to book.",
    ],
  },
  {
    kicker: "Join us",
    title: "Find your people",
    body: [
      "New events land every week.",
      "Follow along to discover what's on near you — the link is in our bio.",
    ],
  },
];

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const dateFolder = new Date().toISOString().slice(0, 10);
    const slides: { path: string; publicUrl: string }[] = [];

    const upload = async (path: string, svg: string) => {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Blob([svg], { type: "image/svg+xml" }), {
          contentType: "image/svg+xml",
          upsert: true,
        });
      if (error) throw error;
      slides.push({ path, publicUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
    };

    await upload(`${dateFolder}/brand-01-cover.svg`, await generateBrandCoverSvg());

    const total = BRAND_SLIDES.length;
    for (let i = 0; i < total; i++) {
      const svg = await generateBrandTextSlideSvg(BRAND_SLIDES[i], i + 2, total + 1);
      await upload(`${dateFolder}/brand-${String(i + 2).padStart(2, "0")}.svg`, svg);
    }

    const caption = [
      "Welcome to SoulFlow — Australia's home for conscious & wellness events.",
      "",
      "We bring retreats, yoga, breathwork, sound healing and community gatherings into one calm, searchable place.",
      "",
      "Every listing is human-reviewed. Find your next practice at the link in our bio.",
    ].join("\n");

    const { error: batchError } = await supabase
      .from("ig_slide_batches")
      .upsert(
        {
          kind: "brand",
          week_start: dateFolder,
          caption,
          slides,
          event_count: 0,
        },
        { onConflict: "kind,week_start" },
      );

    if (batchError) {
      console.error("Failed to record batch", batchError);
      return jsonResponse({ error: "Failed to record batch" }, 500);
    }

    return jsonResponse({ ok: true, weekStart: dateFolder, slides, caption });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: String(e) }, 500);
  }
});