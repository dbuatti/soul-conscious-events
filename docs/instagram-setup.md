# Instagram publishing setup (SoulFlow)

How to connect SoulFlow's admin **Slides** tab to Instagram so carousels can be
published automatically. There are two supported paths; the app's
`publish-instagram` function works with either.

| | **Instagram Login** (recommended) | **Facebook Login** |
|---|---|---|
| Facebook Page needed | No | Yes (linked to the IG account) |
| API host | `https://graph.instagram.com/v21.0` | `https://graph.facebook.com/v21.0` |
| Secret to set | `META_GRAPH_BASE` | (leave unset) |

Both need: a **Meta developer account**, an **app**, an **Instagram professional
account** (Business or Creator), and — to post for accounts you don't own —
**App Review**. Posting to your own account works in development mode.

---

## Path A — Instagram Login (no Facebook Page)

### 1. Make the Instagram account professional
Instagram app → **Settings → Account type and tools → Switch to professional
account → Business** (or Creator).

### 2. Create the app
1. developers.facebook.com → **My Apps → Create App**.
2. Type: **Other → Business**.
3. Add product **Instagram** → **API setup with Instagram login**.
4. Copy the **App ID** and **App Secret** (Settings → Basic).
5. Add a **Privacy Policy URL** (required before going Live).

### 3. Get a token and the account id
1. In the app dashboard → **Instagram → API setup with Instagram login** →
   **Generate token** (as an app admin, for your own account).
2. Run the helper to exchange it for a long-lived token and print the id:
   ```bash
   META_APP_SECRET=xxx META_SHORT_TOKEN=IGQV... \
     node scripts/instagram-login-token.mjs
   ```
   It prints `META_IG_USER_ID`, `META_ACCESS_TOKEN`, and `META_GRAPH_BASE`.

### 4. Add the Supabase secrets
Project → **Settings → Edge Functions → Secrets** (or `supabase secrets set`):
```
META_IG_USER_ID   = <printed by the helper>
META_ACCESS_TOKEN = <printed by the helper>
META_GRAPH_BASE   = https://graph.instagram.com/v21.0
```

### 5. Refresh before expiry
Long-lived Instagram tokens last ~60 days. Re-run the helper with `--refresh`
before then:
```bash
META_APP_SECRET=xxx META_LONG_TOKEN=IGQV... \
  node scripts/instagram-login-token.mjs --refresh
```
(Consider scheduling this, or swapping to a Meta Business **System User** token
for a non-expiring credential.)

---

## Path B — Facebook Login (IG linked to a Page)

1. Create a Facebook **Page** for the brand.
2. Instagram → **Edit profile → Page** → link the Page.
3. app dashboard → add **Facebook Login for Business** + **Instagram**.
4. Graph API Explorer → grant `pages_show_list`, `pages_read_engagement`,
   `business_management`, `instagram_basic`, `instagram_content_publish`.
5. `GET /me/accounts` → copy the **Page ID**.
6. `GET /{page-id}?fields=instagram_business_account` → copy that **id**.
7. Exchange the short-lived token for a long-lived one:
   ```
   GET https://graph.facebook.com/v21.0/oauth/access_token
     ?grant_type=fb_exchange_token&client_id={app-id}
     &client_secret={app-secret}&fb_exchange_token={short-token}
   ```
8. Set secrets `META_IG_USER_ID` + `META_ACCESS_TOKEN`. **Do not** set
   `META_GRAPH_BASE` (the function defaults to the Facebook host).

For automation, generate a **System User token** in Business Suite → Settings →
Users → System Users (never expires).

---

## How publishing works

```
POST /{ig-user-id}/media          image_url + is_carousel_item=true  -> container id
POST /{ig-user-id}/media          media_type=CAROUSEL, children=...  -> parent id
POST /{ig-user-id}/media_publish  creation_id=<parent id>            -> live media id
```

- Instagram *pulls* the image from a **public HTTPS URL**, so the automation
  workflow rasterises the SVG slides to **JPEG**, uploads them to the public
  `ig-weekly-slides` bucket, then calls the API.
- Carousels: 2–10 images. Feed 4:5 (1080×1350), Stories 9:16 (1080×1920).
- Rate limit: ~50 posts / 24h.

### Automation
`.github/workflows/instagram-automation.yml` runs hourly, finds batches with
`status='scheduled' AND scheduled_for <= now`, and publishes them. Requires the
`SUPABASE_ACCESS_TOKEN` repo secret (to fetch the service-role key).

---

## Troubleshooting

| Error | Fix |
|---|---|
| `not_configured` | `META_IG_USER_ID` / `META_ACCESS_TOKEN` secrets not set. |
| `Invalid OAuth access token` | Token expired (~60 days) — refresh or use a System User token. |
| `The user does not have an Instagram Business Account` | IG is still Personal, or not linked to a Page (Path B). |
| `(#10) permission` | Missing scope, or app in dev mode without an app role for the account. |
| `Media URI must be a valid URL` | Image URL isn't public HTTPS, or the bucket isn't public. |
| `Only photo or video can be accepted` | Slide wasn't rasterised to JPEG/PNG. |