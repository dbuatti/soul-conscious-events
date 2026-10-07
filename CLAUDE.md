# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start local dev server (Vite)
pnpm build        # Production build
pnpm build:dev    # Build in development mode
pnpm lint         # Run ESLint
pnpm typecheck    # Type-check (Vite builds do not type-check)
pnpm preview      # Preview production build locally
```

The only automated tests cover the event importer's parsing (Deno): `deno test supabase/functions/_shared/event-import.test.ts`.

## Architecture Overview

**Soul Conscious Events** (branded as "SoulFlow") is a React + TypeScript SPA for discovering and managing conscious/wellness events across Australia. It is built with Vite, deployed on Vercel, and backed by Supabase (Postgres + Auth + Storage + Edge Functions). The app also has a Capacitor scaffold for potential iOS/Android builds.

### Routing (`src/App.tsx`)

The app has two coexisting UI generations sharing the same Supabase backend:

- **V2 (active, default)** — all routes under `/` use `LayoutV2` with `HeaderV2` and `Footer`. This is the production UI.
- **Legacy (kept for reference)** — all routes under `/old` use the original `Layout`. Not actively developed.

Route protection is handled by `ProtectedRoute`, which supports `requireAdmin` for admin-only pages. Admin access is granted when `profile.role === 'admin'` **or** the user's email is `daniele.buatti@gmail.com`. Use `isAdmin` from `useSession()` rather than re-implementing this check.

### Auth & Session (`src/components/SessionContextProvider.tsx`)

A single React context wraps the entire app and provides `{ session, user, profile, isLoading, isProfileLoading }`. It listens to `supabase.auth.onAuthStateChange` and fetches the user's row from the `profiles` table on login. Access this via `useSession()`.

### Database (Supabase)

Key tables:
- `events` — main events table. Soft-deleted via `is_deleted`. Approval flow via `approval_status` (`pending`/`approved`/`rejected`).
- `profiles` — user profiles with a `role` column (`user`/`admin`).
- `contact_submissions` — contact form submissions.
- `ai_parsing_logs` — logs each call to the AI event-parsing edge function.
- `user_favourite_venues` — maps `user_id` → `place_name`.
- `event_sources` / `event_import_runs` — importer sources and run log (admin-only RLS). Imported events carry `source_id`, `external_id` and `imported_at`.

The Supabase client is a singleton at `src/integrations/supabase/client.ts`. Import it as `import { supabase } from "@/integrations/supabase/client"`.

### Event Data Flow

1. `EventsListV2` fetches all approved, non-deleted events from Supabase on mount (using the raw REST API first for resilience, falling back to the JS client).
2. Recurring events: events with a `recurring_pattern` field (`DAILY/WEEKLY/FORTNIGHTLY/MONTHLY`) are expanded client-side into up to 10 upcoming instances (until `recurring_end_date`, or 3 months out when unset) by `generateRecurringInstances()` in `src/utils/event-utils.ts`. Recurring instances get synthetic IDs in the format `{uuid}-{yyyyMMdd}`.
3. `getBaseEventId()` strips the date suffix from recurring instance IDs to recover the real database UUID before any DB write.
4. Filtering is entirely client-side via the `useEventFilters` hook, which memoizes results against `allEvents`, `filters`, and `searchTerm`.

### Event Form & Validation

- Schema: `src/lib/schemas.ts` (Zod). `ticketLink` is required and must be a valid URL.
- `EventForm` component (used by both `SubmitEvent` and `EventEditPage`) handles create and edit via the same form.
- The `AiParsingSection` component calls the `parse-event-details` edge function to pre-fill the form from pasted text (flyers, emails, etc.).

### Supabase Edge Functions (`supabase/functions/`)

All written in Deno TypeScript. Key functions:
- `parse-event-details` — calls Google Gemini API (`gemini-2.5-flash`) to parse raw event text into structured JSON. Requires `GEMINI_API_KEY` env var.
- `parse-venue-details` — similar AI parsing for venues.
- `delete-user` / `update-user-metadata` / `resend-confirmation` / `reset-password-admin` / `create-test-user` — admin user management utilities. These run with the service-role key, so each must authorize the caller via `supabase/functions/_shared/auth.ts` (`requireAdmin` / `requireUser`).

- `import-events` — the event importer. Reads the admin-managed `event_sources` list (organiser pages, venue "what's on" pages, public `.ics` calendars), extracts events from schema.org JSON-LD or iCal (Gemini only as a capped fallback), skips anything already known by `external_id`/`ticket_link` (including rejected/deleted events), and inserts the rest with `approval_status = 'pending'`. Parsing lives in `_shared/event-import.ts` (pure, unit-tested); fetching obeys robots.txt and blocks private hosts. Admins review imports in the admin panel's **Imports** tab (`src/components/admin/EventImports.tsx`). `.github/workflows/import-events.yml` runs it daily, fetching the service-role key with `SUPABASE_ACCESS_TOKEN`.

Deployment: `.github/workflows/deploy-edge-functions.yml` deploys every function on push to `main` that touches `supabase/functions/**` (needs the `SUPABASE_ACCESS_TOKEN` repo secret). `cron-ping` is deployed with `--no-verify-jwt`; all others require a JWT. Migrations are **not** auto-applied — run them manually.

### Views

Three view modes on the home page toggled in `EventsListV2`:
- **List** — paginated `EventCardV2` grid (8 per load).
- **Calendar** — `AdvancedEventCalendar` + day-specific event list.
- **Map** — `LeafletMap` (react-leaflet) plotting events by geocoded address.

### Styling

- Tailwind CSS with a custom "Golden Hour / Desert Night" color palette (terracotta primary `#B34629`, warm sand background).
- Dark mode via `next-themes`.
- `organic-card` is a custom CSS class defined in `src/globals.css` — used for the distinctive rounded card style throughout V2.
- shadcn/ui components live in `src/components/ui/`. Never edit these directly; use them as-is or create wrapper components.

### Key Constants

- `src/lib/constants.ts` — `eventTypes` array and `australianStates` array. Add new event categories here.
- `src/lib/v2/constants.ts` — V2-specific constants.
- `src/types/event.ts` — the `Event` interface that mirrors the DB schema.

### Admin Panel (`/admin/panel`)

Tabs: Imports, Slides, Events, Venues, Contact, Analytics, Users, AI Logs. All data fetched directly from Supabase in the component. Admin-only route. The **Slides** tab (`src/components/admin/WeeklySlides.tsx`) shows the weekly Instagram carousel generated by the `weekly-ig-slides` function, which is stored in `ig_slide_batches` and the public `ig-weekly-slides` bucket for manual posting.

### DevSpace (`/dev-space`)

Internal developer scratch page. Admin-only.
