-- =====================================================================
-- NazovPortalu – databázová schéma (Supabase / PostgreSQL)
-- Zásady: RLS všade, telefón nikdy verejne (len cez RPC reveal_phone),
-- recenzie len po preukázanom kontakte, všetko moderovateľné.
-- =====================================================================
create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- unaccent nie je IMMUTABLE, pre generované stĺpce potrebujeme obal
create or replace function public.f_unaccent(text) returns text
language sql immutable parallel safe strict as $$ select public.unaccent('public.unaccent', $1) $$;

-- ---------- Enumy ----------
create type public.user_role      as enum ('user','advertiser','moderator','admin');
create type public.listing_status as enum ('draft','pending','active','paused','rejected','removed');
create type public.verify_status  as enum ('pending','approved','rejected','expired');
create type public.report_reason  as enum ('fake_photos','underage','coercion','scam','duplicate','offensive','other');
create type public.report_status  as enum ('open','in_review','resolved','dismissed');
create type public.order_status   as enum ('pending','paid','failed','refunded');
create type public.order_product  as enum ('top_1d','top_7d','top_30d','highlight_1d','highlight_7d');

-- ---------- Pomocné funkcie ----------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.slugify(txt text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(public.f_unaccent(coalesce(txt,''))), '[^a-z0-9]+', '-', 'g'))
$$;


-- ---------- Profily ----------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          public.user_role not null default 'user',
  display_name  text,
  date_of_birth date not null,
  age_confirmed_at timestamptz not null default now(),
  terms_accepted_at timestamptz not null default now(),
  phone         text,                                   -- súkromné, nikdy vo verejnom view
  banned_at     timestamptz,
  ban_reason    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_adult check (date_of_birth <= (current_date - interval '18 years'))
);
create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('moderator','admin') from public.profiles where id = auth.uid()), false)
$$;

-- privilegovaný kontext: moderátor/admin alebo serverové pripojenie (service_role, SQL editor, webhooky)
create or replace function public.is_privileged() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() or (auth.uid() is null and current_user not in ('anon','authenticated'))
$$;

comment on table public.profiles is 'Jeden riadok na účet. role rozhoduje o právach. Vek 18+ vynútený constraintom.';
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Používateľ si nemôže sám zmeniť rolu ani ban
create or replace function public.profiles_guard() returns trigger language plpgsql as $$
begin
  if not public.is_privileged() then
    new.role := old.role; new.banned_at := old.banned_at; new.ban_reason := old.ban_reason;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

-- ---------- Číselníky ----------
create table public.regions (
  id    serial primary key,
  slug  text unique not null,
  name  text not null
);

create table public.cities (
  id         serial primary key,
  region_id  int references public.regions(id),
  parent_id  int references public.cities(id),          -- mestská časť -> mesto
  slug       text unique not null,
  name       text not null,
  seo_title  text,
  seo_description text,
  seo_text   text,
  is_active  boolean not null default true
);
create index cities_parent_idx on public.cities(parent_id);

create table public.categories (
  id         serial primary key,
  slug       text unique not null,
  name       text not null,
  sort       int not null default 100,
  seo_title  text,
  seo_description text,
  is_active  boolean not null default true
);

create table public.service_tags (
  id    serial primary key,
  slug  text unique not null,
  name  text not null
);

