// supabase/functions/brand-slides/index.ts
//
// Generates evergreen Instagram carousels (no event data needed): intro
// "who we are", "list your event" for organisers, a "near you" set, plus
// "meet the organiser", "our values", "quote" and "tips" sets. Same mechanism
// as weekly-ig-slides -- SVG in the public ig-weekly-slides bucket, a row in
// ig_slide_batches with kind brand-<theme>, and the admin panel rasterises to
// PNG for posting.
//
// Body: { theme?: string, format?: "feed" | "story" }
// Story format renders 1080x1920 and stores kind brand-<theme>-story.
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

// Appended to every brand caption so posts are discoverable.
const BRAND_HASHTAGS =
  "#SoulFlow #ConsciousEvents #WellnessAustralia #MindBodySpirit #Yoga #Breathwork #SoundHealing #Meditation #Retreats #SelfCare";

interface Theme {
  cover: [string, string, string];
  slides: BrandSlide[];
  caption: string;
}

const THEMES: Record<string, Theme> = {
  intro: {
    cover: ["Welcome", "SoulFlow", "Australia's home for conscious & wellness events"],
    slides: [
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
          "We believe wellbeing should feel welcoming, not overwhelming.",
          "Thoughtfully curated events, honest details, and a space that honours every kind of journey.",
        ],
      },
      {
        kicker: "What we do",
        title: "Everything in one place",
        body: [
          "• Discover events by type, date and location",
          "• Explore a growing map of conscious gatherings",
          "• Save favourites and plan your week",
          "• Organisers share events in minutes",
        ],
      },
      {
        kicker: "Our promise",
        title: "Real, reviewed, welcoming",
        body: [
          "Every listing is human-reviewed, so what you see is real.",
          "No noise, no clutter — just the good stuff, close to home.",
        ],
      },
      {
        kicker: "Join us",
        title: "Find your people",
        body: [
          "New events land every week.",
          "Tap the link in our bio to start exploring — we'll see you out there.",
        ],
      },
    ],
    caption:
      "Welcome to SoulFlow.\n\nWe're a community-driven guide to conscious and wellness events across Australia — yoga, breathwork, sound healing, retreats and gatherings, all in one calm place.\n\nEvery listing is human-reviewed. Tap the link in our bio to find your next practice.",
  },

  organisers: {
    cover: ["For organisers", "List your event", "Reach the people who'll love it"],
    slides: [
      {
        kicker: "Why SoulFlow",
        title: "A warm, ready audience",
        body: [
          "SoulFlow is where conscious-curious Australians come looking for their next experience.",
          "Put your event in front of people already searching for exactly what you offer.",
        ],
      },
      {
        kicker: "Free to list",
        title: "Submit in minutes",
        body: [
          "Add your details, a link, and a date — that's it.",
          "Our simple form walks you through everything in under five minutes.",
        ],
      },
      {
        kicker: "Human reviewed",
        title: "Quality you can trust",
        body: [
          "Every submission is reviewed before it goes live.",
          "That keeps SoulFlow a place people trust — and your event in good company.",
        ],
      },
      {
        kicker: "Get started",
        title: "Add your event today",
        body: [
          "Head to SoulFlow and tap 'Submit an event'.",
          "Questions? Reach us any time — we're happy to help you get set up.",
        ],
      },
    ],
    caption:
      "Calling all organisers.\n\nSoulFlow is where conscious-curious Australians look for their next experience — and listing your event is free.\n\nAdd your details in minutes, get reviewed by a human, and reach an audience already searching for what you offer. Tap the link in our bio to list your event.",
  },

  locations: {
    cover: ["Near you", "Find us across Australia", "Conscious events, coast to coast"],
    slides: [
      {
        kicker: "Where we are",
        title: "Coast to coast",
        body: [
          "Sydney · Melbourne · Brisbane",
          "Perth · Adelaide · Hobart",
          "Canberra · Darwin · and beyond",
        ],
      },
      {
        kicker: "More than cities",
        title: "Gatherings everywhere",
        body: [
          "Regional retreats, online circles and everything in between.",
          "Filter by location to find what's happening near you.",
        ],
      },
      {
        kicker: "Get started",
        title: "Find your next practice",
        body: [
          "Open the map or the calendar on SoulFlow.",
          "Your next class, retreat or circle is closer than you think — link in bio.",
        ],
      },
    ],
    caption:
      "Wherever you are in Australia, there's a SoulFlow event nearby.\n\nFrom Sydney to Perth, regional retreats to online circles — open the map on SoulFlow and find your next practice. Link in bio.",
  },

  "meet-organiser": {
    cover: ["Meet the organiser", "The people behind the events", "Passionate souls, real gatherings"],
    slides: [
      {
        kicker: "Who they are",
        title: "Guides, not gurus",
        body: [
          "Our organisers are facilitators, teachers and healers who live what they share.",
          "From yoga teachers to sound healers, each brings years of real practice.",
        ],
      },
      {
        kicker: "Why they host",
        title: "Built on service",
        body: [
          "They create space for people to slow down, connect and heal.",
          "Every event is an invitation — never a hard sell.",
        ],
      },
      {
        kicker: "The community",
        title: "You're part of it",
        body: [
          "When you attend, you're not a number — you're welcomed into a circle.",
          "Come as you are; leave a little lighter.",
        ],
      },
      {
        kicker: "Discover",
        title: "Meet them this week",
        body: [
          "Browse upcoming events and find the guide who speaks to you.",
          "New organisers join every week — link in bio.",
        ],
      },
    ],
    caption:
      "Meet the humans behind the events.\n\nSoulFlow organisers are facilitators, teachers and healers who live what they share — hosting spaces to slow down, connect and heal. Browse upcoming events and find the guide who speaks to you. Link in bio.",
  },

  values: {
    cover: ["Our values", "How we hold space", "Honest, warm, unhurried"],
    slides: [
      {
        kicker: "Honesty",
        title: "No hype, no noise",
        body: [
          "Every event is reviewed by a real person before it's listed.",
          "What you see is what you get.",
        ],
      },
      {
        kicker: "Warmth",
        title: "Everyone belongs",
        body: [
          "Conscious living is for every body, every background, every beginning.",
          "There's no gatekeeping here.",
        ],
      },
      {
        kicker: "Care",
        title: "Wellbeing first",
        body: [
          "We champion events that respect your time, energy and safety.",
          "Quality over quantity, always.",
        ],
      },
      {
        kicker: "Community",
        title: "Stronger together",
        body: [
          "We exist to connect seekers with the people who hold space for them.",
          "Growth that lifts everyone.",
        ],
      },
    ],
    caption:
      "This is how we do things at SoulFlow.\n\nHonest listings, a warm welcome for every body, and a real commitment to wellbeing. No hype, no noise — just good events, close to home. Link in bio.",
  },

  quote: {
    cover: ["Just a moment", "Words to come back to", "Take what you need"],
    slides: [
      {
        kicker: "Breathe",
        title: "Almost everything will work again if you unplug it — including you.",
        body: ["— Anne Lamott"],
      },
      {
        kicker: "Begin",
        title: "You do not have to be good. You only have to let the soft animal of your body love what it loves.",
        body: ["— Mary Oliver"],
      },
      {
        kicker: "Slow down",
        title: "Nature does not hurry, yet everything is accomplished.",
        body: ["— Lao Tzu"],
      },
      {
        kicker: "Come home",
        title: "Within you, there is a stillness and a sanctuary to which you can retreat at any time.",
        body: ["— Hermann Hesse"],
      },
    ],
    caption:
      "A little reminder, just for today.\n\nSave this for when you need it and share it with someone who does too. Link in bio to find your next moment of calm.",
  },

  tips: {
    cover: ["New here?", "5 gentle ways to start", "Conscious events, made simple"],
    slides: [
      {
        kicker: "Start small",
        title: "One event is enough",
        body: [
          "Pick a single class, circle or retreat this month.",
          "Consistency beats intensity every time.",
        ],
      },
      {
        kicker: "Follow the pull",
        title: "Trust what draws you",
        body: [
          "Yoga, breathwork, sound, cacao — notice what you're curious about.",
          "Curiosity is a compass.",
        ],
      },
      {
        kicker: "Come as you are",
        title: "No experience needed",
        body: [
          "You don't need to be flexible, calm or 'good at it'.",
          "Beginners are not just welcome — they're the point.",
        ],
      },
      {
        kicker: "Bring someone",
        title: "It's better shared",
        body: [
          "Invite a friend, a partner or a neighbour.",
          "Shared moments land deeper.",
        ],
      },
      {
        kicker: "Keep going",
        title: "Let it be simple",
        body: [
          "Find what feels good, then do a little more of it.",
          "Tap the link in our bio to see what's on near you.",
        ],
      },
    ],
    caption:
      "New to conscious events? Start here.\n\nFive gentle ways to dip a toe in — from picking your first class to bringing a friend along. Tap the link in our bio to find what's on near you.",
  },
};

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
    const themeKey = (body?.theme as string) || "intro";
    const theme = THEMES[themeKey];
    if (!theme) {
      return jsonResponse({ error: `Unknown theme '${themeKey}'` }, 400);
    }
    const format = body?.format === "story" ? "story" : "feed";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const dateFolder = new Date().toISOString().slice(0, 10);
    const kind = format === "story" ? `brand-${themeKey}-story` : `brand-${themeKey}`;
    const caption = `${theme.caption}\n\n${BRAND_HASHTAGS}`;
    const uploaded: { path: string; publicUrl: string }[] = [];

    const upload = async (path: string, svg: string) => {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Blob([svg], { type: "image/svg+xml" }), {
          contentType: "image/svg+xml",
          upsert: true,
        });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (pub?.publicUrl) uploaded.push({ path, publicUrl: pub.publicUrl });
    };

    const [eyebrow, coverTitle, subtitle] = theme.cover;
    await upload(
      `${dateFolder}/${kind}/brand-01-cover.svg`,
      await generateBrandCoverSvg(eyebrow, coverTitle, subtitle, format),
    );

    let n = 2;
    for (const slide of theme.slides) {
      const svg = await generateBrandTextSlideSvg(slide, n, theme.slides.length + 1, format);
      const label = String(n).padStart(2, "0");
      await upload(`${dateFolder}/${kind}/brand-${label}.svg`, svg);
      n++;
    }

    const { error: batchError } = await supabase
      .from("ig_slide_batches")
      .upsert(
        {
          kind,
          title: `${coverTitle}${format === "story" ? " (Story)" : ""}`,
          week_start: dateFolder,
          caption,
          slides: uploaded,
          event_count: 0,
        },
        { onConflict: "kind,week_start" },
      );

    if (batchError) {
      console.error("Failed to record batch", batchError);
      return jsonResponse({ error: "Failed to record batch" }, 500);
    }

    return jsonResponse({ ok: true, kind, title: coverTitle, format, theme, weekStart: dateFolder, slides: uploaded, caption });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: String(e) }, 500);
  }
});