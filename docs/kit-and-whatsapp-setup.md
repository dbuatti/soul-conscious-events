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

**Status (27 Nov 2026):** dedicated SoulFlow Kit account created with `soulconsciousevents@gmail.com`, email confirmed, Creator trial cancelled and account downgraded to the **Free plan** (no card entered, no charge). Default sending time set to 9am Australia/Melbourne. Test subscriber `daniele.buatti@gmail.com` added and a real welcome broadcast was sent successfully; Gmail initially filed it in Spam, so it was marked **Report not spam** and is now in the Inbox. A reusable **“Melbourne Weekly Picks”** email template has been saved in Kit.

- **No em dashes** in any email subject or body. Use commas, full stops or plain hyphens instead.
- **No Kit branding or odd address** in the footer. The mailing address is set to `SoulFlow, Melbourne, VIC 3000, Australia`; the custom templates avoid the free Kit footer.
- Branded Kit-importable template: `docs/kit-email-template.html` (header wordmark, footer, `{{ content }}` and `{{ unsubscribe_url }}`). The live daily broadcast is built and sent by `scripts/send-daily-kit.mjs`: it takes **every approved VIC event happening today (Melbourne time)**, shows up to 10, and adds a "see more on the website" nudge when there are more. `send-status.json` records the last run. `scripts/build-daily-email.mjs` is an older review-only draft builder (five upcoming picks) and is no longer used for the live send.
- **From name:** `SoulFlow` with reply-to `soulconsciousevents@gmail.com`.

1. Sign in to Kit with `soulconsciousevents@gmail.com`.
2. Use the free plan. This is a dedicated SoulFlow audience, separate from the personal business.
3. Keep double opt-in in mind when importing: only import people who opted into SoulFlow.
4. Reusable templates: **Melbourne Weekly Picks** and **Melbourne Daily Picks**.
5. A daily OpenChamber task runs `node scripts/send-daily-kit.mjs` at 08:15 Melbourne, which creates a Kit broadcast scheduled for 9am Melbourne (`SEND_NOW=1` sends immediately for testing). The old 08:00 review-draft task is disabled.
6. Export subscribers from SoulFlow: `/admin/panel?tab=newsletter` → **Export CSV** → filter city = Melbourne.
7. Import only people who explicitly opted into SoulFlow daily picks. Never import purchased or scraped lists.

**Signup path verified 28 Nov 2026:** the `newsletter_subscribers` table was empty simply because nobody had signed up yet, not because of a bug. An anonymous insert through PostgREST with `Prefer: return=minimal` returns 201 and persists the row (the form uses exactly that call). `Prefer: return=representation` would return 401 by design, since anon has no SELECT grant. The first real website signup will flow into Kit on the next daily send via `syncSubscribers()`.

## WhatsApp Channel setup

1. In the SoulFlow-dedicated Chrome profile, create a **SoulFlow Melbourne** WhatsApp Channel.
2. Use the soulconsciousevents number/identity if available; do not mix it with your personal business number.
3. Post once a week manually: "Everything soulful in Melbourne today. Link: [soulflow link]".
4. Because you do not want this attached to your personal number, park this until a dedicated phone number is available. No paid gateway or personal-number automation.

## First test group

Ask 5 to 10 people (including yourself) to:

1. Open `https://soulflowau.vercel.app/melbourne`.
2. Sign up for daily picks with a Melbourne email.
3. Click one event and press the booking CTA.
4. Use the event page **Share kit → Copy organiser promo** and send it back to you.

Then check `/admin/panel?tab=analytics` for booking clicks, shares/link copies and newsletter signups, and `/admin/panel?tab=newsletter` for the test subscribers.

## Review loop

After one week:

- Did anyone click through to booking?
- Did any host share their event?
- How many of the test group opened the guide and signed up?
- Only then consider expanding to another city or paid delivery.
