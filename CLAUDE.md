# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start local dev server (Vite)
pnpm build        # Production build
pnpm build:dev    # Build in development mode
pnpm lint         # Run ESLint
pnpm preview      # Preview production build locally
```

There are no automated tests in this project.

## Architecture Overview

**Soul Conscious Events** (branded as "SoulFlow") is a React + TypeScript SPA for discovering and managing conscious/wellness events across Australia. It is built with Vite, deployed on Vercel, and backed by Supabase (Postgres + Auth + Storage + Edge Functions). The app also has a Capacitor scaffold for potential iOS/Android builds.

### Routing (`src/App.tsx`)

The app has two coexisting UI generations sharing the same Supabase backend:

- **V2 (active, default)** — all routes under `/` use `LayoutV2` with `HeaderV2` and `Footer`. This is the production UI.
- **Legacy (kept for reference)** — all routes under `/old` use the original `Layout`. Not actively developed.

Route protection is handled by `ProtectedRoute`, which supports `requireAdmin` for admin-only pages. Admin access is granted when `profile.role === 'admin'` **or** the user's email is `daniele.buatti@gmail.com`.

### Auth & Session (`src/components/SessionContextProvider.tsx`)

A single React context wraps the entire app and provides `{ session, user, profile, isLoading, isProfileLoading }`. It listens to `supabase.auth.onAuthStateChange` and fetches the user's row from the `profiles` table on login. Access this via `useSession()`.

### Database (Supabase)

Key tables:
- `events` — main events table. Soft-deleted via `is_deleted`. Approval flow via `approval_status` (`pending`/`approved`/`rejected`).
- `profiles` — user profiles with a `role` column (`user`/`admin`).
- `contact_submissions` — contact form submissions.
- `ai_parsing_logs` — logs each call to the AI event-parsing edge function.
- `user_favourite_venues` — maps `user_id` → `place_name`.

The Supabase client is a singleton at `src/integrations/supabase/client.ts`. Import it as `import { supabase } from "@/integrations/supabase/client"`.

### Event Data Flow

1. `EventsListV2` fetches all approved, non-deleted events from Supabase on mount (using the raw REST API first for resilience, falling back to the JS client).
2. Recurring events: events with a `recurring_pattern` field (`DAILY/WEEKLY/FORTNIGHTLY/MONTHLY`) are expanded client-side into up to 10 future instances (max 3 months out) by `generateRecurringInstances()` in `src/utils/event-utils.ts`. Recurring instances get synthetic IDs in the format `{uuid}-{yyyyMMdd}`.
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
- `delete-user` / `update-user-metadata` / `resend-confirmation` / `reset-password-admin` — admin user management utilities.

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

Tabs: Event Management, Users, Analytics, AI Logs, Venues. All data fetched directly from Supabase in the component. Admin-only route.

### DevSpace (`/dev-space`)

Internal developer scratch page. Admin-only.
