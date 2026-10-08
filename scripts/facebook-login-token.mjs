// scripts/facebook-login-token.mjs
//
// Helper for the Facebook Login path (Instagram account linked to a Facebook
// Page). Run this LOCALLY.
//
// It can produce/verify the credentials the `publish-instagram` function needs:
//   META_IG_USER_ID   -- the Instagram professional account id
//   META_ACCESS_TOKEN -- a token that can publish to it
//
// Two ways to authenticate:
//
//   1) System User token (recommended, never expires). Create one in Business
//      Suite -> Settings -> Users -> System Users, assign the Page + App, and
//      generate a token with the "Never" expiry. Then run:
//        META_SYSTEM_USER_TOKEN=xxx PAGE_ID=1359434947256728 \
//          node scripts/facebook-login-token.mjs
//
//   2) Short-lived user token from the Graph API Explorer (expires in ~60d, and
//      dies whenever you log out / rotate the app secret). The script exchanges
//      it for a long-lived Page token:
//        META_APP_ID=xxx META_APP_SECRET=xxx META_USER_TOKEN=xxx \
//          PAGE_ID=1359434947256728 node scripts/facebook-login-token.mjs
//
const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const USER_TOKEN = process.env.META_USER_TOKEN;
const SYSTEM_TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const BASE = "https://graph.facebook.com/v26.0";

async function api(path, params, token) {
  const url = `${BASE}/${path}?${new URLSearchParams({ ...params, access_token: token })}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message || `Graph API error (${res.status})`);
  }
  return json;
}

async function resolveToken() {
  if (SYSTEM_TOKEN) {
    console.log("Using System User token (non-expiring).");
    return SYSTEM_TOKEN;
  }
  if (USER_TOKEN && APP_ID && APP_SECRET) {
    const exchanged = await api("oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: APP_ID,
      client_secret: APP_SECRET,
      fb_exchange_token: USER_TOKEN,
    });
    console.log(`Long-lived user token (expires in ${Math.round(exchanged.expires_in / 86400)} days).`);
    return exchanged.access_token;
  }
  console.error(
    "Provide either META_SYSTEM_USER_TOKEN, or all of META_APP_ID + META_APP_SECRET + META_USER_TOKEN.",
  );
  process.exit(1);
}

async function run() {
  const token = await resolveToken();

  let chosen;
  if (PAGE_ID) {
    chosen = await api(PAGE_ID, { fields: "id,name,access_token,instagram_business_account" }, token);
    chosen = { ...chosen, access_token: chosen.access_token ?? token };
  } else {
    const accounts = await api(
      "me/accounts",
      { fields: "id,name,access_token,instagram_business_account", limit: "100" },
      token,
    );
    const pages = accounts.data ?? [];
    console.log(`\nFound ${pages.length} Page(s):\n`);
    for (const p of pages) {
      const ig = p.instagram_business_account?.id;
      console.log(`  - ${p.name}  (page ${p.id})${ig ? `  -> IG ${ig}` : "  [no Instagram linked]"}`);
    }
    chosen = pages.find((p) => p.instagram_business_account);
  }

  if (!chosen) {
    console.error("\nNo Page with a linked Instagram account was found. Pass PAGE_ID=... or link one.");
    process.exit(1);
  }
  if (!chosen.instagram_business_account?.id) {
    console.error(`\nPage "${chosen.name}" has no Instagram account linked. Link one, then re-run.`);
    process.exit(1);
  }

  const igId = chosen.instagram_business_account.id;

  // Verify the token can actually see (and therefore publish to) the account.
  const ig = await api(igId, { fields: "id,username,followers_count" }, chosen.access_token);

  console.log(`\n✅ Verified.`);
  console.log(`Page:      ${chosen.name} (${chosen.id})`);
  console.log(`Instagram: @${ig.username} (${ig.id}) — ${ig.followers_count} followers`);
  console.log("\nSet these as Supabase Edge Function secrets:\n");
  console.log(`META_IG_USER_ID   = ${ig.id}`);
  console.log(`META_ACCESS_TOKEN = ${chosen.access_token}`);
  console.log("\n(Do NOT set META_GRAPH_BASE — the Facebook Login path uses graph.facebook.com.)");
}

run().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});