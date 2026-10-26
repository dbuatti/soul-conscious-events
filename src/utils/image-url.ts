/**
 * Cover images scraped from social platforms are traps: Instagram hands back a
 * signed CDN URL (`?oe=…` is an expiry timestamp) which goes 403 within days,
 * and the HTML-escaped form (`&amp;`) breaks it immediately. So anything that
 * isn't already in our own bucket gets copied into it before we store it.
 */

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&#x2F;': '/',
  '&apos;': "'",
};

export const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(?:amp|quot|#39|#x2F|apos);/g, (match) => ENTITIES[match] ?? match);

const STORAGE_IMAGE_PATH = '/storage/v1/object/public/event-images/';

/** True when the URL is remote and therefore worth re-hosting. */
export const isRemoteImageUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return !trimmed.includes(STORAGE_IMAGE_PATH);
};

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Copies a remote image into the `event-images` bucket and returns its public
 * URL. Returns the original URL untouched if anything goes wrong (blocked
 * fetch, oversized file, unauthenticated) so submission never fails over a
 * cover image.
 */
export const rehostImageToStorage = async (
  url: string | null | undefined,
  upload: (data: Blob, fileName: string) => Promise<string | null>,
): Promise<string | null> => {
  if (!url || !isRemoteImageUrl(url)) return url ?? null;

  const source = decodeHtmlEntities(url.trim());

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(source, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return url;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') || blob.size === 0 || blob.size > MAX_IMAGE_BYTES) return url;

    const extension = EXTENSION_BY_TYPE[blob.type] ?? 'jpg';
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const uploadedUrl = await upload(blob, fileName);

    return uploadedUrl ?? url;
  } catch {
    return url;
  }
};
