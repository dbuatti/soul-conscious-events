// scripts/weekly-state-carousels.mjs
//
// Every Monday at 08:00 Australia/Sydney, generate and publish one weekly event
// carousel per state. If a state has no events in the coming week it is skipped.
//
// Generation happens in the `weekly-ig-slides` Edge Function (SVG output);
// this script rasterises each SVG to JPEG with sharp, uploads the JPEGs, and
// asks `publish-instagram` to post the carousel.
//
// Env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (required)
//   FORCE=1        bypass the "is it Monday 08:00 Sydney?" check (for testing)
//   DRY_RUN=1      generate + rasterise but do not publish
//   SKIP_FEED=1    don't post the feed carousel (e.g. to test the Story only)
//   SKIP_STORY=1   don't post the Story
//   STATES=VIC,NSW override the state list
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
const STATES = (process.env.STATES || "ACT,NSW,NT,QLD,SA,TAS,VIC,WA")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const log = (...a) => console.log("[weekly-state-carousels]", ...a);

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

async function run() {
  const now = sydneyNow();
  const inWindow = now.weekday === "Mon" && now.hour === 8 && now.minute < 45;
  if (!FORCE && !inWindow) {
    log(`Outside the weekly window (Sydney: ${now.weekday} ${now.hour}:${String(now.minute).padStart(2, "0")}). Nothing to do.`);
    return 0;
  }
  log(`Running weekly state carousels for: ${STATES.join(", ")}${DRY_RUN ? " (dry run)" : ""}`);

  let failures = 0;
  for (const state of STATES) {
    try {
      // Feed carousel.
      if (!SKIP_FEED) {
        const batch = await invoke("weekly-ig-slides", { state });
        if (!batch.eventCount) {
          log(`${state}: no events this week, skipping feed.`);
        } else {
          const urls = await rasteriseAndUpload(batch);
          if (DRY_RUN) {
            log(`${state}: ${batch.eventCount} events -> ${urls.length} feed slides (dry run)`);
          } else {
            const result = await invoke("publish-instagram", {
              imageUrls: urls,
              caption: batch.caption,
              batchId: batch.batchId,
            });
            log(`${state}: posted feed (${batch.eventCount} events) -> media ${result.mediaId}`);
          }
        }
      }

      // Instagram Stories accept a single image only, so the 9:16 cover doubles
      // as an automatic Story for the same week.
      if (!SKIP_STORY) {
        const story = await invoke("weekly-ig-slides", { state, format: "story" });
        if (!story.eventCount) {
          log(`${state}: no events this week, skipping story.`);
        } else if (story.slides?.length) {
          const storyUrls = await rasteriseAndUpload(story);
          if (DRY_RUN) {
            log(`${state}: story slide ready (dry run)`);
          } else {
            const storyResult = await invoke("publish-instagram", {
              imageUrls: storyUrls,
              batchId: story.batchId,
              story: true,
            });
            log(`${state}: posted story -> media ${storyResult.mediaId}`);
          }
        }
      }
    } catch (e) {
      failures++;
      log(`${state}: FAILED - ${e.message}`);
    }
  }
  return failures;
}

run()
  .then((failures) => process.exit(failures ? 1 : 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });