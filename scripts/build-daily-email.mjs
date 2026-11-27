// scripts/build-daily-email.mjs
//
// Builds a populated, review-only HTML email for the SoulFlow Melbourne Daily
// Picks broadcast. Reads .env from the repo root, queries Supabase REST with
// the anon key, picks 5 good upcoming VIC events and writes:
//   docs/daily-email-YYYY-MM-DD.html  (full email, paste into Kit)
//   docs/daily-email-YYYY-MM-DD.md    (short review note)
//
// Prints only a summary. Never prints secrets.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DOCS = resolve(ROOT, "docs");

// --- Load .env (do not print) ---
function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

// --- Melbourne date helpers ---
function melbourneDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(d);
}
function melbourneWeekday(d = new Date()) {
  return new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "long" }).format(d);
}
function formatDateShort(iso) {
  if (!iso) return "";
  const dt = new Date(iso + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

const TODAY = melbourneDate();
const WEEKDAY = melbourneWeekday();

function cleanDashes(s) {
  if (s == null) return s;
  return String(s).replace(/[\u2013\u2014]/g, "-");
}

function escapeHtml(s) {
  if (s == null) return "";
  return cleanDashes(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function oneLine(desc) {
  if (!desc) return "";
  let t = String(desc).replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  // take first sentence if reasonably short
  const m = t.match(/^(.+?[.!?])(\s|$)/);
  if (m && m[1].length <= 160) t = m[1];
  if (t.length > 150) t = t.slice(0, 147).trim() + "...";
  // normalise dashes
  t = t.replace(/[\u2013\u2014]/g, "-");
  return t;
}

function melbourneNiceDate() {
  const d = new Date();
  return d.toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "long", year: "numeric" });
}

async function fetchEvents() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/events`);
  url.searchParams.set("select", "id,event_name,event_date,event_time,place_name,price,description,ticket_link,image_url,event_type,geographical_state,approval_status,is_deleted");
  url.searchParams.set("geographical_state", "eq.VIC");
  url.searchParams.set("approval_status", "eq.approved");
  url.searchParams.set("is_deleted", "eq.false");
  url.searchParams.set("event_date", `gte.${TODAY}`);
  url.searchParams.set("order", "event_date.asc");
  url.searchParams.set("limit", "300");

  const res = await fetch(url.toString(), {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase REST ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function pickFive(events) {
  const candidates = events.filter((e) =>
    e && e.event_name && e.ticket_link && e.description && String(e.description).trim().length > 0
  );
  const selected = [];
  const usedTypes = new Set();
  // First pass: prefer unique event types, soonest first
  for (const e of candidates) {
    if (selected.length >= 5) break;
    const t = (e.event_type || "").trim();
    if (t === "" || !usedTypes.has(t)) {
      selected.push(e);
      if (t) usedTypes.add(t);
    }
  }
  // Second pass: fill remaining with soonest regardless of type
  if (selected.length < 5) {
    const selectedIds = new Set(selected.map((e) => e.id));
    for (const e of candidates) {
      if (selected.length >= 5) break;
      if (selectedIds.has(e.id)) continue;
      selected.push(e);
      selectedIds.add(e.id);
    }
  }
  return selected.slice(0, 5);
}

function renderCard(e) {
  const title = escapeHtml(e.event_name);
  const dateStr = formatDateShort(e.event_date);
  const timeStr = e.event_time ? escapeHtml(e.event_time) : "";
  const when = [dateStr, timeStr].filter(Boolean).join(", ");
  const venue = escapeHtml(e.place_name || "");
  const price = e.price ? escapeHtml(e.price) : "";
  const desc = escapeHtml(oneLine(e.description));
  const ticket = escapeHtml(e.ticket_link);
  const detailUrl = `https://soulflowau.vercel.app/events/${encodeURIComponent(e.id)}`;
  const img = e.image_url ? escapeHtml(e.image_url) : "";

  const imgCell = img
    ? `<td style="width:112px;vertical-align:top;padding:0;">
         <img src="${img}" alt="${title}" width="112" height="112" style="display:block;width:112px;height:112px;object-fit:cover;border-radius:12px 0 0 12px;">
       </td>`
    : "";

  const metaLine = [when, venue].filter(Boolean).join(" · ");
  const priceLine = price ? `<div style="font-size:13px;color:#4B3B2B;margin:0 0 8px 0;">${price}</div>` : "";

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;border:1px solid #E8D9C8;border-radius:12px;overflow:hidden;background-color:#ffffff;">
  <tr>
    ${imgCell}
    <td style="padding:16px;vertical-align:top;">
      <div style="font-size:16px;font-weight:700;color:#1C1C1C;margin:0 0 4px 0;line-height:1.3;">${title}</div>
      <div style="font-size:13px;color:#4B3B2B;margin:0 0 4px 0;">${escapeHtml(metaLine)}</div>
      ${priceLine}
      <div style="font-size:14px;color:#1C1C1C;margin:0 0 12px 0;line-height:1.5;">${desc}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:10px;">
            <a href="${ticket}" style="display:inline-block;background-color:#B34629;color:#F8F1EA;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:700;">Book</a>
          </td>
          <td>
            <a href="${detailUrl}" style="color:#B34629;text-decoration:underline;font-size:13px;font-weight:600;">View on SoulFlow</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

async function main() {
  const events = await fetchEvents();
  const picks = pickFive(events);

  const cardsHtml = picks.map(renderCard).join("\n");
  const contentHtml = `
<div style="font-size:16px;line-height:1.6;color:#1C1C1C;">
  <p style="margin:0 0 16px 0;">Hi there,</p>
  <p style="margin:0 0 20px 0;">Here are five soulful things happening in Melbourne. Full details and booking links below.</p>
  ${cardsHtml}
  <p style="margin:20px 0 0 0;">See you out there.</p>
  <p style="margin:4px 0 0 0;font-weight:700;">SoulFlow</p>
</div>`.trim();

  const templatePath = resolve(DOCS, "kit-email-template.html");
  const template = readFileSync(templatePath, "utf8");
  const populated = template.replace("{{ content }}", contentHtml);

  const dateStr = TODAY; // YYYY-MM-DD
  const htmlPath = resolve(DOCS, `daily-email-${dateStr}.html`);
  const mdPath = resolve(DOCS, `daily-email-${dateStr}.md`);

  writeFileSync(htmlPath, populated, "utf8");

  // Markdown review note
  const mdLines = [];
  mdLines.push(`# SoulFlow Melbourne Daily Picks - ${formatDateShort(dateStr).replace(",", "")} ${new Date(dateStr + "T00:00:00").getFullYear()}`);
  mdLines.push("");
  mdLines.push("**Status:** review draft only. Not sent.");
  mdLines.push("");
  mdLines.push("**From:** SoulFlow <soulconsciousevents@gmail.com>");
  mdLines.push("**Reply-to:** soulconsciousevents@gmail.com");
  mdLines.push("**Mailing address:** SoulFlow, Melbourne, VIC 3000, Australia");
  mdLines.push("");
  mdLines.push("---");
  mdLines.push("");
  mdLines.push("## Subject line");
  mdLines.push("");
  const dayNum = new Date(dateStr + "T00:00:00").getDate();
  const monthShort = new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", { month: "short" });
  mdLines.push(`SoulFlow Melbourne: 5 picks for ${WEEKDAY} ${dayNum} ${monthShort}`);
  mdLines.push("");
  mdLines.push("## Preheader");
  mdLines.push("");
  mdLines.push("Five soulful things to do in Melbourne, with direct booking links.");
  mdLines.push("");
  mdLines.push("## Body");
  mdLines.push("");
  mdLines.push("Hi there,");
  mdLines.push("");
  mdLines.push("Here are five soulful things happening in Melbourne. Full details and booking links below.");
  mdLines.push("");
  picks.forEach((e, i) => {
    const when = [formatDateShort(e.event_date), cleanDashes(e.event_time)].filter(Boolean).join(", ");
    const venue = [cleanDashes(e.place_name), cleanDashes(e.price)].filter(Boolean).join(" - ");
    mdLines.push(`${i + 1}. **${cleanDashes(e.event_name)}** - ${when}`);
    mdLines.push(`   ${venue}`);
    mdLines.push(`   ${oneLine(e.description)}`);
    mdLines.push(`   Book: ${e.ticket_link}`);
    mdLines.push(`   Details: https://soulflowau.vercel.app/events/${e.id}`);
    mdLines.push("");
  });
  mdLines.push("See you out there.");
  mdLines.push("");
  mdLines.push("SoulFlow");
  mdLines.push("");
  mdLines.push("---");
  mdLines.push("");
  mdLines.push(`Full HTML email ready to paste into Kit: docs/daily-email-${dateStr}.html`);
  mdLines.push("");
  mdLines.push("No em dashes used. Reviewed draft only - nothing sent.");

  writeFileSync(mdPath, mdLines.join("\n"), "utf8");

  console.log(`Created ${picks.length} picks for ${dateStr}`);
  console.log(`HTML: docs/daily-email-${dateStr}.html`);
  console.log(`MD:   docs/daily-email-${dateStr}.md`);
  console.log("Picks:");
  for (const e of picks) console.log(`  - ${e.event_name}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
