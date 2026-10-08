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
// Input: { imageUrls: string[], caption: string, batchId?: string }
// The imageUrls must be publicly reachable JPEG/PNG (the caller uploads them;
// SVGs are not accepted by Instagram).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/auth.ts";

const GRAPH = Deno.env.get("META_GRAPH_BASE") ?? "https://graph.facebook.com/v26.0";

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

  const supabase = isService
    ? createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } })
    : null;

  let batchId: string | undefined;
  try {
    const body = await req.json();
    batchId = body?.batchId;
    let imageUrls: string[] = Array.isArray(body?.imageUrls) ? body.imageUrls : [];
    let caption: string = body?.caption ?? "";

    // If a batchId is given without imageUrls, fall back to the batch's own
    // slides (only works when they are already raster images).
    if (batchId && imageUrls.length === 0 && supabase) {
      const { data: batch } = await supabase
        .from("ig_slide_batches")
        .select("caption,slides")
        .eq("id", batchId)
        .maybeSingle();
      if (!batch) return jsonResponse({ error: "Batch not found" }, 404);
      imageUrls = (batch.slides as { publicUrl: string }[]).map((s) => s.publicUrl);
      caption = caption || batch.caption;
    }

    if (imageUrls.length === 0) return jsonResponse({ error: "No images to publish" }, 400);
    if (imageUrls.length > 10) return jsonResponse({ error: "Instagram allows at most 10 carousel slides" }, 400);

    const mediaId = imageUrls.length === 1
      ? await publishSingle(igUserId, accessToken, imageUrls[0], caption)
      : await publishCarousel(igUserId, accessToken, imageUrls, caption);

    if (batchId && supabase) {
      await supabase
        .from("ig_slide_batches")
        .update({ status: "posted", posted_at: new Date().toISOString(), instagram_media_id: mediaId, error: null })
        .eq("id", batchId);
    }

    return jsonResponse({ ok: true, mediaId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (batchId && supabase) {
      await supabase.from("ig_slide_batches").update({ status: "failed", error: message }).eq("id", batchId);
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

async function publishSingle(igUserId: string, token: string, imageUrl: string, caption: string) {
  const container = await graph(`${igUserId}/media`, { image_url: imageUrl, caption }, token);
  return (await graph(`${igUserId}/media_publish`, { creation_id: container.id }, token)).id;
}

async function publishCarousel(igUserId: string, token: string, imageUrls: string[], caption: string) {
  const children: string[] = [];
  for (const url of imageUrls) {
    const child = await graph(`${igUserId}/media`, { image_url: url, is_carousel_item: "true" }, token);
    children.push(child.id);
  }
  const parent = await graph(
    `${igUserId}/media`,
    { media_type: "CAROUSEL", children: children.join(","), caption },
    token,
  );
  return (await graph(`${igUserId}/media_publish`, { creation_id: parent.id }, token)).id;
}

export { publishSingle, publishCarousel, graph };