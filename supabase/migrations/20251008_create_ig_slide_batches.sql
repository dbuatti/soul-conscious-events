-- Create table to store generated IG slide batches
create table if not exists public.ig_slide_batches (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  caption text not null,
  slides jsonb not null default '[]',
  event_count integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.ig_slide_batches enable row level security;

-- Allow admins to read/write (service role bypasses RLS, but good practice)
create policy "Admins can manage slide batches"
  on public.ig_slide_batches
  for all
  using (auth.uid() in (
    select user_id from profiles where role = 'admin'
  ))
  with check (auth.uid() in (
    select user_id from profiles where role = 'admin'
  ));

-- Allow anyone to read? Or just admins - admin panel needs to read
create policy "Admins can read slide batches"
  on public.ig_slide_batches
  for select
  using (auth.uid() in (
    select user_id from profiles where role = 'admin'
  ));

-- But service role needs to write; RLS not enforced for service role - that's fine
