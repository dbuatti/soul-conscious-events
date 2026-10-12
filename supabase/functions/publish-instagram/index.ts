// supabase/functions/publish-instagram/index.ts
//
// Publishes a carousel (or single image) to Instagram via the Meta Graph API.
// Called by the admin panel ("Post to Instagram") and by the automation
// workflow.
//
// Requires two secrets on the project:
//   META_IG_USER_ID    -- the Instagram professional account id
//   META_ACCESS_TOKEN  -- a long-lived token with content-publish permission
//
// Optional third secret:
//   META_GRAPH_BASE    -- override the API host. Leave unset for the Facebook
//                         Login path (graph.facebook.com, IG linked to a Page).
//                         Set to "https://graph.instagram.com/v26.0" for the
//                         Instagram Login path (no Facebook Page required).
//
// Accepted input forms:
//   JSON  { imageUrls: string[], caption?: string, batchId?: string }
//   JSON  { images: string[] /* data:image/jpeg;base64,... */, caption, batchId }
//
// When `images` (data URLs) are supplied, the function uploads them to the
// public bucket using the service role, so the browser never needs storage
// permissions. Instagram requires publicly reachable JPEG/PNG URLs.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/auth.ts";

const GRAPH = Deno.env.get("META_GRAPH_BASE") ?? "https://graph.facebook.com/v26.0";
const BUCKET = "ig-weekly-slides";

interface BatchRow {
  caption?: string;
  week_start?: string;
  kind?: string;
  slides?: { publicUrl: string }[];
  collaborators?: string | null;
}

// Instagram allows up to 3 collaborators. Accepts an array or a comma/space
// separated string and normalises to bare handles (no leading @).
function normalizeCollaborators(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : typeof value === "string" ? value : "";
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim().replace(/^@/, ""))
    .filter(Boolean)
    .slice(0, 3);
}

// Loads the batch for its caption/folder/collaborators. Tolerates the
// collaborators column not existing yet (migration 0015 may be unapplied).
async function loadBatch(
  admin: SupabaseClient,
  batchId: string,
): Promise<BatchRow | null> {
  const withCollab = await admin
    .from("ig_slide_batches")
    .select("caption,week_start,kind,slides,collaborators")
    .eq("id", batchId)
    .maybeSingle();
  if (!withCollab.error) return (withCollab.data ?? null) as BatchRow | null;
  const base = await admin
    .from("ig_slide_batches")
    .select("caption,week_start,kind,slides")
    .eq("id", batchId)
    .maybeSingle();
  return (base.data ?? null) as BatchRow | null;
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
  const isService = Boolean(serviceKey && token === serviceKey);
  if (!isService) {
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

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { persistSession: false },
  });

  let batchId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    batchId = body?.batchId;
    let imageUrls: string[] = Array.isArray(body?.imageUrls) ? body.imageUrls : [];
    let caption: string = body?.caption ?? "";
    const inlineImages: string[] = Array.isArray(body?.images) ? body.images : [];
    const isStory = body?.story === true;

    // Resolve the batch up-front for its caption, storage folder and any
    // default collaborators.
    let batch: BatchRow | null = null;
    if (batchId) {
      batch = await loadBatch(admin, batchId);
    }

    // Feed posts can be co-authored (Instagram Collab); Stories cannot.
    const collaborators = normalizeCollaborators(body?.collaborators ?? batch?.collaborators);

    // Upload any inline (base64 data URL) images using the service role, so the
    // browser never needs storage write access.
    if (inlineImages.length > 0) {
      const folder = batch?.week_start && batch?.kind
        ? `${batch.week_start}/${batch.kind}/publish`
        : `${new Date().toISOString().slice(0, 10)}/manual`;
      for (let i = 0; i < inlineImages.length; i++) {
        const match = /^data:([^;]+);base64,(.*)$/s.exec(inlineImages[i]);
        if (!match) throw new Error("Invalid image data");
        const [, mime, b64] = match;
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
        const path = `${folder}/slide-${String(i + 1).padStart(2, "0")}.jpg`;
        const { error } = await admin.storage
          .from("ig-weekly-slides")
          .upload(path, bytes, { contentType: mime || "image/jpeg", upsert: true });
        if (error) throw error;
        imageUrls.push(admin.storage.from("ig-weekly-slides").getPublicUrl(path).data.publicUrl);
      }
    }

    // Fall back to the batch's own slides (only works when they are already
    // raster images).
    if (imageUrls.length === 0 && batch?.slides) {
      imageUrls = batch.slides.map((s) => s.publicUrl);
    }
    if (!caption && batch?.caption) caption = batch.caption;

    if (imageUrls.length === 0) return jsonResponse({ error: "No images to publish" }, 400);
    if (!isStory && imageUrls.length > 10) return jsonResponse({ error: "Instagram allows at most 10 carousel slides" }, 400);

    const mediaId = isStory
      ? await publishStory(igUserId, accessToken, imageUrls)
      : imageUrls.length === 1
        ? await publishSingle(igUserId, accessToken, imageUrls[0], caption, collaborators)
        : await publishCarousel(igUserId, accessToken, imageUrls, caption, collaborators);

    if (batchId) {
      await admin
        .from("ig_slide_batches")
        .update({ status: "posted", posted_at: new Date().toISOString(), instagram_media_id: mediaId, error: null })
        .eq("id", batchId);
    }

    return jsonResponse({ ok: true, mediaId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (batchId) {
      await admin.from("ig_slide_batches").update({ status: "failed", error: message }).eq("id", batchId);
    }
    console.error("publish-instagram error:", message);
    return jsonResponse({ error: message }, 502);
  }
});

