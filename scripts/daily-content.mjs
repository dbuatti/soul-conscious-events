// scripts/daily-content.mjs
//
// The SoulFlow content calendar. Runs once a day (08:00 Australia/Sydney) and
// posts whatever is scheduled for that day:
//
//   Monday     national "this week" carousel + Story
//   Tue–Sat    one state carousel + Story each day (from STATES)
//   Sunday     one evergreen brand carousel (themes rotate weekly)
//
// Generation happens in the Edge Functions (weekly-ig-slides / brand-slides,
// SVG output); this script rasterises each SVG to JPEG with sharp, uploads the
// JPEGs to the public bucket and asks publish-instagram to post them.
//
// Env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (required)
//   FORCE=1        bypass the "is it 08:00 Sydney?" check (for testing)
//   DRY_RUN=1      generate + rasterise but do not publish
//   SKIP_FEED=1    don't post the feed carousel
//   SKIP_STORY=1   don't post the Story
//   DAY=Mon        override the day being processed (for testing)
//   STATES=...     comma-separated states (default "VIC,QLD,SA,TAS,NSW")
//   THEME=quote    override the brand theme posted on Sunday
//
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "ig-weekly-slides";
const TZ = "Australia/Sydney";
const FORCE = process.env.FORCE === "1";
const DRY_RUN = process.env.DRY_RUN === "1";
const SKIP_FEED = process.env.SKIP_FEED === "1";
const SKIP_STORY = process.env.SKIP_STORY === "1";
const DAY_OVERRIDE = (process.env.DAY || "").trim();
const THEME_OVERRIDE = (process.env.THEME || "").trim();
const STATES = (process.env.STATES || "VIC,QLD,SA,TAS,NSW")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

// Which state goes out on which day. Monday is the national carousel.
const STATE_BY_DAY = { Tue: 0, Wed: 1, Thu: 2, Fri: 3, Sat: 4 };
const BRAND_THEMES = ["intro", "organisers", "locations", "meet-organiser", "values", "quote", "tips"];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const log = (...a) => console.log("[daily-content]", ...a);

function sydneyNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: TZ,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { weekday: parts.weekday, hour: Number(parts.hour), minute: Number(parts.minute) };
}

// Week index used to rotate brand themes so each week gets the next one.
function weekIndex() {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

async function invoke(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) throw new Error(json?.error || `${fn} returned ${res.status}`);
  return json;
}

async function rasteriseAndUpload(batch) {
  const urls = [];
  const height = batch.kind.endsWith("-story") ? 1920 : 1350;
  for (let i = 0; i < batch.slides.length; i++) {
    const res = await fetch(batch.slides[i].publicUrl);
    if (!res.ok) throw new Error(`Could not fetch slide (${res.status})`);
    const svg = Buffer.from(await res.arrayBuffer());
    const jpeg = await sharp(svg, { density: 144 })
      .resize(1080, height, { fit: "cover" })
      .jpeg({ quality: 92 })
      .toBuffer();
    const path = `${batch.weekStart}/${batch.kind}/publish/slide-${String(i + 1).padStart(2, "0")}.jpg`;
    if (!DRY_RUN) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
    }
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

async function publish(batch, { story = false } = {}) {
  const urls = await rasteriseAndUpload(batch);
  if (DRY_RUN) {
    log(`  (dry run) would post ${urls.length} ${story ? "story" : "feed"} image(s)`);
    return null;
  }
  const result = await invoke("publish-instagram", {
    imageUrls: urls,
    caption: batch.caption,
    batchId: batch.batchId,
    story,
  });
  return result.mediaId;
}

async function postEventWeek(state, label) {
  const title = label || "National";
  const feed = await invoke("weekly-ig-slides", state ? { state } : {});
  if (!feed.eventCount) {
    log(`  ${title}: no events this week, skipping.`);
    return;
  }
  if (!SKIP_FEED) {
    const mediaId = await publish(feed);
    log(`  ${title}: feed (${feed.eventCount} events)${mediaId ? ` -> ${mediaId}` : ""}`);
  }
  if (!SKIP_STORY) {
    const story = await invoke("weekly-ig-slides", state ? { state, format: "story" } : { format: "story" });
    if (story.slides?.length) {
      const mediaId = await publish(story, { story: true });
      log(`  ${title}: story${mediaId ? ` -> ${mediaId}` : ""}`);
    }
  }
}

async function postBrand(theme) {
  const brand = await invoke("brand-slides", { theme });
  if (!brand.slides?.length) {
    log(`  brand ${theme}: nothing generated, skipping.`);
    return;
  }
  const mediaId = await publish(brand);
  log(`  brand ${theme}: feed${mediaId ? ` -> ${mediaId}` : ""}`);
}

async function run() {
  const now = sydneyNow();
  const weekday = DAY_OVERRIDE || now.weekday;
  const inWindow = now.hour === 8 && now.minute < 45;
  if (!FORCE && !inWindow) {
    log(`Outside the daily window (Sydney: ${now.weekday} ${now.hour}:${String(now.minute).padStart(2, "0")}). Nothing to do.`);
    return 0;
  }

  log(`Processing ${weekday}${DRY_RUN ? " (dry run)" : ""}${DAY_OVERRIDE ? " (day override)" : ""}`);
  let failures = 0;
  try {
    if (weekday === "Sun") {
      const theme = THEME_OVERRIDE || BRAND_THEMES[weekIndex() % BRAND_THEMES.length];
      await postBrand(theme);
    } else if (weekday === "Mon") {
      await postEventWeek(null, null);
    } else if (weekday in STATE_BY_DAY) {
      const state = STATES[STATE_BY_DAY[weekday]];
      if (!state) {
        log(`  no state configured for ${weekday}, skipping.`);
      } else {
        await postEventWeek(state, state);
      }
    } else {
      log(`  ${weekday}: nothing scheduled.`);
    }
  } catch (e) {
    failures++;
    log(`FAILED - ${e.message}`);
  }
  return failures;
}

run()
  .then((failures) => process.exit(failures ? 1 : 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
