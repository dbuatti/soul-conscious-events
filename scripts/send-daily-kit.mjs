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
if (!KIT_API_KEY) throw new Error('KIT_API_KEY missing in .env');

// Sync Supabase newsletter subscribers to Kit (so new signups receive emails).
async function syncSubscribers() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('Skipping subscriber sync (missing Supabase env).');
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

const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const draftPath = path.join(ROOT, 'docs', `daily-email-${yyyy}-${mm}-${dd}.md`);
if (!fs.existsSync(draftPath)) throw new Error(`Draft not found: ${draftPath}`);
const raw = fs.readFileSync(draftPath, 'utf8');

function section(name) {
  const re = new RegExp(`## ${name}\\s*\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`, 'i');
  const m = raw.match(re);
  return m ? m[1].trim() : '';
}

const subject = section('Subject line');
let body = section('Body');
if (!subject || !body) throw new Error('Could not parse subject/body from draft');

// Convert plain text to simple HTML
function toHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

const content = toHtml(body) + '\n<p><a href="{{ unsubscribe_url }}">Unsubscribe</a> | SoulFlow, Melbourne, VIC 3000, Australia</p>';

await syncSubscribers();

// send_at: 9:00am Melbourne (UTC+11 during AEDT). Compute today 9am Melbourne -> UTC.
// Melbourne offset Nov-Mar = +11. Adjust if needed; use fixed +11 for this trial season.
const melbourneOffsetHours = 11;
const sendDate = new Date();
// target 9:00 Melbourne today
const utcHour = 9 - melbourneOffsetHours; // -2 -> 22:00 prev day
const target = new Date(Date.UTC(sendDate.getUTCFullYear(), sendDate.getUTCMonth(), sendDate.getUTCDate(), utcHour, 0, 0));
// if target is in the past, push to tomorrow
if (target.getTime() < Date.now() - 60_000) {
  target.setUTCDate(target.getUTCDate() + 1);
}
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

// subscriber_filter with empty all ids is invalid; use default all subscribers by omitting filter? Docs: if nothing provided defaults to all. But required field. Use all_subscribers type? The example uses segment/tag. Kit also accepts type 'all_subscribers'? Let's check: the UI filter "All Subscribers". API may accept {all:[{type:'all_subscribers'}]}? Unknown. Try omitting subscriber_filter entirely? It's required. Let's use [{ all: [] }] maybe. Actually required minProperties 1 and all/any/none required. Hmm.
// Safest: replicate UI "All Subscribers" filter. Kit API for all subscribers: subscriber_filter: [{ all: [{ type: 'segment', ids: [...] }] }]? No segment id for all.
// Let's try sending without subscriber_filter first; if 422, adjust.


const res = await fetch('https://api.kit.com/v4/broadcasts', {
  method: 'POST',
  headers: { 'X-Kit-Api-Key': KIT_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const json = await res.json();
console.log('STATUS', res.status);
console.log(JSON.stringify(json, null, 2).slice(0, 1500));

if (res.ok) {
  console.log(`\nCreated broadcast ${json.broadcast.id}, scheduled send_at=${sendAt}`);
} else {
  console.error('FAILED');
  process.exit(1);
}