-- Úložisko: verejné fotky inzerátov, privátne overovacie videá
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-media', 'verification-media', false, 52428800, array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Nahrávanie ide do PRIVÁTNEHO bucketu listing-uploads; po schválení moderátorom trigger presunie objekt do verejného listing-photos.
-- Verejný bucket servíruje súbory bez RLS, preto v ňom smú byť len schválené fotky.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-uploads', 'listing-uploads', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "fotky citanie" on storage.objects for select using (bucket_id = 'listing-photos');
create policy "upload vlastnik" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-uploads' and exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.owner_id = auth.uid()));
create policy "upload citanie vlastnik a staff" on storage.objects for select to authenticated
  using (bucket_id = 'listing-uploads' and (public.is_staff() or exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.owner_id = auth.uid())));
create policy "fotky zmazanie vlastnik" on storage.objects for delete to authenticated
  using (bucket_id in ('listing-photos','listing-uploads') and (public.is_staff() or exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.owner_id = auth.uid())));

-- Schválenie fotky = presun do verejného bucketu; zrušenie schválenia = presun späť
create or replace function public.listing_photos_move() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.approved and not coalesce(old.approved, false) then
    update storage.objects set bucket_id = 'listing-photos' where bucket_id = 'listing-uploads' and name = new.storage_path;
  elsif not new.approved and coalesce(old.approved, false) then
    update storage.objects set bucket_id = 'listing-uploads' where bucket_id = 'listing-photos' and name = new.storage_path;
  end if;
  return new;
end $$;
create trigger listing_photos_move after insert or update of approved on public.listing_photos for each row execute function public.listing_photos_move();
-- Zmazanie záznamu o fotke zmaže aj súbor
create or replace function public.listing_photos_delete() returns trigger language plpgsql security definer set search_path = public as $$
begin delete from storage.objects where name = old.storage_path and bucket_id in ('listing-photos','listing-uploads'); return old; end $$;
create trigger listing_photos_delete after delete on public.listing_photos for each row execute function public.listing_photos_delete();

-- Overovacie médiá: nahrá vlastník, číta len staff
create policy "overenie upload vlastnik" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-media' and exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.owner_id = auth.uid()));
create policy "overenie citanie staff" on storage.objects for select to authenticated
  using (bucket_id = 'verification-media' and public.is_staff());
