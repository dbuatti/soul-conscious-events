/** @jsxImportSource https://esm.sh/react@18.2.0 */
import satori from "https://esm.sh/satori@0.10.13";
import { Inter_Regular, Inter_SemiBold, Inter_Bold, Inter_ExtraBold } from "./fonts.ts";

export interface EventSlideData {
  id: string;
  event_name: string | null;
  event_date: string | null; // ISO
  event_time: string | null;
  place_name: string | null;
  venue_name?: string | null;
  price: string | null;
  image_url: string | null;
  event_type: string | null;
}

export interface BrandSlide {
  kicker: string | null;
  title: string;
  body: string[];
}

const BRAND_BG = "#F8F1EA"; // warm sand
const BRAND_PRIMARY = "#B34629"; // terracotta
const BRAND_TEXT = "#1C1C1C";
const BRAND_SUBTEXT = "#4B3B2B";
const ACCENT = "#D9B75B";

const WIDTH = 1080;
const HEIGHT = 1350;

// Transparent SoulFlow mark, served from the public slides bucket. Kept as a URL
// (like event images) so we don't bloat the function bundle with base64.
const LOGO_URL =
  "https://tbyjdhxpbfvqsrzzdjwi.supabase.co/storage/v1/object/public/ig-weekly-slides/2026-10-07/logo-trans.png";

function logoBadge({ top = 56, left = 72, size = 56 }: { top?: number; left?: number; size?: number }) {
  return (
    <img
      src={LOGO_URL}
      width={size}
      height={size}
      style={{ position: "absolute", top, left, objectFit: "contain" }}
    />
  );
}

export type SlideFormat = "feed" | "story";
const DIMS: Record<SlideFormat, { width: number; height: number }> = {
  feed: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

type FontWeight = 400 | 600 | 700 | 800;

interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: "normal";
}

// Satori renders the layout to SVG. Rasterising to PNG happens in the browser
// (the admin panel), because resvg's WASM rasteriser exceeds the Edge runtime's
// 256MB / 2s CPU budget. Keeping this function SVG-only avoids the 546
// WORKER_RESOURCE_LIMIT error entirely.
let fontsPromise: Promise<SatoriFont[]> | null = null;

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64.split(",")[1] || b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const loadFonts = (): Promise<SatoriFont[]> => {
  fontsPromise ??= Promise.resolve([
    { name: "Inter", data: b64ToArrayBuffer(Inter_Regular), weight: 400 as FontWeight, style: "normal" as const },
    { name: "Inter", data: b64ToArrayBuffer(Inter_SemiBold), weight: 600 as FontWeight, style: "normal" as const },
    { name: "Inter", data: b64ToArrayBuffer(Inter_Bold), weight: 700 as FontWeight, style: "normal" as const },
    { name: "Inter", data: b64ToArrayBuffer(Inter_ExtraBold), weight: 800 as FontWeight, style: "normal" as const },
  ]);
  return fontsPromise;
};

