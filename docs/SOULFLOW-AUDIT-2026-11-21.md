# SoulFlow audit — 21 November 2026

Local repo was clean at commit `cafede7` (27 Oct 2026), identical to
`github.com/dbuatti/soul-conscious-events`. Live site: https://soulflowau.vercel.app.
Supabase project: `tbyjdhxpbfvqsrzzdjwi`.

## Verdict

SoulFlow works as a machine that finds events. It is not yet a community and not
a business. Treat it as a low-maintenance marketing channel for Piano by Heart,
Resonance and Dharma Piano — not a second income stream.

The design and data pipeline are genuinely good. The problem is that three of
the four scheduled automations were **green no-ops**: the workflows reported
success while adding no events and posting no carousels.

## What is working

| Check | Result |
|---|---|
| Public approved events | 561 (500 imported, 40 user-submitted, 21 seed rows) |
| Upcoming (≥ 21 Nov 2026) | 112 — 45 in the next 7 days, 98 in the next 30 |
| Live site | Renders cleanly, no console errors; "Showing 8 of 112" matches the DB |
| Import relevance | 482 on-topic, 16 unsure, 2 unknown among imported rows |
| Auto-approval | Shipped 6 Oct (`0ce0db7`): on-topic → published, off-topic → rejected, unsure → review |
| Outside submitters | 7 distinct `user_id`s |
| Keep-alive | 5 successful runs in the last month |

## What is not working

### 1. Daily content has not posted since 26 Oct (fixed 21 Nov)

`scripts/daily-content.mjs` required `hour === 8 && minute < 45` in Sydney time,
but GitHub's scheduler fires the job 5–7 hours late. The last eight runs all
exited successfully with:

```
Outside the daily window (Sydney: Fri 13:49). Nothing to do.
```

Because generation never ran, `ig_slide_batches` had no due rows and the hourly
Instagram publisher (53 runs in two weeks) logged `0 batch(es) due / 0 posted`.
Two automations were paying for one no-op.

**Fix applied:** broadened the window to the whole local day, added a 24-hour
`posted_at` ledger check for idempotency, and collapsed the two DST cron slots
to one (`0 22 * * *`) so retries cannot double-post.

### 2. The importer was starving its own sources (fixed 21 Nov)

`RUN_DEADLINE_MS` is 110 s. The loop walked all six `event_sources`; the first
broad Eventbrite listing consumed the budget and the rest were recorded as:

```
"message": "Skipped: out of time this run", "found": 0, "added": 0
```

Last three runs added: **0, 1, 11** events. Sources ordered by `last_run_at`
never advanced when skipped, so the same sources starved repeatedly.

**Fix applied:** `.limit(SOURCES_PER_RUN)` with `SOURCES_PER_RUN = 2`. The two
least-recently-run sources get a turn each day; skipped ones stay at the front
for the next run. Also corrected the workflow summary, which still said
"waiting for review" despite auto-approval being live.

### 3. The recurring system is dead data, not dead code

Zero of 561 events have `recurring_pattern` set. `generateRecurringInstances()`
and `RecurringEventFields` are wired into `EventForm`, but nobody uses them.
This — not a lack of sources — is why the calendar thins out after January.

**Action needed (data, not code):** mark your own monthly events as recurring
through the normal edit form.

### 4. Geography and curation

- Upcoming by state: VIC 55, QLD 27, TAS 16, NSW 9, SA 3, WA **0**, none 2.
- The Perth Eventbrite source is seeded but yields no upcoming events.
- `ON_TOPIC_TERMS` deliberately includes `/pilates/i`, `/yoga/i` and (until
  21 Nov) `/mindful/i`, so commercial fitness and "mindful craft" classes
  reached the front page (today's eight included Pilates ×2, pottery and
  calligraphy). **Fixed for "mindful":** it is now a soft signal, so a listing
  whose only on-topic word is "mindful" is `unsure` → review, not published.
  Pilates and yoga remain strong signals on purpose — an existing test calls
  a Pilates class a real SoulFlow event. That is still an editorial choice.
