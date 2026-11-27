# SoulFlow

A React + TypeScript SPA for discovering and submitting conscious and wellness events across Australia. Built with Vite, Supabase and Tailwind; deployed on Vercel.

## Local development

```bash
pnpm install
pnpm dev
```

Vite runs on port `32100`.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build

deno test supabase/functions/_shared/event-import.test.ts
```

## Structure

- `src/pages/` — routed pages; `src/pages/v2/` is the active UI generation.
- `src/components/` — shared UI, with shadcn primitives in `components/ui/` and active V2 components in `components/v2/`.
- `src/services/` and `src/hooks/` — Supabase data access and React Query hooks.
- `src/lib/` and `src/utils/` — shared schemas, constants, booking and recurring-event logic.
- `supabase/functions/` — Deno edge functions for importing events, AI parsing, admin utilities and Instagram automation.
- `supabase/migrations/` — SQL migrations. These are applied manually.
- `docs/` — audits, setup notes and the growth playbook.

## Growth features

See [`docs/growth-playbook.md`](docs/growth-playbook.md) for the city guides, weekly-picks signup, event share kit and first-30-days plan.

The newsletter signup requires the `20261127013236_weekly_picks_subscribers` migration to be applied before it can accept subscribers.
