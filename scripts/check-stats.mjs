import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const env = loadEnv(ROOT);
const KIT_API_KEY = env.KIT_API_KEY;
if (!KIT_API_KEY) throw new Error('KIT_API_KEY missing');

async function main() {
  // List recent broadcasts
  const res = await fetch('https://api.kit.com/v4/broadcasts?per_page=5', {
    headers: { 'X-Kit-Api-Key': KIT_API_KEY },
  });
  const json = await res.json();
  console.log('Recent broadcasts:\n');
  for (const b of json.broadcasts) {
    // Get stats
    const statsRes = await fetch(`https://api.kit.com/v4/broadcasts/${b.id}/stats`, {
      headers: { 'X-Kit-Api-Key': KIT_API_KEY },
    });
    const stats = statsRes.ok ? await statsRes.json() : {};
    const s = stats.broadcast?.stats || {};
    console.log(`${b.id} | ${b.status.padEnd(9)} | ${b.subject.slice(0, 45).padEnd(45)} | sent:${s.recipients ?? '?'} opened:${s.emails_opened ?? '?'} clicked:${s.total_clicks ?? '?'} rate:${s.open_rate ?? '?'}%`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