function formatDate(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(t?: string | null) {
  if (!t) return "";
  return t;
}

const baseStyle = (format: SlideFormat = "feed"): Record<string, unknown> => {
  const { width, height } = DIMS[format];
  return {
    display: "flex",
    flexDirection: "column",
    width,
    height,
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    position: "relative",
  };
};

export async function generateCoverSlideSvg(
  weekStartISO: string,
  weekEndISO: string,
  count: number,
  location?: string,
  format: SlideFormat = "feed",
  opts?: { eyebrow?: string; headline?: string; subhead?: string },
): Promise<string> {
  const fonts = await loadFonts();
  const eyebrow = opts?.eyebrow ?? "SoulFlow";
  const headline = opts?.headline ?? location ?? "This Week";
  const subhead = opts?.subhead ?? (location ? "This Week" : "Conscious Events");
  return await satori(
    <div
      style={{
        ...baseStyle(format),
        justifyContent: "center",
        alignItems: "center",
        background: `linear-gradient(135deg, ${BRAND_BG} 0%, #FFFFFF 100%)`,
      }}
    >
      {logoBadge({ top: format === "story" ? 88 : 72, left: format === "story" ? 88 : 72, size: format === "story" ? 132 : 88 })}
      <div style={{ position: "absolute", top: 80, right: 80, width: 120, height: 120, borderRadius: 60, background: ACCENT, opacity: 0.35 }} />
      <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: 6, color: BRAND_PRIMARY, margin: 0, textTransform: "uppercase" }}>
        {eyebrow}
      </p>
      <h1 style={{ fontSize: location ? 76 : 92, fontWeight: 800, color: BRAND_TEXT, margin: "24px 0 0 0", textAlign: "center" }}>
        {headline}
      </h1>
      <h2 style={{ fontSize: 36, fontWeight: 600, color: BRAND_SUBTEXT, marginTop: 16, marginBottom: 8, textAlign: "center" }}>
        {subhead}
      </h2>
      <p style={{ fontSize: 30, color: BRAND_SUBTEXT, margin: "32px 0 0 0", textAlign: "center" }}>
        {formatDate(weekStartISO)} – {formatDate(weekEndISO)}
      </p>
      <p style={{ fontSize: 26, fontWeight: 600, color: BRAND_PRIMARY, margin: "16px 0 0 0" }}>
        {count} event{count === 1 ? "" : "s"}
      </p>
      <p style={{ position: "absolute", bottom: 80, fontSize: 24, color: BRAND_SUBTEXT, opacity: 0.8, margin: 0 }}>
        Link in bio
      </p>
    </div>,
    { width: DIMS[format].width, height: DIMS[format].height, fonts },
  );
}

