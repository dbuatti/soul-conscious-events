// scripts/instagram-login-token.mjs
//
// Helper for the Instagram Login path (no Facebook Page required). Turns a
// short-lived Instagram token into a long-lived one and prints the two values
// to add as Supabase Edge Function secrets.
//
// Usage:
//   META_APP_SECRET=xxx META_SHORT_TOKEN=IGQV... node scripts/instagram-login-token.mjs
//   META_APP_SECRET=xxx META_LONG_TOKEN=IGQV...  node scripts/instagram-login-token.mjs --refresh
//
// Where to get META_SHORT_TOKEN:
//   developers.facebook.com -> your app -> Instagram -> API setup with
//   Instagram login -> Generate token (as an app admin, for your own account).

const APP_SECRET = process.env.META_APP_SECRET;
const SHORT = process.env.META_SHORT_TOKEN;
const LONG = process.env.META_LONG_TOKEN;
const REFRESH = process.argv.includes('--refresh');
const API = 'https://graph.instagram.com';

if (!APP_SECRET) {
  console.error('Missing META_APP_SECRET.');
  process.exit(1);
}
if (!SHORT && !LONG) {
  console.error('Set META_SHORT_TOKEN (to exchange) or META_LONG_TOKEN (to refresh).');
  process.exit(1);
}

async function get(path, params) {
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message || `Instagram API error (${res.status})`);
  }
  return json;
}

async function run() {
  let longToken;

  if (REFRESH || (!SHORT && LONG)) {
    if (!LONG) throw new Error('Provide META_LONG_TOKEN for --refresh.');
    const data = await get('/refresh_access_token', {
      grant_type: 'ig_refresh_token',
      access_token: LONG,
    });
    longToken = data.access_token;
    console.log(`Refreshed long-lived token (expires in ${Math.round(data.expires_in / 86400)} days).`);
  } else {
    const data = await get('/access_token', {
      grant_type: 'ig_exchange_token',
      client_secret: APP_SECRET,
      access_token: SHORT,
    });
    longToken = data.access_token;
    console.log(`Exchanged for long-lived token (expires in ${Math.round(data.expires_in / 86400)} days).`);
  }

  const me = await get('/me', { fields: 'user_id,username,account_type', access_token: longToken });
  const igUserId = me.user_id || me.id;

  console.log('\nAdd these as Supabase Edge Function secrets:\n');
  console.log(`META_IG_USER_ID   = ${igUserId}`);
  console.log(`META_ACCESS_TOKEN = ${longToken}`);
  console.log('\nAnd set this too, so the publisher uses the Instagram host:');
  console.log('META_GRAPH_BASE   = https://graph.instagram.com/v21.0');
  console.log(`\nAccount: @${me.username} (${me.account_type})`);
  console.log('Tip: re-run with --refresh (and META_LONG_TOKEN) before the 60-day expiry.');
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});