- A user-submitted medical conference on 1 Mar 2027 was approved manually even
  though `/conference/i` is an off-topic term. **Fixed:** user submissions that
  score `off-topic` now go to `pending`. Admins are exempt so your own
  participatory events (e.g. the Resonance choir, which matches the `choir`
  rule) still go live immediately. The three upcoming user submissions were
  checked: only the conference is affected.

### 5. Housekeeping

- 449 of 561 public events are in the past; 21 are old seed rows with
  `example.com` links (all past, so not user-facing).
- `/old` route tree removed from `src/App.tsx` on 21 Nov; the component files
  are still on disk and can be deleted later.
- Capacitor/Android/iOS scaffold untouched since Sep 2025. Leave it dormant;
  do not put this in the app stores.
- SoulFlow had no row in `~/systems-repo/INDEX.md` until 21 Nov.

## Name and domain

"Soul Flow" is an active Human Design app (`soul-flow.app`, App Store ID
`6754518611`, 10K+ Play downloads, $9.99–$59.99 subscriptions, updated Nov
2026). `soulflow.au` and `soulflow.com.au` both resolve to parked DNS;
`soulflowau.com` is unregistered. Do not spend on branding until this is
resolved.

## Strategy (unchanged)

1. Keep it a free marketing channel pointing to danielebuatti.com; pin your own
   events and add a weekly-picks email signup (Kit).
2. Do not charge browsers or pursue app stores.
3. Paid featured listings ($15–30/week) only after you can show real traffic.
4. Ask Phil / Path Collective whether they want to co-run the community side.

## Done 21 Nov 2026

- [x] Daily-content scheduler / idempotency fix
- [x] Importer source rotation + stale "waiting for review" wording
- [x] Relevance tightened: "mindful"-only listings now wait for review
- [x] Clearly off-topic user submissions now wait for review (admins exempt)
- [x] Removed `/old` routes from `App.tsx`
- [x] Added SoulFlow row to systems-repo `INDEX.md` and `inventory/repositories.md`
- [x] typecheck, lint, 48 Deno tests and 79 Vitest tests all pass

## Production verification — 21 Nov 2026

- Pushed `ddead74` to `main`. Deploy Supabase Edge Functions completed ✓.
- Importer run `44884573317` (started before the deploy finished, so it used the
  old function) added **21 events** across all six sources — confirming the
  zero-add runs were a budget/scheduling problem, not dead sources.
- Importer run `44884754175` (after deploy) processed **exactly 2 sources**
  (Brisbane + Perth) and added **12 events** — the rotation fix is live.
- Public events went 561 → **585**; upcoming went 112 → **135** (next 7 days:
  45 → 65). The pre-deploy run supplied most of that.
- Only **2 of the 12** post-deploy inserts were auto-approved. The rest were 9
  `unsure` (waiting in the admin review queue) and 1 `off-topic` (rejected).
  The importer is healthy, but its default verdict is cautious, so the admin
  inbox now grows on every run. Worth deciding whether to widen `ON_TOPIC_TERMS`
  or clear the queue on a fixed schedule.
- Daily content: not force-triggered, because that would publish to Instagram.
  The next scheduled run (22:00 UTC) is the live check.
- Final push `4d7f355` (relevance + submission gate): edge-function deploy
  completed ✓, and Vercel is serving the new hashed `SubmitEvent` chunk, so
  the client change is live too. 48 Deno tests, 79 Vitest tests, typecheck,
  lint and production build all pass.

## UI / UX / IA pass — 21 Nov 2026

- Added a single admin-only **Business view** at `/admin/business`, linked from
  the admin panel and the admin avatar menu. It consolidates the live morning
  pulse, today's action loop, the four-lane model diagram, strategy decisions,
  the parked paid-tier table and links to the audit/legal guides. The old
  `/admin/how-it-works` URL redirects here. Admin panel tabs now accept `?tab=`
  so the Business view can deep-link straight to Imports, Slides or Analytics.
- Users can set a **Default state / location** in Settings. It is stored in
  Supabase `user_metadata.default_state` (no schema migration), pre-filters the
  home event guide and shows as a “your default” badge. “All of Australia”
  clears it. The standalone `/map` page now honours the same preference.
