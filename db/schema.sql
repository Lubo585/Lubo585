-- =====================================================================
--  Tržko – databázová schéma (PostgreSQL 16, cielené na Supabase)
--  Spustenie: psql -f db/schema.sql, potom psql -f db/seed_kategorie.sql
--  Schéma funguje aj bez PostGIS. Ak je PostGIS nainštalovaný, na konci
--  sa pridá geografický stĺpec a index pre rýchle hľadanie v okruhu.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;
create extension if not exists btree_gist;

-- Supabase má schému auth. Pri lokálnom spustení ju vytvorí testovací skript.
-- auth.uid() vracia id prihláseného používateľa, používa sa v RLS politikách.

-- ---------------------------------------------------------------------
--  Výčtové typy
-- ---------------------------------------------------------------------
create type country_code      as enum ('SK', 'CZ');
create type currency_code     as enum ('EUR', 'CZK');
create type lang_code         as enum ('sk', 'cs');
create type listing_status    as enum ('draft', 'pending_review', 'active', 'reserved', 'sold', 'expired', 'archived', 'removed');
create type price_type        as enum ('fixed', 'negotiable', 'free', 'on_request');
create type item_condition    as enum ('new', 'like_new', 'used', 'for_parts');
create type verification_type as enum ('phone', 'email', 'bank', 'document', 'business');
create type verification_status as enum ('pending', 'verified', 'rejected', 'expired');
create type order_status      as enum ('created', 'paid', 'shipped', 'delivered', 'released', 'disputed', 'refunded', 'cancelled');
create type payment_provider  as enum ('mangopay', 'stripe');
create type shipment_status   as enum ('label_created', 'in_transit', 'ready_for_pickup', 'delivered', 'returned', 'lost');
create type message_risk      as enum ('ok', 'suspicious', 'blocked');
create type report_target     as enum ('listing', 'user', 'message');
create type report_reason     as enum ('scam', 'prohibited_item', 'wrong_category', 'duplicate', 'offensive', 'other');
create type report_status     as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type moderation_action_type as enum ('warn', 'remove_listing', 'restore_listing', 'ban_user', 'unban_user', 'block_message', 'dismiss');
create type promotion_type    as enum ('top', 'highlight', 'bump', 'urgent');
create type notification_type as enum ('message', 'saved_search', 'price_drop', 'order', 'review', 'moderation', 'system');
create type push_platform     as enum ('ios', 'android', 'web');

-- ---------------------------------------------------------------------
--  Pomocné funkcie
-- ---------------------------------------------------------------------

-- unaccent nie je IMMUTABLE, tento obal ho sprístupní v indexoch a generovaných výrazoch
create or replace function f_unaccent(text) returns text
language sql immutable parallel safe strict as
$$ select public.unaccent('public.unaccent', $1) $$;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Vzdialenosť v km (haversine). Funguje bez PostGIS, presnosť pre inzeráty stačí.
create or replace function distance_km(lat1 double precision, lng1 double precision,
                                       lat2 double precision, lng2 double precision)