-- ---------- Inzeráty ----------
create table public.listings (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  category_id     int  not null references public.categories(id),
  city_id         int  not null references public.cities(id),
  slug            text unique,
  title           text not null check (char_length(title) between 3 and 60),
  body            text not null check (char_length(body) between 20 and 4000),
  age             int  check (age between 18 and 99),
  price_from      numeric(8,2) check (price_from >= 0),
  price_list      jsonb not null default '[]',             -- [{label, price}]
  attributes      jsonb not null default '{}',             -- výška, postava, jazyky…
  availability    text,
  accepts_card    boolean not null default false,
  phone_hidden    boolean not null default true,
  blur_faces      boolean not null default false,
  status          public.listing_status not null default 'draft',
  rejection_note  text,
  verified_until  timestamptz,
  top_until       timestamptz,
  highlight_until timestamptz,
  last_online_at  timestamptz,
  views           bigint not null default 0,
  search          tsvector generated always as (to_tsvector('simple', public.f_unaccent(coalesce(title,'') || ' ' || coalesce(body,'')))) stored,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index listings_active_idx on public.listings(status, city_id, category_id) where status = 'active';
create index listings_owner_idx  on public.listings(owner_id);
create index listings_search_idx on public.listings using gin(search);
create index listings_title_trgm on public.listings using gin (title gin_trgm_ops);
create trigger listings_updated before update on public.listings for each row execute function public.set_updated_at();

create or replace function public.listings_before_write() returns trigger language plpgsql as $$
declare c text;
begin
  select slug into c from public.cities where id = new.city_id;
  if new.slug is null then
    new.slug := public.slugify(new.title) || '-' || c || '-' || substr(replace(new.id::text,'-',''),1,6);
  end if;
  -- bežný používateľ nemôže sám nastaviť stav active ani platené/overené polia
  -- (interné triggery – overenie, platby – nastavia np.internal a guard obídu)
  if current_setting('np.internal', true) is distinct from '1' and not public.is_privileged() then
    if tg_op = 'INSERT' then
      new.status := case when new.status = 'pending' then 'pending' else 'draft' end;
      new.verified_until := null; new.top_until := null; new.highlight_until := null; new.rejection_note := null;
    else
      if new.status not in ('draft','pending','paused') or old.status in ('rejected','removed') then new.status := old.status; end if;
      -- úprava aktívneho inzerátu ide znova na kontrolu
      if old.status = 'active' and (new.title <> old.title or new.body <> old.body) then new.status := 'pending'; end if;
      new.verified_until := old.verified_until; new.top_until := old.top_until;
      new.highlight_until := old.highlight_until; new.rejection_note := old.rejection_note; new.views := old.views;
    end if;
  end if;
  if new.status = 'active' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
create trigger listings_before_write before insert or update on public.listings for each row execute function public.listings_before_write();

create table public.listing_tags (
  listing_id uuid references public.listings(id) on delete cascade,
  tag_id     int  references public.service_tags(id) on delete cascade,
  primary key (listing_id, tag_id)
);

create table public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,            -- bucket listing-photos
  sort         int not null default 0,
  is_cover     boolean not null default false,
  approved     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index listing_photos_listing_idx on public.listing_photos(listing_id);

-- ---------- Overenie (video/selfie s kódom) ----------
create table public.verifications (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  code         text not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  storage_path text,                     -- bucket verification-media (privátny)
  status       public.verify_status not null default 'pending',
  reviewed_by  uuid references public.profiles(id),
  reviewed_at  timestamptz,
  note         text,
  created_at   timestamptz not null default now()
);
create index verifications_listing_idx on public.verifications(listing_id, status);

-- Schválenie overenia = odznak na 90 dní
create or replace function public.verifications_after_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    perform set_config('np.internal', '1', true);
    update public.listings set verified_until = now() + interval '90 days' where id = new.listing_id;
    perform set_config('np.internal', '0', true);
  end if;
  return new;
end $$;
create trigger verifications_after_update after update on public.verifications for each row execute function public.verifications_after_update();

-- ---------- Kontakty (odhalenie čísla) a recenzie ----------
create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  ip_hash     text,
  created_at  timestamptz not null default now()
);
create index contacts_listing_idx on public.contacts(listing_id, created_at desc);
create index contacts_user_idx on public.contacts(user_id, listing_id);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  body        text check (char_length(body) <= 1000),
  approved    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (listing_id, author_id)
);

-- Recenziu môže pridať len ten, kto si na inzeráte odhalil kontakt
create or replace function public.reviews_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.contacts where listing_id = new.listing_id and user_id = new.author_id) then
    raise exception 'Hodnotiť môže len používateľ, ktorý inzerentku kontaktoval cez portál.' using errcode = '42501';
  end if;
  if exists (select 1 from public.listings where id = new.listing_id and owner_id = new.author_id) then
    raise exception 'Vlastný inzerát nemožno hodnotiť.' using errcode = '42501';
  end if;
  if not public.is_privileged() then new.approved := false; end if;
  return new;
end $$;
create trigger reviews_guard before insert on public.reviews for each row execute function public.reviews_guard();

