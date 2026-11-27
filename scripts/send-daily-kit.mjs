import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const envPath = path.join(ROOT, '.env');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const KIT_API_KEY = env.KIT_API_KEY;
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
if (!KIT_API_KEY) throw new Error('KIT_API_KEY missing in .env');
if (!SUPABASE_URL) throw new Error('SUPABASE_URL missing in .env');

// Sync Supabase newsletter subscribers to Kit (so new signups receive emails).
async function syncSubscribers() {
  if (!SUPABASE_SERVICE_KEY) {
    console.log('Skipping subscriber sync (missing service key).');
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?select=email`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  if (!res.ok) {
    console.error('Subscriber fetch failed:', res.status, await res.text());
    return;
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
  console.log('Subscriber sync done.');
}

// Fetch upcoming approved Melbourne/VIC events.
async function fetchEvents() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  const today = new Date().toISOString().slice(0, 10);
  const url = `${SUPABASE_URL}/rest/v1/events?select=id,event_name,event_date,event_time,location,place_name,description,price,ticket_link,image_url,event_type&approval_status=eq.approved&is_deleted=eq.false&geographical_state=eq.VIC&event_date=gte.${today}&order=event_date.asc&limit=20`;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Events fetch failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  // Pick top 5, preferring events with images and descriptions.
  const scored = rows.map(e => ({
    e,
    score: (e.image_url ? 2 : 0) + (e.description ? 1 : 0) + (e.ticket_link ? 1 : 0),
  })).sort((a, b) => b.score - a.score || new Date(a.e.event_date) - new Date(b.e.event_date));
  return scored.slice(0, 5).map(s => s.e);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(events) {
  const siteUrl = 'https://soulflowau.vercel.app';
  const eventCards = events.map(e => {
    const img = e.image_url
      ? `<img src="${escapeHtml(e.image_url)}" alt="${escapeHtml(e.event_name)}" width="560" style="width:100%;max-width:560px;height:auto;border-radius:12px;display:block;margin:0 0 12px 0;" />`
      : '';
    const dateLine = `${formatDate(e.event_date)}${e.event_time ? ' · ' + escapeHtml(e.event_time) : ''}`;
    const venue = escapeHtml(e.place_name || e.location || '');
    const price = e.price ? escapeHtml(e.price) : 'See details';
    const desc = e.description ? escapeHtml(e.description.slice(0, 160)) + (e.description.length > 160 ? '…' : '') : '';
    const bookingUrl = e.ticket_link || `${siteUrl}/events/${e.id}`;
    const detailsUrl = `${siteUrl}/events/${e.id}`;
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;border:1px solid #e8e1d8;border-radius:16px;overflow:hidden;background:#ffffff;">
  <tr><td style="padding:16px;">
    ${img}
    ${e.event_type ? `<p style="margin:0 0 6px 0;"><span style="display:inline-block;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#b34629;background:#fde9e3;border-radius:999px;">${escapeHtml(e.event_type)}</span></p>` : ''}
    <h2 style="margin:0 0 6px 0;font-size:20px;font-weight:700;color:#2a2420;line-height:1.2;">${escapeHtml(e.event_name)}</h2>
    <p style="margin:0 0 4px 0;font-size:14px;color:#b34629;font-weight:600;">${dateLine}</p>
    <p style="margin:0 0 4px 0;font-size:13px;color:#6b625a;">${venue}${price ? ' · ' + price : ''}</p>
    ${desc ? `<p style="margin:8px 0 12px 0;font-size:14px;color:#4a433d;line-height:1.5;">${desc}</p>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 0 0;">
      <tr>
        <td style="border-radius:999px;background:#b34629;">
          <a href="${escapeHtml(bookingUrl)}" style="display:inline-block;padding:10px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">Book now</a>
        </td>
        <td style="width:10px;"></td>
        <td>
          <a href="${escapeHtml(detailsUrl)}" style="display:inline-block;padding:10px 18px;font-size:14px;font-weight:600;color:#b34629;text-decoration:none;border:1px solid #b34629;border-radius:999px;">Details</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>`;
  }).join('\n');

  // Return a fragment (Classic template provides the html/body wrapper + branding).
  return `
<div style="background:#f5efe6;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;">
    <tr><td style="padding:0;">
      <div style="background:linear-gradient(135deg,#b34629 0%,#d4833a 50%,#e8c89a 100%);padding:32px 24px 28px 24px;text-align:center;">
        <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#fff7f0;font-weight:700;opacity:0.9;">SoulFlow Melbourne</p>
        <h1 style="margin:0 0 8px 0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.15;text-shadow:0 1px 2px rgba(0,0,0,0.15);">Five soulful things to do today</h1>
        <p style="margin:0;font-size:15px;color:#fff7f0;line-height:1.5;opacity:0.95;">Hand-picked conscious events, with direct booking links.</p>
      </div>
    </td></tr>
    <tr><td style="padding:24px 24px 8px 24px;text-align:center;">
      <p style="margin:0 0 20px 0;font-size:14px;color:#6b625a;line-height:1.5;">No noise, no spam. Just five good things happening in Melbourne.</p>
    </td></tr>
    <tr><td style="padding:0 24px 8px 24px;">
      ${eventCards}
    </td></tr>
    <tr><td style="padding:8px 24px 16px 24px;text-align:center;">
      <a href="${siteUrl}/melbourne" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;background:#2a2420;text-decoration:none;border-radius:999px;">See all Melbourne events</a>
    </td></tr>
    <tr><td style="padding:16px 24px 28px 24px;text-align:center;border-top:1px solid #e8e1d8;">
      <p style="margin:0 0 8px 0;font-size:13px;color:#6b625a;">Discover more at <a href="${siteUrl}" style="color:#b34629;text-decoration:none;font-weight:600;">soulflowau.vercel.app</a></p>
      <p style="margin:0;font-size:11px;color:#9a9188;"><a href="{{ unsubscribe_url }}" style="color:#9a9188;text-decoration:underline;">Unsubscribe</a> · SoulFlow, Melbourne, VIC 3000, Australia</p>
    </td></tr>
  </table>
</div>`;
}

async function main() {
  await syncSubscribers();

  const events = await fetchEvents();
  if (events.length === 0) throw new Error('No suitable events found');
  console.log(`Found ${events.length} events.`);

  const subject = `SoulFlow Melbourne: ${events.length} picks for ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}`;
  const content = buildHtml(events);

  // send_at: 9:00am Melbourne (AEDT = UTC+11). Adjust for AEST (UTC+10) if needed.
  const melbourneOffsetHours = 11;
  const now = new Date();
  const utcHour = 9 - melbourneOffsetHours;
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, 0, 0));
  if (target.getTime() < Date.now() - 60_000) target.setUTCDate(target.getUTCDate() + 1);
  const sendAt = process.env.SEND_NOW === '1' ? new Date().toISOString() : target.toISOString();

  const payload = {
    email_template_id: 5732515,
    subject,
    preview_text: 'Five soulful things to do in Melbourne today, with direct booking links.',
    content,
    description: 'Daily Melbourne picks',
    public: false,
    published_at: new Date().toISOString(),
    send_at: sendAt,
  };

  const res = await fetch('https://api.kit.com/v4/broadcasts', {
    method: 'POST',
    headers: { 'X-Kit-Api-Key': KIT_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  console.log('STATUS', res.status);
  if (res.ok) {
    console.log(`Created broadcast ${json.broadcast.id}, template=${json.broadcast.email_template?.name}, status=${json.broadcast.status}, send_at=${sendAt}`);
  } else {
    console.error('FAILED:', JSON.stringify(json));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
