-- Úložisko: verejné fotky inzerátov, privátne overovacie videá
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-media', 'verification-media', false, 52428800, array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Cesta: listing-photos/<listing_id>/<súbor>; nahrávať smie len vlastník inzerátu
create policy "fotky citanie" on storage.objects for select using (bucket_id = 'listing-photos');
create policy "fotky upload vlastnik" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.owner_id = auth.uid()));
create policy "fotky zmazanie vlastnik" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (public.is_staff() or exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.owner_id = auth.uid())));

-- Overovacie médiá: nahrá vlastník, číta len staff
create policy "overenie upload vlastnik" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-media' and exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.owner_id = auth.uid()));
create policy "overenie citanie staff" on storage.objects for select to authenticated
  using (bucket_id = 'verification-media' and public.is_staff());
