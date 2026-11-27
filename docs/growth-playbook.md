# SoulFlow growth playbook

SoulFlow already has supply: an event importer, recurring-event support, public event pages, a map, weekly Instagram slides and a link-in-bio page. The growth job is to build **one local weekly habit**, not to add more national inventory.

## The loop

**Chosen beachhead: Melbourne.** Until that local habit is working, treat the other city guides as secondary.

1. Pick one city and five genuinely good events for the week.
2. Publish a carousel and Stories with direct event links.
3. Ask every featured host to share the event page or weekly post.
4. Capture email addresses for the next weekly guide.
5. Repeat on the same day each week.
6. Review booking clicks, shares, repeat visitors and new host submissions.

## What is implemented in the app

- **City guides:** `/melbourne`, `/sydney`, `/brisbane`, `/perth`, `/adelaide`, `/hobart`, `/canberra`, `/darwin`.
- **Weekly-picks signup:** homepage, every city guide and `/link`. Subscribers are stored in `newsletter_subscribers` through an RLS-protected insert.
- **Admin subscriber list:** `/admin/panel?tab=newsletter` with city filters and CSV export.
- **Event share kit:** event pages and event dialogs can share, copy a tracked link, copy an attendee caption or copy an organiser promo caption.
- **UTM attribution:** shared links carry `utm_source`, `utm_medium`, `utm_campaign` and `utm_content`; page visits retain the source in analytics.
- **Conversion analytics:** event shares/link copies and newsletter signups appear in the Analytics tab and CSV export.
- **SEO:** city guides have local metadata and are included in `public/sitemap.xml`.

## Database setup

Apply `supabase/migrations/20261127013236_weekly_picks_subscribers.sql` before deploying the signup UI. It creates the subscriber table, a validated anonymous insert policy, an admin-only read policy and the supporting index.

The signup uses a direct PostgREST insert with `return=minimal`. RLS validates and normalises the email, city and source; browser clients cannot read or modify subscriber rows. Export the admin list into Kit (or another email platform) to send the weekly guide.

## First 30 days

### Week 1 — set up Melbourne

- Melbourne is the beachhead; use the `/melbourne` guide as the primary destination.
- Contact 15 Melbourne venues or organisers personally.
- Manually curate the first five events.
- Publish the first carousel and Stories.

### Week 2 — activate hosts

- Ask each featured host to share the event page.
- Use the event page's **Share kit → Copy organiser promo** action.
- Follow up with the seven existing outside submitters for referrals.
- Add the city guide link to your own social profiles.

### Week 3 — start the email habit

- Put the city guide link in Stories and the Instagram bio.
- Send the first weekly-picks email from the admin CSV export.
- Keep the email short: five events, one line each, direct booking links.

### Week 4 — review and double down

- Check `/admin/panel?tab=analytics` for booking clicks, shares and signups.
- Check `/admin/panel?tab=newsletter` for subscriber growth by city.
- Personally thank new subscribers and ask what they want to see more of.
- Invest more attention in the two or three hosts sending the most people.

## Outreach templates

### Venue / organiser

> Hey [name] — we've listed [event] on SoulFlow, our free guide to conscious events in [city]. Here's the page: [tracked link]. We're featuring five local events each week. If you share the post or page with your audience, we'll include your next event in the next guide too.

### Weekly social caption

> Five soulful things to do in [city] this week ✨
>
> 1. [Event] — [day/time]
> 2. [Event] — [day/time]
> ...
>
> Full details and booking links are in our bio. Which one are you coming to?

### Host follow-up

> Thanks again for sharing [event]. We had [number] people open the listing and [number] click through to booking. Would you like us to include your next gathering in next week's five?

## Metrics that matter

Track weekly:

- Active email subscribers
- Event-detail views
- Booking/contact clicks
- Event shares and copied links
- Repeat visitors
- New host submissions
- Referrals from each partner

Pageviews are useful context, but the goal is **booking clicks and returning locals**.

## Avoid for now

- App-store launches
- National paid ads
- Paid featured listings before real traffic exists
- More importer sources before local demand is proven
- Heavy brand spend until the SoulFlow name/domain overlap is resolved
