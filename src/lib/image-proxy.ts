/**
 * Responsive image proxying.
 *
 * Event images come from arbitrary external URLs (Eventbrite, venue sites…)
 * at full resolution — often 2000px+ JPEGs served to a 350px phone card.
 * We route them through wsrv.nl (free, no key), which resizes, recompresses
 * and serves WebP on the fly. If the proxy is unreachable, ResilientImage
 * falls back to the original URL, then to the placeholder.
 */

const PROXY_ENDPOINT = 'https://wsrv.nl/';

/** Candidate widths for srcset. The browser picks per its DPR + layout size. */
export const RESPONSIVE_WIDTHS = [400, 800, 1200];

const isProxyable = (src: string): boolean => /^https?:\/\//i.test(src);

/** A single resized + compressed variant of `src` at the given width. */
export const proxyImageUrl = (src: string, width: number): string => {
  if (!isProxyable(src)) return src;
  return `${PROXY_ENDPOINT}?url=${encodeURIComponent(src)}&w=${width}&q=75&output=webp`;
};

/** A `srcset` string of responsive variants, or undefined for non-http(s) sources. */
export const buildSrcSet = (
  src: string,
  widths: number[] = RESPONSIVE_WIDTHS
): string | undefined => {
  if (!isProxyable(src)) return undefined;
  return widths.map((w) => `${proxyImageUrl(src, w)} ${w}w`).join(', ');
};