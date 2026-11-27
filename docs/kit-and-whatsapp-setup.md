# SoulFlow cheapest-free growth setup

## Decision

Use **Kit's free tier** for the weekly Melbourne guide and a **free WhatsApp Channel** for discovery. Do not use paid WhatsApp APIs, unofficial gateways, or schedulers at this stage.

- Kit free: up to 10,000 subscribers, unlimited broadcasts.
- Supabase signups: already running; no extra infrastructure cost.
- WhatsApp Channel: free, manual posting only (no official API).

Keep the two audiences separate:

- **SoulFlow subscribers** come only from the site forms (`/`, `/melbourne`, `/link`).
- Do **not** import them into the personal Daniel Buatti Kit account. Create or use a dedicated SoulFlow Kit account/audience with the `soulconsciousevents@gmail.com` Gmail.

## Kit setup

**Status (27 Nov 2026):** dedicated SoulFlow Kit account created with `soulconsciousevents@gmail.com`, email confirmed, Creator trial cancelled and account downgraded to the **Free plan** (no card entered, no charge). Default sending time set to 9am Australia/Melbourne. Test subscriber `daniele.buatti@gmail.com` added and a real welcome broadcast was sent successfully.

1. Sign in to Kit with `soulconsciousevents@gmail.com`.
2. Use the free plan. Create a **SoulFlow** brand/audience, separate from the personal business.
3. Enable double opt-in and set a confirmation email that says “SoulFlow weekly picks — Melbourne”.
4. Create a welcome email with three links: `/melbourne`, `/map`, and “Submit an event”.
5. Create a reusable weekly broadcast template with five event cards (name, day/time, venue, one booking link each).
6. Export subscribers from SoulFlow: `/admin/panel?tab=newsletter` → **Export CSV** → filter city = Melbourne.
7. Import only people who explicitly opted into SoulFlow weekly picks. Never import purchased or scraped lists.

## WhatsApp Channel setup

1. In the SoulFlow-dedicated Chrome profile, create a **SoulFlow Melbourne** WhatsApp Channel.
2. Use the soulconsciousevents number/identity if available; do not mix it with your personal business number.
3. Post once a week, manually: “Five soulful things to do in Melbourne this week → [soulflow link]”.
4. Link the channel from Instagram bio/Stories and from `/link`.
5. Do not use Whapi/Maytapi/SendOnTime-style automation on a personal number — it risks a ban.

## First test group

Ask 5–10 people (including yourself) to:

1. Open `https://soulflowau.vercel.app/melbourne`.
2. Sign up for weekly picks with a Melbourne email.
3. Click one event and press the booking CTA.
4. Use the event page **Share kit → Copy organiser promo** and send it back to you.

Then check `/admin/panel?tab=analytics` for booking clicks, shares/link copies and newsletter signups, and `/admin/panel?tab=newsletter` for the test subscribers.

## Review loop

After one week:

- Did anyone click through to booking?
- Did any host share their event?
- How many of the test group opened the guide and signed up?
- Only then consider expanding to another city or paid delivery.
