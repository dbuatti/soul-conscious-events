import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const env = loadEnv(ROOT);

const KIT_API_KEY = env.KIT_API_KEY;
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
if (!KIT_API_KEY) throw new Error('KIT_API_KEY missing in .env');
if (!SUPABASE_URL) throw new Error('SUPABASE_URL missing in .env');

const SITE_URL = 'https://soulflowau.vercel.app';
const STATUS_FILE = path.join(ROOT, 'docs', 'send-status.json');
const SUBSCRIBER_LOG = path.join(ROOT, 'docs', 'subscriber-counts.csv');

// --- Logging helpers ---
function logStatus(status, detail = {}) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({ timestamp: new Date().toISOString(), status, ...detail }, null, 2));
  } catch (e) { /* ignore */ }
}

function logSubscriberCount(count) {
  try {
    const header = 'date,count\n';
    const row = `${new Date().toISOString().slice(0, 10)},${count}\n`;
    if (!fs.existsSync(SUBSCRIBER_LOG)) fs.writeFileSync(SUBSCRIBER_LOG, header);
    fs.appendFileSync(SUBSCRIBER_LOG, row);
  } catch (e) { /* ignore */ }
}

// --- Sync Supabase subscribers to Kit ---
async function syncSubscribers() {
  if (!SUPABASE_SERVICE_KEY) {
    console.log('Skipping subscriber sync (missing service key).');
    return 0;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?select=email`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  if (!res.ok) {
    console.error('Subscriber fetch failed:', res.status, await res.text());
    return 0;
  }
  const rows = await res.json();
  const emails = [...new Set(rows.map(r => (r.email || '').trim().toLowerCase()).filter(Boolean))];
  console.log(`Syncing ${emails.length} subscriber(s) to Kit...`);
  for (const email of emails) {
    const r = await fetch('https://api.kit.com/v4/subscribers', {
      method: 'POST',
      headers: { 'X-Kit-Api-Key': KIT_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: email }),
    });
    if (!r.ok) console.error(`  failed ${email}: ${r.status} ${await r.text()}`);
  }
  logSubscriberCount(emails.length);
  console.log('Subscriber sync done.');
  return emails.length;
}

// --- Fetch upcoming approved VIC events, sorted earliest to latest ---
async function fetchEvents() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  const today = new Date().toISOString().slice(0, 10);
  const url = `${SUPABASE_URL}/rest/v1/events?select=id,event_name,event_date,event_time,location,place_name,description,price,ticket_link,image_url,event_type&approval_status=eq.approved&is_deleted=eq.false&geographical_state=eq.VIC&event_date=gte.${today}&order=event_date.asc,event_time.asc&limit=30`;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Events fetch failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  // Sort by date then time, pick top 5, preferring events with images/descriptions/ticket links.
  const sorted = rows
    .map(e => ({ e, score: (e.image_url ? 2 : 0) + (e.description ? 1 : 0) + (e.ticket_link ? 1 : 0) }))
    .sort((a, b) => {
      const da = new Date(a.e.event_date + 'T' + (a.e.event_time || '00:00'));
      const db = new Date(b.e.event_date + 'T' + (b.e.event_time || '00:00'));
      if (da - db !== 0) return da - db;
      return b.score - a.score;
    });
  return sorted.slice(0, 5).map(s => s.e);
}

// --- Helpers ---
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function cleanPrice(p) {
  const m = String(p).match(/\$?\s*([\d.]+)/);
  if (!m) return p;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return p;
  const rounded = Math.round(n);
  return String(p).includes('$') ? `$${rounded}` : `${rounded}`;
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

function isTomorrow(dateStr) {
  const t = new Date(); t.setDate(t.getDate() + 1);
  return dateStr === t.toISOString().slice(0, 10);
}

function dayLabel(dateStr) {
  if (isToday(dateStr)) return 'Tonight';
  if (isTomorrow(dateStr)) return 'Tomorrow';
  return formatDate(dateStr);
}

function groupLabel(dateStr) {
  if (isToday(dateStr)) return 'Tonight';
  if (isTomorrow(dateStr)) return 'Tomorrow';
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  if (day === 0 || day === 6) return 'This weekend';
  return 'Coming up';
}

function fetchWithRetry(url, options, retries = 3) {
  return (async () => {
    for (let i = 0; i < retries; i++) {
      const r = await fetch(url, options);
      if (r.ok || r.status < 500) return r;
      if (i < retries - 1) await new Promise(x => setTimeout(x, 2000 * (i + 1)));
    }
    return fetch(url, options);
  })();
}

// --- Build rich HTML email ---
function buildHtml(events) {
  // Group events by section (Tonight / Tomorrow / This weekend / Coming up)
  const sections = [];
  let currentSection = null;
  for (const e of events) {
    const sec = groupLabel(e.event_date);
    if (sec !== currentSection) {
      sections.push({ label: sec, events: [e] });
      currentSection = sec;
    } else {
      sections[sections.length - 1].events.push(e);
    }
  }

  const renderCard = (e) => {
    const img = e.image_url
      ? `<img src="${escapeHtml(e.image_url)}" alt="${escapeHtml(e.event_name)}" width="560" class="sf-event-img" style="width:100%;max-width:560px;height:auto;border-radius:12px;display:block;margin:0 0 12px 0;" />`
      : `<div class="sf-event-img" style="width:100%;max-width:560px;height:120px;border-radius:12px;background:linear-gradient(135deg,#fde9e3,#e8c89a);display:flex;align-items:center;justify-content:center;margin:0 0 12px 0;"><span style="font-size:32px;">✨</span></div>`;
    const dateLine = `${dayLabel(e.event_date)}${e.event_time ? ' · ' + escapeHtml(e.event_time) : ''}`;
    const venue = escapeHtml(e.place_name || e.location || '');
    const price = e.price ? escapeHtml(cleanPrice(e.price)) : 'See details';
    const desc = e.description ? escapeHtml(e.description.slice(0, 160)) + (e.description.length > 160 ? '…' : '') : '';
    const bookingUrl = e.ticket_link || `${SITE_URL}/events/${e.id}`;
    const detailsUrl = `${SITE_URL}/events/${e.id}`;
    const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.event_name)}&dates=${e.event_date.replace(/-/g,'')}/${e.event_date.replace(/-/g,'')}&details=${encodeURIComponent((e.description||'').slice(0,200))}&location=${encodeURIComponent(e.place_name || e.location || '')}`;
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sf-card sf-dark-card" style="margin:0 0 20px 0;border:1px solid #e8e1d8;border-radius:16px;overflow:hidden;background:#ffffff;">
  <tr><td class="sf-card-cell" style="padding:16px;">
    ${img}
    ${e.event_type ? `<p style="margin:0 0 6px 0;"><span style="display:inline-block;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#b34629;background:#fde9e3;border-radius:999px;">${escapeHtml(e.event_type)}</span></p>` : ''}
    <h2 style="margin:0 0 6px 0;font-size:20px;font-weight:700;color:#3a3430;line-height:1.2;">${escapeHtml(e.event_name)}</h2>
    <p style="margin:0 0 4px 0;font-size:14px;color:#b34629;font-weight:600;">${dateLine}</p>
    <p style="margin:0 0 4px 0;font-size:13px;color:#8a7f75;">${venue}${price ? ' · ' + price : ''}</p>
    ${desc ? `<p style="margin:8px 0 12px 0;font-size:14px;color:#5a534d;line-height:1.5;">${desc}</p>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 0 0;">
      <tr>
        <td valign="middle" align="center" style="border-radius:999px;background:#b34629;vertical-align:middle;">
          <a href="${escapeHtml(bookingUrl)}" class="sf-btn" style="display:inline-block;padding:10px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;line-height:1.2;text-align:center;vertical-align:middle;">Book now</a>
        </td>
        <td style="width:10px;"></td>
        <td valign="middle" align="center" style="vertical-align:middle;">
          <a href="${escapeHtml(detailsUrl)}" class="sf-btn" style="display:inline-block;padding:10px 18px;font-size:14px;font-weight:600;color:#b34629;text-decoration:none;border:1px solid #b34629;border-radius:999px;line-height:1.2;text-align:center;vertical-align:middle;">Details</a>
        </td>
      </tr>
    </table>
    <p style="margin:6px 0 0 0;font-size:11px;"><a href="${escapeHtml(calUrl)}" style="color:#8a7f75;text-decoration:none;">📅 Add to calendar</a></p>
  </td></tr>
</table>`;
  };

  const sectionBlocks = sections.map(sec => `
    <tr><td style="padding:8px 24px 4px 24px;">
      <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b34629;border-bottom:2px solid #fde9e3;padding-bottom:4px;">${escapeHtml(sec.label)}</p>
    </td></tr>
    <tr><td style="padding:0 24px 8px 24px;">
      ${sec.events.map(renderCard).join('\n')}
    </td></tr>`).join('\n');

  const eventCards = sectionBlocks;

  return `
<style>
  @media only screen and (max-width:600px) {
    .sf-event-img { width:100% !important; height:auto !important; }
    .sf-card { border-radius:12px !important; }
    .sf-card-cell { padding:12px !important; }
    .sf-btn { display:block !important; width:100% !important; text-align:center !important; margin:4px 0 !important; }
  }
  @media (prefers-color-scheme: dark) {
    .sf-dark-bg { background-color:#1c1a18 !important; }
    .sf-dark-card { background-color:#2a2622 !important; border-color:#3a3632 !important; }
    .sf-dark-text { color:#e8e1d8 !important; }
    .sf-dark-muted { color:#a09890 !important; }
    .sf-dark-heading { color:#f5efe6 !important; }
    .sf-dark-accent { color:#e8935a !important; }
  }
</style>
<div class="sf-dark-bg" style="background:#f5efe6;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <img src="${SITE_URL}/social-preview.jpeg" alt="SoulFlow Melbourne" width="600" style="max-width:600px;width:100%;height:auto;display:block;margin:0 auto 0 auto;border-radius:20px 20px 0 0;" />
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;background:#ffffff;border-radius:0 0 20px 20px;overflow:hidden;">
    <tr><td style="padding:0;">
      <div style="background:linear-gradient(135deg,#b34629 0%,#d4833a 50%,#e8c89a 100%);padding:28px 24px 24px 24px;text-align:center;">
        <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#fff7f0;font-weight:700;opacity:0.9;">SoulFlow Melbourne</p>
        <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.15;text-shadow:0 1px 2px rgba(0,0,0,0.15);">Five soulful things to do today</h1>
        <p style="margin:0;font-size:15px;color:#fff7f0;line-height:1.5;opacity:0.95;">Hand-picked conscious events, with direct booking links.</p>
      </div>
    </td></tr>
    <tr><td style="padding:20px 24px 8px 24px;text-align:center;">
      <p style="margin:0 0 20px 0;font-size:14px;color:#8a7f75;line-height:1.5;">No noise, no spam. Just five good things happening in Melbourne.</p>
    </td></tr>
    <tr><td style="padding:0 24px 8px 24px;">
      ${eventCards}
    </td></tr>
    <tr><td style="padding:8px 24px 16px 24px;text-align:center;">
      <a href="${SITE_URL}/melbourne" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;background:#3a3430;text-decoration:none;border-radius:999px;">See all Melbourne events</a>
    </td></tr>
    <tr><td style="padding:0 24px 16px 24px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#8a7f75;">Know someone who'd love this? <a href="mailto:?subject=Five%20soulful%20things%20in%20Melbourne%20today&body=Check%20out%20SoulFlow%3A%20https%3A%2F%2Fsoulflowau.vercel.app%2Fmelbourne" style="color:#b34629;text-decoration:none;font-weight:600;">Forward this email</a></p>
    </td></tr>
    <tr><td style="padding:16px 24px 28px 24px;text-align:center;border-top:1px solid #e8e1d8;">
      <p style="margin:0 0 8px 0;font-size:13px;color:#8a7f75;">Discover more at <a href="${SITE_URL}" style="color:#b34629;text-decoration:none;font-weight:600;">soulflowau.vercel.app</a></p>
      <p style="margin:0 0 8px 0;font-size:12px;color:#8a7f75;">Not your thing? <a href="{{ unsubscribe_url }}" style="color:#b34629;text-decoration:none;font-weight:600;border:1px solid #e8e1d8;padding:6px 14px;border-radius:999px;display:inline-block;margin-top:4px;">Unsubscribe in one click</a></p>
      <p style="margin:0;font-size:11px;color:#b0a89e;">SoulFlow, Melbourne, VIC 3000, Australia</p>
    </td></tr>
  </table>
</div>`;
}

// --- Main ---
async function main() {
  let subscriberCount = 0;
  try {
    subscriberCount = await syncSubscribers();
  } catch (e) {
    console.error('Subscriber sync error:', e);
    logStatus('sync_error', { error: e.message });
  }

  let events;
  try {
    events = await fetchEvents();
  } catch (e) {
    console.error('Events fetch error:', e);
    logStatus('events_error', { error: e.message });
    process.exit(1);
  }
  if (events.length === 0) {
    console.error('No suitable events found');
    logStatus('no_events');
    process.exit(1);
  }
  console.log(`Found ${events.length} events (earliest to latest).`);

  const topEvent = events[0];
  const hasTonight = events.some(e => isToday(e.event_date));
  const urgency = hasTonight ? 'tonight' : 'today';
  const subject = `SoulFlow Melbourne: ${events.length} soulful picks for ${urgency}`;
  const previewText = `${topEvent.event_name} and ${events.length - 1} more soulful things to do in Melbourne today.`;
  const content = buildHtml(events);

  const melbourneOffsetHours = 11;
  const now = new Date();
  const utcHour = 9 - melbourneOffsetHours;
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, 0, 0));
  if (target.getTime() < Date.now() - 60_000) target.setUTCDate(target.getUTCDate() + 1);
  const sendAt = process.env.SEND_NOW === '1' ? new Date().toISOString() : target.toISOString();

  const payload = {
    email_template_id: 5732515,
    subject,
    preview_text: previewText,
    content,
    description: 'Daily Melbourne picks',
    public: false,
    published_at: new Date().toISOString(),
    send_at: sendAt,
  };

  const res = await fetchWithRetry('https://api.kit.com/v4/broadcasts', {
    method: 'POST',
    headers: { 'X-Kit-Api-Key': KIT_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  console.log('STATUS', res.status);
  if (res.ok) {
    console.log(`Created broadcast ${json.broadcast.id}, template=${json.broadcast.email_template?.name}, status=${json.broadcast.status}, send_at=${sendAt}, subscribers=${subscriberCount}`);
    logStatus('success', { broadcastId: json.broadcast.id, subject, sendAt, eventCount: events.length, subscriberCount });
    try { const ap = path.join(ROOT, 'docs', 'ALERT.md'); if (fs.existsSync(ap)) fs.unlinkSync(ap); } catch (e) {}
  } else {
    console.error('FAILED:', JSON.stringify(json));
    logStatus('send_failed', { error: JSON.stringify(json), subject });
    try { fs.writeFileSync(path.join(ROOT, 'docs', 'ALERT.md'), `# ⚠️ SEND FAILED\\n\\nTime: ${new Date().toISOString()}\\nSubject: ${subject}\\nError: ${JSON.stringify(json)}\\n`); } catch (e) {}
    process.exit(1);
  }
}

main().catch(e => { console.error(e); logStatus('fatal', { error: e.message }); try { fs.writeFileSync(path.join(ROOT, 'docs', 'ALERT.md'), `# ⚠️ FATAL ERROR\\n\\nTime: ${new Date().toISOString()}\\nError: ${e.message}\\n`); } catch (err) {} process.exit(1); });
