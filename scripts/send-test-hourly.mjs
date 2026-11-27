import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const envPath = path.join(ROOT, '.env');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const KIT_API_KEY = env.KIT_API_KEY;
if (!KIT_API_KEY) throw new Error('KIT_API_KEY missing in .env');

const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const htmlPath = path.join(ROOT, 'docs', `daily-email-${yyyy}-${mm}-${dd}.html`);
const mdPath = path.join(ROOT, 'docs', `daily-email-${yyyy}-${mm}-${dd}.md`);
if (!fs.existsSync(htmlPath)) throw new Error(`HTML not found: ${htmlPath}`);
const content = fs.readFileSync(htmlPath, 'utf8');

// subject from md
let subject = 'SoulFlow Melbourne Daily Picks';
if (fs.existsSync(mdPath)) {
  const raw = fs.readFileSync(mdPath, 'utf8');
  const m = raw.match(/## Subject line\s*\n([\s\S]*?)(?=\n## |\n---|$)/i);
  if (m) subject = m[1].trim();
}

const TEST_TAG_ID = 26477441;
const HOURS = 24;

async function createBroadcast(sendAt) {
  const payload = {
    subject,
    preview_text: 'Five soulful things to do in Melbourne, with direct booking links.',
    content,
    description: 'Hourly test send - Melbourne Daily Picks',
    public: false,
    published_at: new Date().toISOString(),
    send_at: sendAt,
    subscriber_filter: [{ all: [{ type: 'tag', ids: [TEST_TAG_ID] }], any: null, none: null }],
  };
  const res = await fetch('https://api.kit.com/v4/broadcasts', {
    method: 'POST',
    headers: { 'X-Kit-Api-Key': KIT_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return { status: res.status, ok: res.ok, json };
}

let created = 0;
for (let i = 1; i <= HOURS; i++) {
  const sendAt = new Date(now.getTime() + i * 60 * 60 * 1000).toISOString();
  const r = await createBroadcast(sendAt);
  if (r.ok) {
    created++;
    console.log(`[${i}/24] created broadcast ${r.json.broadcast?.id} send_at=${sendAt}`);
  } else {
    console.error(`[${i}/24] FAILED ${r.status}: ${JSON.stringify(r.json).slice(0, 300)}`);
  }
}
console.log(`\nCreated ${created}/${HOURS} broadcasts targeting test tag (daniele.buatti@gmail.com).`);