-- ---------- Nahlásenia ----------
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  reporter_id   uuid references public.profiles(id) on delete set null,
  reason        public.report_reason not null,
  details       text,
  contact_email text,
  status        public.report_status not null default 'open',
  priority      int not null default 3,                   -- 1 = okamžite (neplnoletosť, nátlak)
  resolved_by   uuid references public.profiles(id),
  resolved_at   timestamptz,
  resolution    text,
  created_at    timestamptz not null default now()
);
create index reports_open_idx on public.reports(status, priority, created_at) where status in ('open','in_review');

create or replace function public.reports_before_insert() returns trigger language plpgsql as $$
begin
  if new.reason in ('underage','coercion') then new.priority := 1; end if;
  return new;
end $$;
create trigger reports_before_insert before insert on public.reports for each row execute function public.reports_before_insert();

-- ---------- Objednávky (topovanie) ----------
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  buyer_id      uuid not null references public.profiles(id),
  product       public.order_product not null,
  amount_eur    numeric(8,2) not null check (amount_eur >= 0),
  status        public.order_status not null default 'pending',
  provider      text,                                     -- ccbill / segpay / verotel…
  provider_ref  text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index orders_listing_idx on public.orders(listing_id);

-- Zaplatená objednávka predĺži TOP / zvýraznenie (volá webhook platobnej brány cez service role)
create or replace function public.orders_after_update() returns trigger language plpgsql security definer set search_path = public as $$
declare d interval;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    d := case new.product when 'top_1d' then interval '1 day' when 'top_7d' then interval '7 days' when 'top_30d' then interval '30 days'
                          when 'highlight_1d' then interval '1 day' when 'highlight_7d' then interval '7 days' end;
    perform set_config('np.internal', '1', true);
    if new.product::text like 'top%' then
      update public.listings set top_until = greatest(coalesce(top_until, now()), now()) + d where id = new.listing_id;
    else
      update public.listings set highlight_until = greatest(coalesce(highlight_until, now()), now()) + d where id = new.listing_id;
    end if;
    perform set_config('np.internal', '0', true);
  end if;
  return new;
end $$;
create trigger orders_after_update after update on public.orders for each row execute function public.orders_after_update();

