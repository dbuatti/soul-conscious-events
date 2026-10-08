// scripts/facebook-login-token.mjs
//
// Facebook Login path helper (Instagram account linked to a Facebook Page).
// Run this LOCALLY (not in CI) — Facebook invalidates sessions used from a
// different network than where the token was created.
//
// It:
//   1. exchanges a short-lived user token for a long-lived (60-day) one
//   2. lists your Pages + their linked Instagram business accounts
//   3. prints the META_IG_USER_ID + META_ACCESS_TOKEN to set in Supabase
//
// Env:
//   META_APP_ID, META_APP_SECRET, META_USER_TOKEN  (required)
//   PAGE_ID   (optional — pick one Page if several have Instagram linked)
//
// Usage:
//   META_APP_ID=... META_APP_SECRET=... META_USER_TOKEN=... \
//     node scripts/facebook-login-token.mjs

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const USER_TOKEN = process.env.META_USER_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const BASE = "https://graph.facebook.com/v26.0";

if (!APP_ID || !APP_SECRET || !USER_TOKEN) {
  console.error("Set META_APP_ID, META_APP_SECRET and META_USER_TOKEN.");
  process.exit(1);
}

async function api(path, params, token) {
  const url = `${BASE}/${path}?${new URLSearchParams({ ...params, access_token: token })}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message || `Graph API error (${res.status})`);
  }
  return json;
}

async function run() {
  const exchanged = await api("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: USER_TOKEN,
  });
  const longUser = exchanged.access_token;
  console.log(`Long-lived user token (expires in ${Math.round(exchanged.expires_in / 86400)} days).`);

  const accounts = await api(
    "me/accounts",
    { fields: "id,name,access_token,instagram_business_account", limit: "100" },
    longUser,
  );

  const pages = accounts.data ?? [];
  const withIg = pages.filter((p) => p.instagram_business_account);

  console.log(`\nFound ${pages.length} Page(s); ${withIg.length} with a linked Instagram account:\n`);
  for (const p of pages) {
    const ig = p.instagram_business_account?.id;
    console.log(`  - ${p.name}  (page ${p.id})${ig ? `  -> IG ${ig}` : "  [no Instagram linked]"}`);
  }

  const chosen = PAGE_ID
    ? pages.find((p) => p.id === PAGE_ID)
    : withIg[0];

  if (!chosen) {
    console.error(
      "\nNo Page with a linked Instagram account was found. Link an Instagram professional " +
        "account to your Page (Instagram app > Edit profile > Page), then re-run this script.",
    );
    process.exit(1);
  }
  if (!chosen.instagram_business_account) {
    console.error(`\nPage "${chosen.name}" has no Instagram account linked. Link one, then re-run.`);
    process.exit(1);
  }

  console.log(`\nUsing Page: ${chosen.name}`);
  console.log("\nAdd these as Supabase Edge Function secrets:\n");
  console.log(`META_IG_USER_ID   = ${chosen.instagram_business_account.id}`);
  console.log(`META_ACCESS_TOKEN = ${chosen.access_token}`);
  console.log("\n(Do NOT set META_GRAPH_BASE — the Facebook Login path uses graph.facebook.com.)");
}

run().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});