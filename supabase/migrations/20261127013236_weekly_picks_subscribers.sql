-- Weekly picks email capture.
--
-- Anonymous visitors can submit a validated email address, but cannot read,
-- update or delete subscriber rows. No privileged RPC is required.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  city text not null default 'all',
  source text not null default 'website',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  constraint newsletter_subscribers_email_key unique (email),
  constraint newsletter_subscribers_city_check check (
    city in ('all', 'melbourne', 'sydney', 'brisbane', 'perth', 'adelaide', 'hobart', 'canberra', 'darwin')
  ),
  constraint newsletter_subscribers_source_check check (char_length(source) between 1 and 80)
);

alter table public.newsletter_subscribers enable row level security;

-- Existing projects may grant new tables broad defaults. Start from no access.
revoke all on table public.newsletter_subscribers from anon, authenticated;
grant insert on table public.newsletter_subscribers to anon, authenticated;
grant select on table public.newsletter_subscribers to authenticated;
grant all on table public.newsletter_subscribers to service_role;

drop policy if exists "newsletter_subscribers_public_insert" on public.newsletter_subscribers;
create policy "newsletter_subscribers_public_insert"
on public.newsletter_subscribers
for insert
to anon, authenticated
with check (
  email = lower(email)
  and char_length(email) between 3 and 254
  and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  and email !~ '[[:cntrl:]]'
);

drop policy if exists "newsletter_subscribers_admin_select" on public.newsletter_subscribers;
create policy "newsletter_subscribers_admin_select"
on public.newsletter_subscribers
for select
to authenticated
using ((select public.is_admin()));

create index if not exists newsletter_subscribers_city_created_at_idx
  on public.newsletter_subscribers (city, created_at desc);
