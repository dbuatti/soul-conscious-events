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
- `ON_TOPIC_TERMS` deliberately includes `/pilates/i`, `/mindful/i`, `/yoga/i`,
  so commercial fitness and "mindful craft" classes reach the front page
  (today's eight included Pilates ×2, pottery and calligraphy). This is an
  editorial decision baked into the code — change it only if you want a
  narrower definition of "conscious event".
- A user-submitted medical conference on 1 Mar 2027 was approved manually even
  though `/conference/i` is an off-topic term.

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
- [x] Removed `/old` routes from `App.tsx`
- [x] Added SoulFlow row to systems-repo `INDEX.md` and `inventory/repositories.md`
- [x] typecheck, lint, 46 Deno tests and 79 Vitest tests all pass

## Production verification — 21 Nov 2026

- Pushed `ddead74` to `main`. Deploy Supabase Edge Functions completed ✓.
- Importer run `44884573317` (started before the deploy finished, so it used the
  old function) added **21 events** across all six sources — confirming the
  zero-add runs were a budget/scheduling problem, not dead sources.
- Importer run `44884754175` (after deploy) processed **exactly 2 sources**
  (Brisbane + Perth) and added **12 events** — the rotation fix is live.
  Public event count went from 561 → 595 in one afternoon.
- Daily content: not force-triggered, because that would publish to Instagram.
  The next scheduled run (22:00 UTC) is the live check.

## Still to do

- [ ] Check the admin Analytics tab for real visitor numbers (admin-only).
- [ ] Mark your own monthly events as recurring in the edit form.
- [ ] Review whether the Perth source should be replaced with a Canberra feed.
- [ ] Decide the narrow-vs-broad curation question (pilates/crafts).
- [ ] Decide on the name and a real domain before any branding spend.
- [ ] Optional: delete the now-unreferenced legacy components under `src/pages/`.