returns double precision language sql immutable parallel safe as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- URL slug z názvu: "Horský bicykel Kross" -> "horsky-bicykel-kross"
create or replace function slugify(input text) returns text
language sql immutable parallel safe as $$
  select trim(both '-' from regexp_replace(lower(f_unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'))
$$;

-- ---------------------------------------------------------------------
--  Používatelia
-- ---------------------------------------------------------------------
create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  display_name       text not null check (char_length(display_name) between 2 and 60),
  avatar_url         text,
  bio                text check (char_length(bio) <= 500),
  country            country_code not null default 'SK',
  language           lang_code not null default 'sk',
  -- súkromné: vráti sa len vlastníkovi (RLS) alebo cez reveal_phone()
  phone              text unique,
  phone_verified_at  timestamptz,
  email_verified_at  timestamptz,
  bank_verified_at   timestamptz,
  document_verified_at timestamptz,
  -- 0 = nič, 1 = e-mail, 2 = telefón, 3 = banka alebo doklad
  verification_level smallint not null default 0 check (verification_level between 0 and 3),
  is_business        boolean not null default false,
  business_name      text,
  business_id        text,          -- IČO
  business_vat_id    text,          -- IČ DPH / DIČ
  rating_avg         numeric(3,2) not null default 0,
  rating_count       integer not null default 0,
  sales_count        integer not null default 0,
  purchases_count    integer not null default 0,
  home_lat           double precision,
  home_lng           double precision,
  home_city          text,
  search_radius_km   smallint not null default 30,
  is_moderator       boolean not null default false,
  banned_until       timestamptz,
  ban_reason         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  last_seen_at       timestamptz
);
create index profiles_rating_idx on profiles (rating_avg desc, rating_count desc);
create trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();

-- Verejný pohľad na profil bez súkromných údajov. Klienti čítajú tento, nie tabuľku.
create view public_profiles as
  select id, display_name, avatar_url, bio, country, is_business, business_name,
         verification_level, rating_avg, rating_count, sales_count, home_city,
         created_at, last_seen_at,
         (phone_verified_at is not null) as phone_verified,
         (bank_verified_at is not null or document_verified_at is not null) as identity_verified,
         (banned_until is not null and banned_until > now()) as is_banned
  from profiles;

create table verifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  type        verification_type not null,
  status      verification_status not null default 'pending',
  provider    text,                     -- twilio, bankid, veriff, manual
  provider_ref text,
  payload     jsonb not null default '{}'::jsonb,   -- bez citlivých dát, len referencie
  created_at  timestamptz not null default now(),
  verified_at timestamptz,
  expires_at  timestamptz
);
create index verifications_user_idx on verifications (user_id, type, status);

create table push_tokens (
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text not null,
  platform   push_platform not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  primary key (user_id, token)
);

-- ---------------------------------------------------------------------
--  Kategórie
-- ---------------------------------------------------------------------
create table categories (
  id          integer generated always as identity primary key,
  parent_id   integer references categories(id) on delete restrict,
  slug        text not null,                 -- rovnaký pre SK aj CZ URL, bez diakritiky
  name_sk     text not null,
  name_cs     text not null,
  icon        text,
  sort_order  smallint not null default 0,
  -- cesta pre rýchle vyhľadanie podstromu, napr. "1.14.37"
  path        text not null default '',
  depth       smallint not null default 0,
  -- JSON schéma atribútov špecifických pre kategóriu (rok výroby, veľkosť, …)
  attributes_schema jsonb not null default '[]'::jsonb,
  is_active   boolean not null default true,
  unique (parent_id, slug)
);
create index categories_path_idx on categories (path text_pattern_ops);

-- Udržiavanie path/depth
create or replace function categories_set_path() returns trigger
language plpgsql as $$
declare parent_path text; parent_depth smallint;
begin
  if new.parent_id is null then
    new.path = new.id::text; new.depth = 0;
  else
    select path, depth into parent_path, parent_depth from categories where id = new.parent_id;
    new.path = parent_path || '.' || new.id::text; new.depth = parent_depth + 1;
  end if;
  return new;
end $$;
create trigger categories_path before insert or update of parent_id on categories
  for each row execute function categories_set_path();

-- ---------------------------------------------------------------------
--  Inzeráty
-- ---------------------------------------------------------------------
create table listings (
  id             bigint generated always as identity primary key,
  owner_id       uuid not null references profiles(id) on delete cascade,
  category_id    integer not null references categories(id) on delete restrict,
  title          text not null check (char_length(title) between 5 and 120),
  slug           text not null,
  description    text not null check (char_length(description) <= 5000),
  price_type     price_type not null default 'fixed',
  -- v najmenších jednotkách (centy, haliere); null pri 'free' a 'on_request'
  price_minor    integer check (price_minor is null or price_minor >= 0),
  currency       currency_code not null,
  condition      item_condition not null default 'used',
  country        country_code not null,
  city           text not null,
  district_code  text,                    -- kód okresu (SK: BA1, CZ: CZ0642)
  postal_code    text,
  lat            double precision not null check (lat between 47 and 52),
  lng            double precision not null check (lng between 12 and 23),
  delivery_available boolean not null default false,
  safe_payment   boolean not null default false,
  status         listing_status not null default 'draft',
  views_count    integer not null default 0,
  favorites_count integer not null default 0,
  ai_prefilled   boolean not null default false,
  risk_score     numeric(4,3) not null default 0,     -- 0 až 1, z automatickej kontroly
  risk_reasons   text[] not null default '{}',
  search_vector  tsvector,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  published_at   timestamptz,
  expires_at     timestamptz,
  sold_at        timestamptz,
  -- bezpečná platba a doručenie len s cenou
  check (not safe_payment or (price_type in ('fixed','negotiable') and price_minor > 0)),
  check (price_type <> 'free' or price_minor is null or price_minor = 0),
  -- mena musí sedieť s krajinou
  check ((country = 'SK' and currency = 'EUR') or (country = 'CZ' and currency = 'CZK'))
);
create index listings_active_idx      on listings (status, published_at desc) where status = 'active';
create index listings_owner_idx       on listings (owner_id, status);
create index listings_category_idx    on listings (category_id) where status = 'active';
create index listings_geo_idx         on listings (lat, lng) where status = 'active';
create index listings_price_idx       on listings (currency, price_minor) where status = 'active';
create index listings_search_idx      on listings using gin (search_vector);
create index listings_title_trgm_idx  on listings using gin (f_unaccent(title) gin_trgm_ops);
create index listings_expires_idx     on listings (expires_at) where status = 'active';
create trigger listings_updated_at before update on listings for each row execute function set_updated_at();

-- full-text vektor: názov (A), popis (B), názov kategórie (C), bez diakritiky
create or replace function listings_set_search() returns trigger
language plpgsql as $$
declare cat_name text;
begin
  select name_sk || ' ' || name_cs into cat_name from categories where id = new.category_id;
  new.search_vector :=
      setweight(to_tsvector('simple', f_unaccent(new.title)), 'A')
   || setweight(to_tsvector('simple', f_unaccent(left(new.description, 2000))), 'B')
   || setweight(to_tsvector('simple', f_unaccent(coalesce(cat_name, ''))), 'C');
  if new.slug is null or new.slug = '' or (tg_op = 'UPDATE' and new.title is distinct from old.title) then
    new.slug := left(slugify(new.title), 80);
  end if;
  return new;
end $$;
create trigger listings_search before insert or update of title, description, category_id on listings
  for each row execute function listings_set_search();

-- Pri zverejnení nastav published_at a expires_at (60 dní); pri predaji sold_at
create or replace function listings_lifecycle() returns trigger
language plpgsql as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    new.published_at := coalesce(new.published_at, now());
    new.expires_at := now() + interval '60 days';
  end if;
  if new.status = 'sold' and (tg_op = 'INSERT' or old.status is distinct from 'sold') then
    new.sold_at := now();
  end if;
  return new;
end $$;
create trigger listings_lifecycle before insert or update of status on listings
  for each row execute function listings_lifecycle();

-- Limit aktívnych inzerátov podľa stupňa overenia: 0-1 => 3, 2 => 20, 3 => bez limitu, firma bez limitu
create or replace function listings_enforce_limit() returns trigger
language plpgsql as $$
declare lvl smallint; biz boolean; active_cnt integer; max_cnt integer;
begin
  if new.status <> 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'active' then return new; end if;
  select verification_level, is_business into lvl, biz from profiles where id = new.owner_id;
  if biz or lvl >= 3 then return new; end if;
  max_cnt := case when lvl >= 2 then 20 else 3 end;
  select count(*) into active_cnt from listings where owner_id = new.owner_id and status = 'active' and id <> new.id;
  if active_cnt >= max_cnt then
    raise exception 'Limit aktívnych inzerátov (%) pre tento stupeň overenia. Over si telefón alebo bankovú identitu.', max_cnt
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger listings_limit before insert or update of status on listings
  for each row execute function listings_enforce_limit();

create table listing_images (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references listings(id) on delete cascade,
  storage_path text not null,       -- cesta v Supabase Storage, bucket "listing-images"
  width       integer,
  height      integer,
  bytes       integer,
  sort_order  smallint not null default 0,
  phash       text,                 -- perceptuálny hash pre detekciu duplicít a podvodných fotiek
  created_at  timestamptz not null default now(),
  unique (listing_id, sort_order)
);
create index listing_images_phash_idx on listing_images (phash);

create table listing_attributes (
  listing_id  bigint not null references listings(id) on delete cascade,
  key         text not null,        -- napr. "year", "mileage_km", "size"
  value       text not null,
  value_num   numeric,              -- číselná kópia pre rozsahové filtre
  primary key (listing_id, key)
);
create index listing_attributes_kv_idx on listing_attributes (key, value);
create index listing_attributes_num_idx on listing_attributes (key, value_num);

create table price_history (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references listings(id) on delete cascade,
  price_minor integer,
  changed_at  timestamptz not null default now()
);
create index price_history_listing_idx on price_history (listing_id, changed_at desc);

create or replace function listings_log_price() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.price_minor is distinct from old.price_minor then
    insert into price_history (listing_id, price_minor) values (new.id, new.price_minor);
  end if;
  return new;
end $$;
create trigger listings_price after insert or update of price_minor on listings
  for each row execute function listings_log_price();

-- ---------------------------------------------------------------------
--  Obľúbené a uložené hľadania
-- ---------------------------------------------------------------------
create table favorites (
  user_id    uuid not null references profiles(id) on delete cascade,
  listing_id bigint not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_idx on favorites (listing_id);

create or replace function favorites_count() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update listings set favorites_count = favorites_count + 1 where id = new.listing_id;
  else
    update listings set favorites_count = greatest(favorites_count - 1, 0) where id = old.listing_id;
  end if;
  return null;
end $$;
create trigger favorites_cnt after insert or delete on favorites for each row execute function favorites_count();

create table saved_searches (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references profiles(id) on delete cascade,
  name          text not null,
  query         text,
  -- rovnaký tvar ako parametre search_listings(): category_id, lat, lng, radius_km, min, max, …
  filters       jsonb not null default '{}'::jsonb,
  notify        boolean not null default true,
  last_checked_at  timestamptz not null default now(),
  last_notified_at timestamptz,
  created_at    timestamptz not null default now()
);
create index saved_searches_notify_idx on saved_searches (last_checked_at) where notify;

-- ---------------------------------------------------------------------
--  Správy
-- ---------------------------------------------------------------------
create table conversations (
  id              bigint generated always as identity primary key,
  listing_id      bigint not null references listings(id) on delete cascade,
  buyer_id        uuid not null references profiles(id) on delete cascade,
  seller_id       uuid not null references profiles(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  buyer_unread    integer not null default 0,
  seller_unread   integer not null default 0,
  buyer_archived  boolean not null default false,
  seller_archived boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index conversations_buyer_idx  on conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on conversations (seller_id, last_message_at desc);

create table messages (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  risk            message_risk not null default 'ok',
  risk_score      numeric(4,3) not null default 0,
  risk_reasons    text[] not null default '{}',
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index messages_conv_idx on messages (conversation_id, created_at);
create index messages_risk_idx on messages (risk, created_at desc) where risk <> 'ok';

create or replace function messages_after_insert() returns trigger
language plpgsql as $$
begin
  update conversations c set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 120),
    buyer_unread  = case when new.sender_id = c.seller_id then buyer_unread + 1 else buyer_unread end,
    seller_unread = case when new.sender_id = c.buyer_id then seller_unread + 1 else seller_unread end
  where c.id = new.conversation_id;
  return null;
end $$;
create trigger messages_ai after insert on messages for each row execute function messages_after_insert();

-- Odkrytie telefónneho čísla: logované a limitované na 10 denne
create table phone_reveals (
  id         bigint generated always as identity primary key,
  viewer_id  uuid not null references profiles(id) on delete cascade,
  listing_id bigint not null references listings(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index phone_reveals_viewer_idx on phone_reveals (viewer_id, created_at desc);

create or replace function reveal_phone(p_listing_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare v_viewer uuid := auth.uid(); v_owner uuid; v_phone text; v_today integer;
begin
  if v_viewer is null then raise exception 'Prihlás sa, aby si videl číslo.' using errcode = 'insufficient_privilege'; end if;
  select owner_id into v_owner from listings where id = p_listing_id and status in ('active','reserved');
  if v_owner is null then raise exception 'Inzerát nie je aktívny.'; end if;
  select count(*) into v_today from phone_reveals where viewer_id = v_viewer and created_at > now() - interval '24 hours';
  if v_today >= 10 then raise exception 'Denný limit zobrazení čísla je 10. Napíš predajcovi v aplikácii.' using errcode = 'check_violation'; end if;
  insert into phone_reveals (viewer_id, listing_id) values (v_viewer, p_listing_id);
  select phone into v_phone from profiles where id = v_owner and phone_verified_at is not null;
  return v_phone;   -- null, ak predajca nemá overené číslo alebo ho nezverejňuje
end $$;

-- ---------------------------------------------------------------------
--  Bezpečná platba (objednávky), doručenie, hodnotenia
-- ---------------------------------------------------------------------
create table orders (
  id                  bigint generated always as identity primary key,
  listing_id          bigint not null references listings(id) on delete restrict,
  buyer_id            uuid not null references profiles(id) on delete restrict,
  seller_id           uuid not null references profiles(id) on delete restrict,
  currency            currency_code not null,
  item_minor          integer not null check (item_minor > 0),
  service_fee_minor   integer not null default 0 check (service_fee_minor >= 0),
  shipping_minor      integer not null default 0 check (shipping_minor >= 0),
  total_minor         integer generated always as (item_minor + service_fee_minor + shipping_minor) stored,
  status              order_status not null default 'created',
  provider            payment_provider,
  provider_payment_id text,
  provider_transfer_id text,
  pickup_point_id     text,          -- id výdajného miesta Packeta
  dispute_reason      text,
  paid_at             timestamptz,
  shipped_at          timestamptz,
  delivered_at        timestamptz,
  auto_release_at     timestamptz,   -- delivered_at + 48 h
  released_at         timestamptz,
  refunded_at         timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (buyer_id <> seller_id)
);
create index orders_buyer_idx  on orders (buyer_id, created_at desc);
create index orders_seller_idx on orders (seller_id, created_at desc);
create index orders_release_idx on orders (auto_release_at) where status = 'delivered';
create unique index orders_one_open_per_listing on orders (listing_id) where status in ('created','paid','shipped','delivered','disputed');
create trigger orders_updated_at before update on orders for each row execute function set_updated_at();

create table order_events (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  actor_id    uuid references profiles(id) on delete set null,
  note        text,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, created_at);

-- Stavový automat: povolené prechody a časové pečiatky (pred zápisom)
create or replace function orders_transition() returns trigger
language plpgsql as $$
declare allowed boolean;
begin
  if new.status = old.status then return new; end if;
  allowed := case old.status
    when 'created'   then new.status in ('paid', 'cancelled')
    when 'paid'      then new.status in ('shipped', 'cancelled', 'refunded')
    when 'shipped'   then new.status in ('delivered', 'disputed', 'refunded')
    when 'delivered' then new.status in ('released', 'disputed')
    when 'disputed'  then new.status in ('released', 'refunded')
    else false end;
  if not allowed then
    raise exception 'Neplatný prechod objednávky % -> %', old.status, new.status using errcode = 'check_violation';
  end if;
  case new.status
    when 'paid'      then new.paid_at := now();
    when 'shipped'   then new.shipped_at := now();
    when 'delivered' then new.delivered_at := now(); new.auto_release_at := now() + interval '48 hours';
    when 'released'  then new.released_at := now();
    when 'refunded'  then new.refunded_at := now();
    when 'cancelled' then new.cancelled_at := now();
    else null;
  end case;
  return new;
end $$;
create trigger orders_state before update of status on orders
  for each row execute function orders_transition();

-- Záznam udalosti a vedľajšie účinky (po zápise): rezervácia, predaj, počítadlá
create or replace function orders_after_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.status = old.status then return null; end if;
  insert into order_events (order_id, from_status, to_status, actor_id)
  values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid());
  if new.status = 'paid' then
    update listings set status = 'reserved' where id = new.listing_id and status = 'active';
  elsif new.status = 'released' then
    update listings set status = 'sold' where id = new.listing_id;
    update profiles set sales_count = sales_count + 1 where id = new.seller_id;
    update profiles set purchases_count = purchases_count + 1 where id = new.buyer_id;
  elsif new.status in ('refunded', 'cancelled') then
    update listings set status = 'active' where id = new.listing_id and status = 'reserved';
  end if;
  return null;
end $$;
create trigger orders_events after insert or update of status on orders
  for each row execute function orders_after_change();

-- Výpočet poplatku pre kupujúceho: 3 % + 0,50 €, minimum 1 € (v CZK: 3 % + 12 Kč, minimum 25 Kč)
create or replace function service_fee_minor(p_item_minor integer, p_currency currency_code) returns integer
language sql immutable as $$
  select case p_currency
    when 'EUR' then greatest(100, round(p_item_minor * 0.03)::integer + 50)
    when 'CZK' then greatest(2500, round(p_item_minor * 0.03)::integer + 1200)
  end
$$;

create table shipments (
  id              bigint generated always as identity primary key,
  order_id        bigint not null unique references orders(id) on delete cascade,
  carrier         text not null default 'packeta',
  carrier_ref     text,
  tracking_number text,
  label_url       text,
  pickup_point_id text,
  pickup_point_name text,
  status          shipment_status not null default 'label_created',
  weight_grams    integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger shipments_updated_at before update on shipments for each row execute function set_updated_at();

create table reviews (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references orders(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 1000),
  created_at  timestamptz not null default now(),
  unique (order_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index reviews_reviewee_idx on reviews (reviewee_id, created_at desc);

-- hodnotiť môže len účastník dokončenej objednávky
create or replace function reviews_validate() returns trigger
language plpgsql as $$
declare o orders;
begin
  select * into o from orders where id = new.order_id;
  if o.status not in ('released', 'refunded') then
    raise exception 'Hodnotiť sa dá až po dokončení objednávky.' using errcode = 'check_violation';
  end if;
  if not ((new.reviewer_id = o.buyer_id and new.reviewee_id = o.seller_id) or
          (new.reviewer_id = o.seller_id and new.reviewee_id = o.buyer_id)) then
    raise exception 'Hodnotenie môže dať len kupujúci alebo predajca tejto objednávky.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger reviews_check before insert on reviews for each row execute function reviews_validate();

create or replace function reviews_recalc() returns trigger
language plpgsql as $$
declare target uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update profiles p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from reviews where reviewee_id = target), 0),
    rating_count = (select count(*) from reviews where reviewee_id = target)
  where p.id = target;
  return null;
end $$;
create trigger reviews_agg after insert or update or delete on reviews for each row execute function reviews_recalc();

-- ---------------------------------------------------------------------
--  Nahlásenia a moderácia (DSA)
-- ---------------------------------------------------------------------
create table reports (
  id           bigint generated always as identity primary key,
  reporter_id  uuid references profiles(id) on delete set null,   -- null = anonymné nahlásenie z webu
  reporter_email text,
  target_type  report_target not null,
  target_id    text not null,
  reason       report_reason not null,
  details      text check (char_length(details) <= 2000),
  status       report_status not null default 'open',
  resolved_by  uuid references profiles(id) on delete set null,
  resolution   text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index reports_open_idx on reports (status, created_at) where status in ('open','reviewing');
create index reports_target_idx on reports (target_type, target_id);

create table moderation_actions (
  id           bigint generated always as identity primary key,
  moderator_id uuid not null references profiles(id) on delete restrict,
  report_id    bigint references reports(id) on delete set null,
  target_type  report_target not null,
  target_id    text not null,
  action       moderation_action_type not null,
  note         text,
  created_at   timestamptz not null default now()
);
create index moderation_target_idx on moderation_actions (target_type, target_id, created_at desc);

-- ---------------------------------------------------------------------
--  Platené doplnky, notifikácie, kurzy
-- ---------------------------------------------------------------------
create table promotions (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references listings(id) on delete cascade,
  type        promotion_type not null,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  price_minor integer not null check (price_minor >= 0),
  currency    currency_code not null,
  provider_payment_id text,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index promotions_active_idx on promotions (type, ends_at);
create index promotions_listing_idx on promotions (listing_id);

create table notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,   -- listing_id, conversation_id, order_id …
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where read_at is null;

create table exchange_rates (
  base        currency_code not null,
  quote       currency_code not null,
  rate        numeric(12,6) not null check (rate > 0),
  valid_date  date not null,
  primary key (base, quote, valid_date)
);

-- ---------------------------------------------------------------------
--  Vyhľadávanie: jedna funkcia pre web, aplikáciu aj uložené hľadania
-- ---------------------------------------------------------------------
create or replace function search_listings(
  p_query        text default null,
  p_category_id  integer default null,       -- vrátane podkategórií
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_radius_km    integer default null,
  p_min_minor    integer default null,       -- v mene p_currency
  p_max_minor    integer default null,
  p_currency     currency_code default null,
  p_country      country_code default null,
  p_condition    item_condition[] default null,
  p_delivery     boolean default null,
  p_safe_payment boolean default null,
  p_verified_only boolean default false,
  p_sort         text default 'newest',      -- newest | nearest | cheapest | priciest
  p_limit        integer default 40,
  p_offset       integer default 0
) returns table (
  id bigint, title text, slug text, price_minor integer, currency currency_code,
  price_type price_type, condition item_condition, city text, country country_code,
  distance_km double precision, delivery_available boolean, safe_payment boolean,
  owner_id uuid, owner_verified boolean, owner_rating numeric, is_promoted boolean,
  first_image text, published_at timestamptz, total_count bigint
)
language sql stable as $$
  with cat as (
    select path from categories where id = p_category_id
  ),
  base as (
    select l.*,
      case when p_lat is null then null else distance_km(p_lat, p_lng, l.lat, l.lng) end as dist,
      exists (select 1 from promotions pr where pr.listing_id = l.id and pr.type = 'top' and pr.ends_at > now()) as promoted,
      case when p_query is null or p_query = '' then 0
           else ts_rank(l.search_vector, websearch_to_tsquery('simple', f_unaccent(p_query))) end as rank
    from listings l
    where l.status = 'active'
      and (p_query is null or p_query = ''
           or l.search_vector @@ websearch_to_tsquery('simple', f_unaccent(p_query))
           or f_unaccent(l.title) % f_unaccent(p_query))
      and (p_category_id is null or l.category_id = p_category_id
           or l.category_id in (select c.id from categories c, cat where c.path like cat.path || '.%'))
      and (p_country is null or l.country = p_country)
      and (p_currency is null or l.currency = p_currency)
      and (p_min_minor is null or l.price_minor >= p_min_minor)
      and (p_max_minor is null or l.price_minor <= p_max_minor)
      and (p_condition is null or l.condition = any (p_condition))
      and (p_delivery is not true or l.delivery_available)
      and (p_safe_payment is not true or l.safe_payment)
      and (p_lat is null or p_radius_km is null
           -- hrubý obdĺžnik cez index, potom presná vzdialenosť
           or (l.lat between p_lat - p_radius_km / 111.0 and p_lat + p_radius_km / 111.0
               and l.lng between p_lng - p_radius_km / (111.0 * cos(radians(p_lat))) and p_lng + p_radius_km / (111.0 * cos(radians(p_lat)))
               and distance_km(p_lat, p_lng, l.lat, l.lng) <= p_radius_km))
      and (not p_verified_only or exists (select 1 from profiles p where p.id = l.owner_id and p.verification_level >= 2))
  )
  select b.id, b.title, b.slug, b.price_minor, b.currency, b.price_type, b.condition, b.city, b.country,
         b.dist, b.delivery_available, b.safe_payment,
         b.owner_id, (p.verification_level >= 2), p.rating_avg, b.promoted,
         (select storage_path from listing_images i where i.listing_id = b.id order by sort_order limit 1),
         b.published_at,
         count(*) over ()
  from base b join profiles p on p.id = b.owner_id
  order by b.promoted desc,
    case when p_sort = 'nearest'  then b.dist end asc nulls last,
    case when p_sort = 'cheapest' then coalesce(b.price_minor, 0) end asc,
    case when p_sort = 'priciest' then coalesce(b.price_minor, 0) end desc,
    case when p_query is not null and p_query <> '' then b.rank end desc,
    b.published_at desc
  limit p_limit offset p_offset
$$;

-- Podobné predané inzeráty pre návrh ceny (vstup pre funkciu „inzerát z fotky“)
create or replace function similar_sold_prices(p_category_id integer, p_title text, p_currency currency_code, p_limit integer default 20)
returns table (title text, price_minor integer, sold_at timestamptz, similarity real)
language sql stable as $$
  select l.title, l.price_minor, l.sold_at, similarity(f_unaccent(l.title), f_unaccent(p_title))
  from listings l
  where l.status = 'sold' and l.category_id = p_category_id and l.currency = p_currency and l.price_minor > 0
    and l.sold_at > now() - interval '180 days'
  order by similarity(f_unaccent(l.title), f_unaccent(p_title)) desc, l.sold_at desc
  limit p_limit
$$;

-- Zvýšenie počítadla zobrazení bez práva na update celej tabuľky
create or replace function increment_views(p_listing_id bigint) returns void
language sql security definer set search_path = public as $$
  update listings set views_count = views_count + 1 where id = p_listing_id and status = 'active'
$$;

-- Označenie konverzácie ako prečítanej
create or replace function mark_conversation_read(p_conversation_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  update conversations set
    buyer_unread  = case when buyer_id  = v_user then 0 else buyer_unread end,
    seller_unread = case when seller_id = v_user then 0 else seller_unread end
  where id = p_conversation_id and v_user in (buyer_id, seller_id);
  update messages set read_at = now()
  where conversation_id = p_conversation_id and sender_id <> v_user and read_at is null;
end $$;

-- ---------------------------------------------------------------------
--  Riadenie prístupu (RLS). Service role Supabase politiky obchádza.
-- ---------------------------------------------------------------------
create or replace function is_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_moderator from profiles where id = auth.uid()), false)
$$;

alter table profiles enable row level security;
create policy profiles_select_own on profiles for select using (id = auth.uid() or is_moderator());
create policy profiles_update_own on profiles for update using (id = auth.uid()) with check (id = auth.uid() and is_moderator() = (select is_moderator from profiles where id = auth.uid()));
-- verejné údaje idú cez view public_profiles, ktorý beží s právami vlastníka
alter view public_profiles set (security_invoker = false);

alter table verifications enable row level security;
create policy verifications_own on verifications for select using (user_id = auth.uid() or is_moderator());

alter table push_tokens enable row level security;
create policy push_tokens_own on push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table categories enable row level security;
create policy categories_public on categories for select using (true);

alter table listings enable row level security;
create policy listings_public_read on listings for select
  using (status in ('active','reserved','sold') or owner_id = auth.uid() or is_moderator());
create policy listings_insert_own on listings for insert
  with check (owner_id = auth.uid() and status in ('draft','pending_review','active')
              and not exists (select 1 from profiles where id = auth.uid() and banned_until > now()));
create policy listings_update_own on listings for update
  using (owner_id = auth.uid() or is_moderator())
  with check (owner_id = auth.uid() or is_moderator());
create policy listings_delete_own on listings for delete using (owner_id = auth.uid() and status = 'draft');

alter table listing_images enable row level security;
create policy listing_images_read on listing_images for select
  using (exists (select 1 from listings l where l.id = listing_id and (l.status in ('active','reserved','sold') or l.owner_id = auth.uid() or is_moderator())));
create policy listing_images_write on listing_images for all
  using (exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid()));

alter table listing_attributes enable row level security;
create policy listing_attributes_read on listing_attributes for select using (true);
create policy listing_attributes_write on listing_attributes for all
  using (exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid()));

alter table price_history enable row level security;
create policy price_history_read on price_history for select using (true);

alter table favorites enable row level security;
create policy favorites_own on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table saved_searches enable row level security;
create policy saved_searches_own on saved_searches for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table conversations enable row level security;
create policy conversations_participants on conversations for select using (auth.uid() in (buyer_id, seller_id) or is_moderator());
create policy conversations_start on conversations for insert
  with check (buyer_id = auth.uid() and seller_id = (select owner_id from listings where id = listing_id and status in ('active','reserved')));
create policy conversations_update on conversations for update using (auth.uid() in (buyer_id, seller_id));

alter table messages enable row level security;
create policy messages_read on messages for select
  using (exists (select 1 from conversations c where c.id = conversation_id and (auth.uid() in (c.buyer_id, c.seller_id) or is_moderator())));
create policy messages_send on messages for insert
  with check (sender_id = auth.uid()
              and exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id))
              and not exists (select 1 from profiles where id = auth.uid() and banned_until > now()));

alter table phone_reveals enable row level security;   -- iba cez reveal_phone()

alter table orders enable row level security;
create policy orders_participants on orders for select using (auth.uid() in (buyer_id, seller_id) or is_moderator());
-- vytváranie a zmeny stavov robia Edge Functions (service role) po overení platby

alter table order_events enable row level security;
create policy order_events_participants on order_events for select
  using (exists (select 1 from orders o where o.id = order_id and (auth.uid() in (o.buyer_id, o.seller_id) or is_moderator())));

alter table shipments enable row level security;
create policy shipments_participants on shipments for select
  using (exists (select 1 from orders o where o.id = order_id and (auth.uid() in (o.buyer_id, o.seller_id) or is_moderator())));

alter table reviews enable row level security;
create policy reviews_public on reviews for select using (true);
create policy reviews_insert on reviews for insert with check (reviewer_id = auth.uid());

alter table reports enable row level security;
create policy reports_insert on reports for insert with check (reporter_id is null or reporter_id = auth.uid());
create policy reports_read on reports for select using (reporter_id = auth.uid() or is_moderator());
create policy reports_moderate on reports for update using (is_moderator());

alter table moderation_actions enable row level security;
create policy moderation_read on moderation_actions for select using (is_moderator());
create policy moderation_write on moderation_actions for insert with check (is_moderator() and moderator_id = auth.uid());

alter table promotions enable row level security;
create policy promotions_read on promotions for select using (true);

alter table notifications enable row level security;
create policy notifications_own on notifications for select using (user_id = auth.uid());
create policy notifications_mark on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table exchange_rates enable row level security;
create policy exchange_rates_public on exchange_rates for select using (true);

-- ---------------------------------------------------------------------
--  Supabase: profil sa vytvorí automaticky pri registrácii
-- ---------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, country, language, email_verified_at, verification_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Používateľ ' || left(new.id::text, 4)),
    coalesce((new.raw_user_meta_data ->> 'country')::country_code, 'SK'),
    coalesce((new.raw_user_meta_data ->> 'language')::lang_code, 'sk'),
    case when new.email_confirmed_at is not null then new.email_confirmed_at end,
    case when new.email_confirmed_at is not null then 1 else 0 end
  );
  return new;
end $$;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_user_meta_data') then
    execute 'create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user()';
  end if;
end $$;

-- ---------------------------------------------------------------------
--  Údržbové úlohy (spúšťa pg_cron alebo Edge Function cron)
-- ---------------------------------------------------------------------
-- Expirácia inzerátov po 60 dňoch bez obnovenia
create or replace function expire_listings() returns integer
language sql as $$
  with u as (update listings set status = 'expired' where status = 'active' and expires_at < now() returning 1)
  select count(*)::integer from u
$$;

-- Automatické uvoľnenie peňazí 48 h po prevzatí bez reklamácie (samotný prevod spraví Edge Function podľa order_events)
create or replace function auto_release_orders() returns integer
language sql as $$
  with u as (update orders set status = 'released' where status = 'delivered' and auto_release_at < now() returning 1)
  select count(*)::integer from u
$$;

-- ---------------------------------------------------------------------
--  PostGIS (voliteľné): presný geografický index pre hľadanie v okruhu
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'postgis') then
    execute 'create extension if not exists postgis';
    execute 'alter table listings add column if not exists geog geography(Point, 4326) generated always as (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) stored';
    execute 'create index if not exists listings_geog_idx on listings using gist (geog) where status = ''active''';
  end if;
end $$;