async function graph(path: string, params: Record<string, string>, token: string): Promise<{ id: string }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    body: new URLSearchParams({ ...params, access_token: token }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message || `Graph API error (${res.status})`);
  }
  return json as { id: string };
}

// Instagram builds each media container asynchronously. Publishing before a
// container reaches FINISHED causes "Media ID is not available" / "Media in
// creation", so poll status_code first.
async function containerStatus(containerId: string, token: string): Promise<string> {
  const res = await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`);
  const json = await res.json().catch(() => ({}));
  if (json?.error) throw new Error(json.error.message);
  return (json?.status_code as string) ?? "UNKNOWN";
}

async function waitForContainer(containerId: string, token: string, timeoutMs = 60000) {
  const start = Date.now();
  for (;;) {
    const status = await containerStatus(containerId, token);
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Instagram could not process the media (container ${status.toLowerCase()})`);
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for Instagram to process the media (last status: ${status})`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function publishSingle(igUserId: string, token: string, imageUrl: string, caption: string, collaborators: string[] = []) {
  const params: Record<string, string> = { image_url: imageUrl, caption };
  if (collaborators.length) params.collaborators = collaborators.join(",");
  const container = await graph(`${igUserId}/media`, params, token);
  await waitForContainer(container.id, token);
  return (await graph(`${igUserId}/media_publish`, { creation_id: container.id }, token)).id;
}

async function publishCarousel(igUserId: string, token: string, imageUrls: string[], caption: string, collaborators: string[] = []) {
  const children: string[] = [];
  for (const url of imageUrls) {
    const child = await graph(`${igUserId}/media`, { image_url: url, is_carousel_item: "true" }, token);
    children.push(child.id);
  }
  for (const childId of children) {
    await waitForContainer(childId, token);
  }
  const parentParams: Record<string, string> = { media_type: "CAROUSEL", children: children.join(","), caption };
  if (collaborators.length) parentParams.collaborators = collaborators.join(",");
  const parent = await graph(`${igUserId}/media`, parentParams, token);
  await waitForContainer(parent.id, token);
  return (await graph(`${igUserId}/media_publish`, { creation_id: parent.id }, token)).id;
}

// Stories accept a single image each (no carousels, no captions), so we publish
// every supplied image as its own story and return the last media id.
async function publishStory(igUserId: string, token: string, imageUrls: string[]) {
  let last = "";
  for (const url of imageUrls) {
    const container = await graph(`${igUserId}/media`, { media_type: "STORIES", image_url: url }, token);
    await waitForContainer(container.id, token);
    last = (await graph(`${igUserId}/media_publish`, { creation_id: container.id }, token)).id;
  }
  return last;
}

export { publishSingle, publishCarousel, publishStory, graph };