-- ---------- Audit ----------
create table public.audit_log (
  id         bigserial primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  data       jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Verejné view (bez telefónu a súkromných polí)
-- =====================================================================
create or replace view public.public_listings
with (security_invoker = false) as
select l.id, l.slug, l.title, l.body, l.age, l.price_from, l.price_list, l.attributes, l.availability, l.accepts_card,
       l.blur_faces, l.published_at, l.last_online_at, l.views,
       coalesce(l.verified_until  > now(), false) as is_verified,
       coalesce(l.top_until       > now(), false) as is_top,
       coalesce(l.highlight_until > now(), false) as is_highlighted,
       coalesce(l.last_online_at  > now() - interval '15 minutes', false) as is_online,
       c.slug as city_slug, c.name as city_name, pc.slug as parent_city_slug, pc.name as parent_city_name,
       k.slug as category_slug, k.name as category_name,
       (select storage_path from public.listing_photos p where p.listing_id = l.id and p.approved order by p.is_cover desc, p.sort limit 1) as cover_path,
       (select count(*) from public.listing_photos p where p.listing_id = l.id and p.approved) as photo_count,
       (select round(avg(rating)::numeric,1) from public.reviews r where r.listing_id = l.id and r.approved) as rating_avg,
       (select count(*) from public.reviews r where r.listing_id = l.id and r.approved) as rating_count,
       (select array_agg(t.name order by t.name) from public.listing_tags lt join public.service_tags t on t.id = lt.tag_id where lt.listing_id = l.id) as tags
from public.listings l
join public.cities c on c.id = l.city_id
left join public.cities pc on pc.id = c.parent_id
join public.categories k on k.id = l.category_id
join public.profiles o on o.id = l.owner_id
where l.status = 'active' and o.banned_at is null;
comment on view public.public_listings is 'Jediný verejný pohľad na inzeráty. Telefón sa získava výlučne cez rpc reveal_phone.';

-- =====================================================================
-- RPC
-- =====================================================================

-- Vyhľadávanie s filtrami a radením TOP > overené > najnovšie
create or replace function public.search_listings(
  p_city text default null, p_category text default null, p_q text default null,
  p_verified boolean default false, p_online boolean default false, p_with_reviews boolean default false,
  p_limit int default 24, p_offset int default 0)
returns setof public.public_listings language sql stable security definer set search_path = public as $$
  select pl.* from public.public_listings pl
  join public.listings l on l.id = pl.id
  where (p_city is null or pl.city_slug = p_city or pl.parent_city_slug = p_city)
    and (p_category is null or pl.category_slug = p_category)
    and (p_q is null or p_q = '' or l.search @@ plainto_tsquery('simple', public.f_unaccent(p_q)) or pl.title ilike '%' || p_q || '%')
    and (not p_verified or pl.is_verified)
    and (not p_online or pl.is_online)
    and (not p_with_reviews or pl.rating_count > 0)
  order by pl.is_top desc, pl.is_verified desc, pl.published_at desc
  limit least(p_limit, 100) offset greatest(p_offset, 0)
$$;

-- Odhalenie telefónu: zaloguje kontakt (podmienka pre recenziu), limit 30 / hod na používateľa alebo IP
create or replace function public.reveal_phone(p_listing uuid, p_ip_hash text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_phone text; v_cnt int;
begin
  select count(*) into v_cnt from public.contacts
   where created_at > now() - interval '1 hour'
     and ((auth.uid() is not null and user_id = auth.uid()) or (p_ip_hash is not null and ip_hash = p_ip_hash));
  if v_cnt >= 30 then raise exception 'Príliš veľa požiadaviek. Skúste neskôr.' using errcode = '53400'; end if;

  select coalesce(l.attributes->>'phone', o.phone) into v_phone
    from public.listings l join public.profiles o on o.id = l.owner_id
   where l.id = p_listing and l.status = 'active' and o.banned_at is null;
  if v_phone is null then raise exception 'Inzerát nie je dostupný.' using errcode = 'P0002'; end if;

  insert into public.contacts(listing_id, user_id, ip_hash) values (p_listing, auth.uid(), p_ip_hash);
  return v_phone;
end $$;

-- Počítadlo zobrazení (bez čítania celej tabuľky)
create or replace function public.bump_views(p_listing uuid) returns void
language sql security definer set search_path = public as $$
  update public.listings set views = views + 1 where id = p_listing and status = 'active'
$$;

-- Nahlásenie (aj anonymné)
create or replace function public.submit_report(p_listing uuid, p_reason public.report_reason, p_details text default null, p_email text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.reports(listing_id, reporter_id, reason, details, contact_email)
  values (p_listing, auth.uid(), p_reason, left(p_details, 2000), p_email) returning id into v_id;
  insert into public.audit_log(actor_id, action, entity, entity_id, data) values (auth.uid(), 'report', 'listing', p_listing::text, jsonb_build_object('reason', p_reason));
  return v_id;
end $$;

-- Heartbeat „som online“ (volá klient inzerentky každých 5 min)
create or replace function public.heartbeat(p_listing uuid) returns void
language sql security definer set search_path = public as $$
  update public.listings set last_online_at = now() where id = p_listing and owner_id = auth.uid()
$$;

-- Moderátor: rozhodnutie o inzeráte
create or replace function public.moderate_listing(p_listing uuid, p_status public.listing_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Len moderátor.' using errcode = '42501'; end if;
  update public.listings set status = p_status, rejection_note = p_note where id = p_listing;
  insert into public.audit_log(actor_id, action, entity, entity_id, data) values (auth.uid(), 'moderate', 'listing', p_listing::text, jsonb_build_object('status', p_status, 'note', p_note));
end $$;

-- Automatické vytvorenie profilu po registrácii (dátum narodenia z metadát)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name, date_of_birth, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
          (new.raw_user_meta_data->>'date_of_birth')::date, new.raw_user_meta_data->>'phone');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.regions         enable row level security;
alter table public.cities          enable row level security;
alter table public.categories      enable row level security;
alter table public.service_tags    enable row level security;
alter table public.listings        enable row level security;
alter table public.listing_tags    enable row level security;
alter table public.listing_photos  enable row level security;
alter table public.verifications   enable row level security;
alter table public.contacts        enable row level security;
alter table public.reviews         enable row level security;
alter table public.reports         enable row level security;
alter table public.orders          enable row level security;
alter table public.audit_log       enable row level security;

-- číselníky: čítať môže každý, písať len staff
create policy "ciselniky citanie" on public.regions      for select using (true);
create policy "ciselniky citanie" on public.cities       for select using (true);
create policy "ciselniky citanie" on public.categories   for select using (true);
create policy "ciselniky citanie" on public.service_tags for select using (true);
create policy "ciselniky staff"   on public.cities       for all using (public.is_staff()) with check (public.is_staff());
create policy "ciselniky staff"   on public.categories   for all using (public.is_staff()) with check (public.is_staff());
create policy "ciselniky staff"   on public.service_tags for all using (public.is_staff()) with check (public.is_staff());
create policy "ciselniky staff"   on public.regions      for all using (public.is_staff()) with check (public.is_staff());

-- profily: vlastný + staff
create policy "profil vlastny" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "profil uprava"  on public.profiles for update using (id = auth.uid() or public.is_staff()) with check (id = auth.uid() or public.is_staff());

-- inzeráty: verejnosť číta cez view; priamo len vlastník a staff
create policy "inzerat vlastnik" on public.listings for select using (owner_id = auth.uid() or public.is_staff());
create policy "inzerat vlozenie" on public.listings for insert with check (owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and banned_at is null));
create policy "inzerat uprava"   on public.listings for update using (owner_id = auth.uid() or public.is_staff()) with check (owner_id = auth.uid() or public.is_staff());
create policy "inzerat zmazanie" on public.listings for delete using (owner_id = auth.uid() or public.is_staff());

create policy "tagy citanie"  on public.listing_tags for select using (true);
create policy "tagy vlastnik" on public.listing_tags for all using (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = auth.uid() or public.is_staff())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = auth.uid() or public.is_staff())));