- Map improvements: pins are colour-coded by category with a legend, the page
  reports how many events actually have a pin and can list the unmapped ones,
  and the Business view has a rate-limited “Geocode 60 now” button so coverage
  can be improved without CLI access. Curation note: the Alliance Française
  market and mindful craft workshops are on-topic; line dancing is treated as
  `unsure` for review, not rejected.
- Added **Competitor analysis** section to the Business view (`/admin/business#competitors`):
  side-by-side comparison of SoulFlow vs Path Collective (pathcollective.com /
  app.pathcollective.com), covering mission, stage, geography, pricing, booking
  model, curation, supply, social layer, monetisation and automation, plus
  "where each is ahead" and a strategic takeaway. Path Collective is pre-launch
  (Melbourne-first, ~3 events, founding-community model); SoulFlow is live
  (national, 135 upcoming events, auto-importer, map view).
- Desktop nav now includes Contact. Header/footer labels were made consistent
  (`Saved events`, `My listings`), and footer links to protected pages show a
  sign-in route for guests instead of bouncing them to an error toast.
- Hero quick filters now match the curation rules: `Music` was removed (live
  music is off-topic) and `Foraging` added.
- Accessibility: event cards announce as buttons with a "View details" label,
  calendar day cells are keyboard-operable with descriptive labels, and view
  toggles have explicit accessible names.
- Consistency fixes: the full event page now soft-deletes like the dialog and
  home list; bookmarks hide deleted/rejected/past events; the map view has an
  empty state; "under a minute" was changed to "in a few steps"; `Organizer`
  spelling and the Saved events SEO title were aligned.
- `/link` now has a "Back to the event guide" path, a page title, and sends
  "Submit an event" to sign-in first (the form is auth-gated).
- The parked paid-tier decision is now visible in admin: **Admin panel → Paid
  tiers (review)** jumps to a table on the How SoulFlow works page covering
  standard/free, featured $15–30/week, email signup, and the rejected options
  (commission, browser subscriptions, app stores). Nothing is built or live.

## Still to do

- [x] Clear the growing `pending` import queue, then decide whether `unsure`
      should keep defaulting to manual review. Resolved 24 Nov: widening the
      relevance vocabulary plus the source rotation leaves **0 pending**; the
      review inbox is no longer growing on every run.
- [x] Check the admin Analytics tab for real visitor numbers (admin-only).
      Last 30 days at 24 Nov: `/` 205 visits, `/login` 30, `/submit-event` 25
      (11 “Add Event” clicks), `/admin/business` 22, `/admin/panel` 21.
- [ ] Mark your own monthly events as recurring in the edit form.
- [ ] Review whether the Perth source should be replaced with a Canberra feed.
- [ ] Decide whether Pilates/yoga should also be soft signals. Left strong for now.
- [ ] Decide on the name and a real domain before any branding spend.
- [ ] Optional: delete the now-unreferenced legacy components under `src/pages/`.

## Follow-up — 24 Nov 2026

- Search input no longer lags: the controlled value is the raw keystrokes and
  only filtering is debounced (`c87580f`).
- All 118 upcoming events are pinned. The edge geocoder uses keyless `geomcp.au`
  G-NAF for street addresses and a Geoapify key (stored as a GitHub secret and
  synced by the deploy workflow) for venue-name-only cases; weak partial hits
  such as “Fortress Melbourne → Fortress Road” are rejected (`2cb2480`,
  `1bcb576`, `9b1b56c`, `38cedb5`, `e8fb6be`).
- Business view map coverage counts use exact head counts rather than a capped
  1,000-row download, and match the map's own upcoming/approved filter.
- Added Humanitix host source `Cellar Door at The Farm Yarra Valley`; its
  `Uncorked | Open Mic at Cellar Door` event is approved and pinned.
- Imported JSON-LD addresses no longer repeat the venue name and state in
  `full_address`; the venue stays in `place_name`, which the geocoder tries as
  a separate candidate. All 48 Deno and 80 Vitest tests pass (`cc8d948`).
