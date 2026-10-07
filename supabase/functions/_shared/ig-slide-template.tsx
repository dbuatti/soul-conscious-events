// supabase/functions/_shared/ig-slide-template.tsx
import React from "https://esm.sh/react@18.2.0";
import satori from "https://esm.sh/satori@0.10.13";
import { Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

export interface EventSlideData {
  id: string;
  event_name: string | null;
  event_date: string | null; // ISO
  event_time: string | null;
  place_name: string | null;
  venue_name: string | null;
  price: string | null;
  image_url: string | null;
  event_type: string | null;
}

const BRAND_BG = "#F8F1EA"; // warm sand
const BRAND_PRIMARY = "#B34629"; // terracotta
const BRAND_TEXT = "#1C1C1C";
const BRAND_SUBTEXT = "#4B3B2B";
const ACCENT = "#D9B75B";

function formatDate(d?: string | null) {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function formatTime(t?: string | null) {
  if (!t) return "";
  return t;
}

export async function generateCoverSlide(
  weekStartISO: string,
  weekEndISO: string,
  count: number
): Promise<Uint8Array> {
  const svg = await satori(
    <div
      style={{
        width: 1080,
        height: 1350,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: `linear-gradient(135deg, ${BRAND_BG} 0%, #FFFFFF 100%)`,
        position: "relative",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          width: 160,
          height: 6,
          background: BRAND_PRIMARY,
          borderRadius: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 80,
          width: 80,
          height: 80,
          borderRadius: 40,
          background: `${ACCENT}33`,
        }}
      />
      <h1
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: BRAND_TEXT,
          margin: 0,
          letterSpacing: "-0.02em",
        }}
      >
        SoulFlow
      </h1>
      <h2
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: BRAND_PRIMARY,
          marginTop: 16,
          marginBottom: 48,
        }}
      >
        Conscious Events This Week
      </h2>
      <p
        style={{
          fontSize: 28,
          color: BRAND_SUBTEXT,
          margin: 0,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        {formatDate(weekStartISO)} – {formatDate(weekEndISO)}
      </p>
      <p
        style={{
          fontSize: 24,
          color: BRAND_SUBTEXT,
          marginTop: 12,
          margin: 0,
        }}
      >
        {count} event{count === 1 ? "" : "s"}
      </p>
      <p
        style={{
          position: "absolute",
          bottom: 80,
          fontSize: 22,
          color: BRAND_SUBTEXT,
          margin: 0,
          opacity: 0.8,
        }}
      >
        Link in bio
      </p>
    </div>,
    {
      width: 1080,
      height: 1350,
      fonts: [
        {
          name: "Inter",
          data: await fetch("https://rsms.me/inter/font-files/Inter-Regular.woff").then((r) => r.arrayBuffer()),
          weight: 400,
          style: "normal",
        },
        {
          name: "Inter",
          data: await fetch("https://rsms.me/inter/font-files/Inter-SemiBold.woff").then((r) => r.arrayBuffer()),
          weight: 600,
          style: "normal",
        },
        {
          name: "Inter",
          data: await fetch("https://rsms.me/inter/font-files/Inter-Bold.woff").then((r) => r.arrayBuffer()),
          weight: 700,
          style: "normal",
        },
        {
          name: "Inter",
          data: await fetch("https://rsms.me/inter/font-files/Inter-ExtraBold.woff").then((r) => r.arrayBuffer()),
          weight: 800,
          style: "normal",
        },
      ],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } });
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function generateEventSlide(ev: EventSlideData): Promise<Uint8Array> {
  const venue = ev.place_name || ev.venue_name || "";
  const dateStr = formatDate(ev.event_date);
  const timeStr = formatTime(ev.event_time);
  const metaParts = [dateStr, timeStr].filter(Boolean).join(" · ");
  const price = ev.price || "";

  const svg = await satori(
    <div
      style={{
        width: 1080,
        height: 1350,
        display: "flex",
        flexDirection: "column",
        background: BRAND_BG,
        position: "relative",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: "hidden",
      }}
    >
      {ev.image_url ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${ev.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.18,
            filter: "saturate(0.9)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(248,241,234,0.92) 0%, ${BRAND_BG} 100%)`,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "48px 72px 0 72px",
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, background: BRAND_PRIMARY }} />
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: BRAND_PRIMARY,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          SoulFlow
        </span>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          padding: "0 72px",
          gap: 28,
        }}
      >
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: BRAND_TEXT,
            margin: 0,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
          }}
        >
          {ev.event_name || "Conscious Event"}
        </h1>
        {metaParts ? (
          <p style={{ fontSize: 30, fontWeight: 600, color: BRAND_SUBTEXT, margin: 0 }}>{metaParts}</p>
        ) : null}
        {venue ? (
          <p style={{ fontSize: 26, color: BRAND_SUBTEXT, margin: 0, lineHeight: 1.5 }}>{venue}</p>
        ) : null}
        {price ? (
          <p style={{ fontSize: 26, fontWeight: 600, color: BRAND_PRIMARY, margin: 0 }}>{price}</p>
        ) : null}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 72px 56px 72px",
        }}
      >
        <span style={{ fontSize: 20, color: BRAND_SUBTEXT, opacity: 0.8 }}>
          {ev.event_type ? ev.event_type : "Wellness & Conscious Events"}
        </span>
        <span style={{ fontSize: 20, color: BRAND_SUBTEXT, opacity: 0.8 }}>Link in bio</span>
      </div>
    </div>,
    {
      width: 1080,
      height: 1350,
      fonts: [
        {
          name: "Inter",
          data: await fetch("https://rsms.me/inter/font-files/Inter-Regular.woff").then((r) => r.arrayBuffer()),
          weight: 400,
          style: "normal",
        },
        {
          name: "Inter",
          data: await fetch("https://rsms.me/inter/font-files/Inter-SemiBold.woff").then((r) => r.arrayBuffer()),
          weight: 600,
          style: "normal",
        },
        {
          name: "Inter",
          data: await fetch("https://rsms.me/inter/font-files/Inter-Bold.woff").then((r) => r.arrayBuffer()),
          weight: 700,
          style: "normal",
        },
        {
          name: "Inter",
          data: await fetch("https://rsms.me/inter/font-files/Inter-ExtraBold.woff").then((r) => r.arrayBuffer()),
          weight: 800,
          style: "normal",
        },
      ],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } });
  const pngData = resvg.render();
  return pngData.asPng();
}
