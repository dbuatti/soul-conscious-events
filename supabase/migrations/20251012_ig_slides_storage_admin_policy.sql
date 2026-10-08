-- Let admins upload into the IG slides bucket. The edge functions use the
-- service role (bypasses RLS), but the admin panel rasterises SVGs to JPEG in
-- the browser and needs to upload those for Instagram publishing.
create policy "Admins can upload IG slides"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'ig-weekly-slides'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update IG slides"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'ig-weekly-slides'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );