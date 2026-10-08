// scripts/instagram-automation.mjs
//
// Full automation: finds slide batches that are due to publish, rasterises
// their SVGs to JPEG (Node has no Edge memory limit, so sharp does this for
// free), uploads the JPEGs to the public bucket, and asks the
// publish-instagram Edge Function to post them.
//
// Env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (required)
//   DRY_RUN=1                                 (optional: log only, no posting)
//   BATCH_ID=<uuid>                           (optional: force one batch)
//
// Scheduled batches: status='scheduled' AND scheduled_for <= now.

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'ig-weekly-slides';
const DRY_RUN = process.env.DRY_RUN === '1';
const ONLY_BATCH = process.env.BATCH_ID;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function log(...args) {
  console.log('[instagram-automation]', ...args);
}

async function fetchDueBatchIds() {
  if (ONLY_BATCH) return [ONLY_BATCH];
  const { data, error } = await supabase
    .from('ig_slide_batches')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

async function rasteriseAndUpload(batch) {
  const urls = [];
  for (let i = 0; i < batch.slides.length; i++) {
    const slide = batch.slides[i];
    const res = await fetch(slide.publicUrl);
    if (!res.ok) throw new Error(`Could not fetch ${slide.publicUrl} (${res.status})`);
    const svg = Buffer.from(await res.arrayBuffer());
    const jpeg = await sharp(svg, { density: 144 })
      .resize(1080, 1350, { fit: 'cover' })
      .jpeg({ quality: 92 })
      .toBuffer();

    const path = `${batch.week_start}/${batch.kind}/publish/slide-${String(i + 1).padStart(2, '0')}.jpg`;
    if (DRY_RUN) {
      log(`  (dry-run) would upload ${path} (${jpeg.length} bytes)`);
    } else {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
    }
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

async function publish(batch, imageUrls) {
  if (DRY_RUN) {
    log(`  (dry-run) would publish ${imageUrls.length} images to Instagram`);
    return null;
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/publish-instagram`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrls, caption: batch.caption, batchId: batch.id }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) throw new Error(json?.error || `publish-instagram failed (${res.status})`);
  return json.mediaId;
}

async function run() {
  const ids = await fetchDueBatchIds();
  log(`${ids.length} batch(es) due${DRY_RUN ? ' (dry run)' : ''}`);
  let ok = 0;
  let failed = 0;

  for (const id of ids) {
    const { data: batch, error } = await supabase
      .from('ig_slide_batches')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !batch) {
      log(`skip ${id}: ${error?.message || 'not found'}`);
      continue;
    }
    log(`processing "${batch.title || batch.kind}" (${batch.slides.length} slides)`);
    try {
      const urls = await rasteriseAndUpload(batch);
      const mediaId = await publish(batch, urls);
      if (!DRY_RUN) {
        await supabase
          .from('ig_slide_batches')
          .update({ status: 'posted', posted_at: new Date().toISOString(), instagram_media_id: mediaId, error: null })
          .eq('id', id);
      }
      log(`  posted ${mediaId ?? '(dry-run)'}`);
      ok++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log(`  failed: ${message}`);
      if (!DRY_RUN) {
        await supabase.from('ig_slide_batches').update({ status: 'failed', error: message }).eq('id', id);
      }
      failed++;
    }
  }

  log(`done: ${ok} posted, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});