export async function generateStorySlideSvg(
  events: EventSlideData[],
  label: string | undefined,
  weekStartISO: string,
  weekEndISO: string,
  format: SlideFormat = "story",
  opts?: { kicker?: string; city?: string },
): Promise<string> {
  const fonts = await loadFonts();
  const { width, height } = DIMS[format];
  const city = opts?.city ?? (label || "Australia");
  const kicker = opts?.kicker ?? "This week in";
  const shown = events.slice(0, 6);
  const extra = Math.max(0, events.length - shown.length);
  return await satori(
    <div style={{ ...baseStyle(format), background: BRAND_BG, padding: "210px 90px 210px 90px" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width, height: 10, background: BRAND_PRIMARY }} />
      {logoBadge({ top: 80, left: 90, size: 128 })}
      <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: 5, color: BRAND_PRIMARY, margin: 0, textTransform: "uppercase" }}>
        {kicker}
      </p>
      <h1 style={{ fontSize: 96, fontWeight: 800, color: BRAND_TEXT, margin: "8px 0 0 0", lineHeight: 1.02 }}>
        {city}
      </h1>
      <p style={{ fontSize: 34, fontWeight: 600, color: BRAND_SUBTEXT, margin: "18px 0 0 0" }}>
        {formatDate(weekStartISO)} – {formatDate(weekEndISO)}
      </p>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 52 }}>
        {shown.map((ev, i) => (
          <div
            key={ev.id}
            style={{
              display: "flex",
              alignItems: "center",
              background: "#FFFFFF",
              borderRadius: 20,
              border: "1px solid rgba(75,59,43,0.12)",
              padding: "20px 24px",
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 28,
                background: BRAND_PRIMARY,
                color: "#FFFFFF",
                fontSize: 28,
                fontWeight: 800,
                marginRight: 22,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <div style={{ display: "flex", flexDirection: "column", width: 760 }}>
              <p style={{ fontSize: 38, fontWeight: 700, color: BRAND_TEXT, margin: 0, lineHeight: 1.15 }}>
                {ev.event_name || "Event"}
              </p>
              <p style={{ fontSize: 28, color: BRAND_SUBTEXT, margin: "6px 0 0 0" }}>
                {[formatDate(ev.event_date), ev.place_name].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        ))}
      </div>
      {extra > 0 ? (
        <p style={{ fontSize: 30, fontWeight: 600, color: BRAND_PRIMARY, margin: 0 }}>+{extra} more on our feed</p>
      ) : null}
      <div
        style={{
          position: "absolute",
          bottom: 96,
          left: 90,
          right: 90,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <p style={{ fontSize: 38, fontWeight: 800, color: BRAND_TEXT, margin: 0, textAlign: "center" }}>
          Full lineup &amp; links on our feed →
        </p>
        <p style={{ fontSize: 30, color: BRAND_SUBTEXT, margin: "12px 0 0 0" }}>Link in bio</p>
      </div>
    </div>,
    { width, height, fonts },
  );
}

export async function generateIndexSlideSvg(
  events: EventSlideData[],
  format: SlideFormat = "feed",
): Promise<string> {
  const fonts = await loadFonts();
  const { width, height } = DIMS[format];
  const padX = 80;
  const gap = 24;
  const cols = 2;
  const cardW = Math.floor((width - padX * 2 - gap * (cols - 1)) / cols);

  return await satori(
    <div style={{ ...baseStyle(format), background: BRAND_BG, padding: "120px 80px 72px 80px" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width, height: 8, background: BRAND_PRIMARY }} />
      {logoBadge({ top: 52, left: 72, size: 64 })}
      <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: 5, color: BRAND_PRIMARY, margin: 0, textTransform: "uppercase" }}>
        What's on
      </p>
      <h2 style={{ fontSize: 64, fontWeight: 800, color: BRAND_TEXT, margin: "14px 0 40px 0" }}>
        Inside this carousel
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap }}>
        {events.map((ev, i) => (
          <div
            key={ev.id}
            style={{
              display: "flex",
              flexDirection: "column",
              width: cardW,
              height: 196,
              background: "#FFFFFF",
              borderRadius: 18,
              border: "1px solid rgba(75,59,43,0.12)",
              padding: 22,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  background: BRAND_PRIMARY,
                  color: "#FFFFFF",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {i + 3}
              </span>
              <span style={{ fontSize: 20, fontWeight: 600, color: BRAND_PRIMARY }}>{formatDate(ev.event_date)}</span>
            </div>
            <p style={{ fontSize: 27, fontWeight: 700, color: BRAND_TEXT, margin: "14px 0 0 0", lineHeight: 1.2 }}>
              {ev.event_name || "Event"}
            </p>
            {ev.place_name ? (
              <p style={{ fontSize: 19, color: BRAND_SUBTEXT, margin: "8px 0 0 0" }}>{ev.place_name}</p>
            ) : null}
          </div>
        ))}
      </div>
      <p style={{ position: "absolute", bottom: 40, fontSize: 22, color: BRAND_SUBTEXT, opacity: 0.75, margin: 0 }}>
        Swipe for details →
      </p>
    </div>,
    { width, height, fonts },
  );
}

export async function generateEventSlideSvg(ev: EventSlideData): Promise<string> {
  const fonts = await loadFonts();
  const metaParts = [formatDate(ev.event_date), formatTime(ev.event_time)].filter(Boolean).join(" · ");
  const venue = ev.place_name || ev.venue_name || "";

  return await satori(
    <div style={{ ...baseStyle(), background: BRAND_BG }}>
      {ev.image_url ? (
        <img
          src={ev.image_url}
          width={WIDTH}
          height={HEIGHT}
          style={{ position: "absolute", top: 0, left: 0, width: WIDTH, height: HEIGHT, objectFit: "cover" }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: WIDTH,
          height: HEIGHT,
          background:
            "linear-gradient(180deg, rgba(248,241,234,0.97) 0%, rgba(248,241,234,0.84) 28%, rgba(248,241,234,0.84) 60%, rgba(248,241,234,0.99) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 0, left: 0, width: WIDTH, height: 8, background: BRAND_PRIMARY }} />
      {logoBadge({ top: 56, left: 72, size: 64 })}
      <div style={{ display: "flex", flexDirection: "column", padding: "96px 80px", flexGrow: 1, justifyContent: "center" }}>
        <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: BRAND_PRIMARY, margin: 0, textTransform: "uppercase" }}>
          {ev.event_type || "Wellness & Conscious Events"}
        </p>
        <h1 style={{ fontSize: 76, fontWeight: 800, color: BRAND_TEXT, margin: "28px 0 0 0", lineHeight: 1.1 }}>
          {ev.event_name || "Event"}
        </h1>
        {metaParts ? (
          <p style={{ fontSize: 34, fontWeight: 600, color: BRAND_SUBTEXT, margin: "36px 0 0 0" }}>{metaParts}</p>
        ) : null}
        {venue ? <p style={{ fontSize: 30, color: BRAND_SUBTEXT, margin: "18px 0 0 0", lineHeight: 1.5 }}>{venue}</p> : null}
        {ev.price ? <p style={{ fontSize: 30, fontWeight: 600, color: BRAND_PRIMARY, margin: "18px 0 0 0" }}>{ev.price}</p> : null}
      </div>
      <div style={{ position: "absolute", bottom: 72, left: 80, right: 80, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22, color: BRAND_SUBTEXT, opacity: 0.8 }}>SoulFlow</span>
        <span style={{ fontSize: 22, color: BRAND_SUBTEXT, opacity: 0.8 }}>Link in bio</span>
      </div>
    </div>,
    { width: WIDTH, height: HEIGHT, fonts },
  );
}

export async function generateBrandCoverSvg(
  eyebrow = "Welcome",
  title = "SoulFlow",
  subtitle = "Australia's home for conscious & wellness events",
  format: SlideFormat = "feed",
): Promise<string> {
  const fonts = await loadFonts();
  const { width, height } = DIMS[format];
  const s = format === "story" ? 1.15 : 1;
  return await satori(
    <div
      style={{
        ...baseStyle(format),
        justifyContent: "center",
        alignItems: "center",
        background: `linear-gradient(160deg, ${BRAND_BG} 0%, #FFFFFF 100%)`,
      }}
    >
      {logoBadge({ top: format === "story" ? 88 : 72, left: format === "story" ? 88 : 72, size: format === "story" ? 132 : 88 })}
      <div style={{ position: "absolute", bottom: 120, right: 90, width: 180, height: 180, borderRadius: 90, background: ACCENT, opacity: 0.3 }} />
      <p style={{ fontSize: 26 * s, fontWeight: 700, letterSpacing: 8, color: BRAND_PRIMARY, margin: 0, textTransform: "uppercase" }}>
        {eyebrow}
      </p>
      <h1 style={{ fontSize: (title.length > 14 ? 84 : 120) * s, fontWeight: 800, color: BRAND_TEXT, margin: "28px 0 0 0", textAlign: "center", maxWidth: width - 160 }}>
        {title}
      </h1>
      <p style={{ fontSize: 38 * s, fontWeight: 600, color: BRAND_SUBTEXT, margin: "24px 0 0 0", textAlign: "center", maxWidth: 840 }}>
        {subtitle}
      </p>
      <p style={{ position: "absolute", bottom: 96, fontSize: 24 * s, color: BRAND_SUBTEXT, opacity: 0.8, margin: 0 }}>
        Swipe to learn more →
      </p>
    </div>,
    { width, height, fonts },
  );
}

export async function generateBrandTextSlideSvg(
  slide: BrandSlide,
  index: number,
  total: number,
  format: SlideFormat = "feed",
): Promise<string> {
  const fonts = await loadFonts();
  const { width, height } = DIMS[format];
  const s = format === "story" ? 1.15 : 1;
  return await satori(
    <div style={{ ...baseStyle(format), background: BRAND_BG, padding: `${format === "story" ? 180 : 110}px 90px`, justifyContent: "space-between" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width, height: 8, background: BRAND_PRIMARY }} />
      {logoBadge({ top: 52, left: 72, size: format === "story" ? 104 : 64 })}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {slide.kicker ? (
          <p style={{ fontSize: 26 * s, fontWeight: 700, letterSpacing: 5, color: BRAND_PRIMARY, margin: 0, textTransform: "uppercase" }}>
            {slide.kicker}
          </p>
        ) : null}
        <h2 style={{ fontSize: 80 * s, fontWeight: 800, color: BRAND_TEXT, margin: "24px 0 0 0", lineHeight: 1.05 }}>
          {slide.title}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
          {slide.body.map((line) => (
            <p key={line} style={{ fontSize: 36 * s, color: BRAND_SUBTEXT, margin: "0 0 24px 0", lineHeight: 1.45 }}>
              {line}
            </p>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 22 * s, color: BRAND_SUBTEXT, opacity: 0.7 }}>SoulFlow</span>
        <span style={{ fontSize: 22 * s, color: BRAND_SUBTEXT, opacity: 0.7 }}>
          {index} / {total}
        </span>
      </div>
    </div>,
    { width, height, fonts },
  );
}