create policy "fotky citanie schvalene" on public.listing_photos for select using (approved or exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = auth.uid() or public.is_staff())));
create policy "fotky vlastnik" on public.listing_photos for insert with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "fotky uprava"   on public.listing_photos for update using (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = auth.uid() or public.is_staff())));
create policy "fotky zmazanie" on public.listing_photos for delete using (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = auth.uid() or public.is_staff())));
-- vlastník nemôže sám schváliť fotku
create or replace function public.photos_guard() returns trigger language plpgsql as $$
begin if not public.is_privileged() then new.approved := coalesce(old.approved, false); end if; return new; end $$;
create trigger photos_guard before insert or update on public.listing_photos for each row execute function public.photos_guard();

create policy "overenie vlastnik" on public.verifications for select using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()) or public.is_staff());
create policy "overenie vlozenie" on public.verifications for insert with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "overenie staff"    on public.verifications for update using (public.is_staff()) with check (public.is_staff());

create policy "kontakty vlastne" on public.contacts for select using (user_id = auth.uid() or public.is_staff()
  or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));

create policy "recenzie citanie" on public.reviews for select using (approved or author_id = auth.uid() or public.is_staff());
create policy "recenzie vlozenie" on public.reviews for insert with check (author_id = auth.uid());
create policy "recenzie staff"    on public.reviews for update using (public.is_staff()) with check (public.is_staff());
create policy "recenzie zmazanie" on public.reviews for delete using (author_id = auth.uid() or public.is_staff());

create policy "nahlasenia staff"  on public.reports for select using (public.is_staff() or reporter_id = auth.uid());
create policy "nahlasenia uprava" on public.reports for update using (public.is_staff()) with check (public.is_staff());

create policy "objednavky vlastne" on public.orders for select using (buyer_id = auth.uid() or public.is_staff());
create policy "objednavky vlozenie" on public.orders for insert with check (buyer_id = auth.uid() and status = 'pending');

create policy "audit staff" on public.audit_log for select using (public.is_staff());

-- Práva pre role Supabase
grant usage on schema public to anon, authenticated;
grant select on public.public_listings, public.cities, public.regions, public.categories, public.service_tags to anon, authenticated;
grant select, insert, update, delete on public.listings, public.listing_tags, public.listing_photos, public.verifications, public.reviews, public.orders to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.contacts, public.reports, public.audit_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.search_listings, public.reveal_phone, public.bump_views, public.submit_report to anon, authenticated;
grant execute on function public.heartbeat, public.moderate_listing to authenticated;
