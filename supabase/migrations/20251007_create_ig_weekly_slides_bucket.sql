-- Create public bucket for weekly IG slides (Phase 1)
insert into storage.buckets (id, name, public)
values ('ig-weekly-slides', 'ig-weekly-slides', true)
on conflict (id) do nothing;
