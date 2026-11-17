-- Jadran Hills CRM – schéma databázy Supabase (stav nasadený v projekte).
--
-- Model prístupu:
--   • Dáta projektu sú v tabuľke crm_docs (jeden riadok = jedna časť projektu).
--   • Čítať ich smie len člen projektu, zapisovať vlastník a editor (RLS).
--   • Členstvo sa viaže na konkrétny účet (user_id), nie iba na e-mailovú adresu.
--   • Účty nevznikajú verejnou registráciou: prístup sa vytvára jednorazovým kódom –
--     kódom prvého vlastníka (crm_setup.owner_code_hash) alebo pozvánkou (crm_invites).
--     Kód overuje funkcia Edge „crm-join“ (supabase/functions/crm-join).
--   • V databáze sú uložené len odtlačky kódov (SHA-256), nikdy kódy samotné.
--
-- Súbor slúži ako dokumentácia a na založenie novej inštancie. Neobsahuje žiadne dáta.

-- ───────────────────────── Tabuľky ─────────────────────────

create table public.crm_members (
  email text primary key check (email = lower(email) and char_length(email) between 5 and 200),
  role text not null check (role in ('owner', 'editor', 'viewer')),
  name text not null default '' check (char_length(name) <= 120),
  added_at timestamptz not null default now(),
  user_id uuid unique
);

create table public.crm_setup (
  id integer primary key default 1 check (id = 1),
  owner_code_hash text,
  seed_token_hash text,
  -- e-mail o novom dopyte: adresa skriptu na hostingu a podpisový kľúč (pozri inquiries_notify)
  notify_url text check (notify_url is null or notify_url ~ '^https://[^[:space:]]+$'),
  notify_secret text check (notify_secret is null or char_length(notify_secret) >= 32)
);

create table public.crm_docs (
  part text primary key check (part ~ '^[A-Za-z]{2,40}$'),
  body jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.crm_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 254),
  role text not null check (role in ('owner', 'editor', 'viewer')),
  name text not null default '' check (char_length(name) <= 120),
  code_hash text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid,
  expires_at timestamptz not null,
  used_at timestamptz
);
create index crm_invites_email on public.crm_invites (email);

-- Počítadlo pokusov o pripojenie kódom (ochrana pred skúšaním kódov).
create table public.crm_join_log (
  slot timestamptz primary key,
  n integer not null default 0
);

-- Dopyty z kontaktného formulára verejnej stránky.
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 200 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text not null default '' check (char_length(phone) <= 40),
  message text not null default '' check (char_length(message) <= 2000),
  interest text not null default '' check (char_length(interest) <= 80),
  consent boolean not null check (consent),
  handled boolean not null default false,
  -- jazyk stránky, z ktorej dopyt prišiel (sk, en, hr, de, hu) – napovie, v akej reči odpovedať
  lang text not null default 'sk' check (lang ~ '^[a-z]{2}$')
);

alter table public.crm_members enable row level security;
alter table public.crm_setup enable row level security;      -- bez pravidiel: cez API nedostupné
alter table public.crm_docs enable row level security;
alter table public.crm_invites enable row level security;
alter table public.crm_join_log enable row level security;   -- bez pravidiel: cez API nedostupné
alter table public.inquiries enable row level security;

insert into public.crm_setup (id) values (1);
alter publication supabase_realtime add table public.crm_docs;

-- ───────────────────────── Kto je prihlásený a aké má oprávnenie ─────────────────────────

create function public.crm_email() returns text
language sql stable security definer set search_path = '' as $$
  select lower(u.email) from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null
$$;

create function public.crm_role() returns text
language sql stable security definer set search_path = '' as $$
  select m.role
  from public.crm_members m
  join auth.users u on u.id = m.user_id
  where m.user_id = (select auth.uid())
    and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until < now())
$$;

create function public.crm_has_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.crm_members where role = 'owner' and user_id is not null)
$$;

-- ───────────────────────── Pravidlá prístupu ─────────────────────────

create policy "members: own row, owner sees all" on public.crm_members for select to authenticated
  using (((select public.crm_role()) = 'owner') or (user_id = (select auth.uid())));
create policy "members: owner adds" on public.crm_members for insert to authenticated
  with check (false);  -- členovia vznikajú len uplatnením kódu
create policy "members: owner changes" on public.crm_members for update to authenticated
  using ((select public.crm_role()) = 'owner') with check ((select public.crm_role()) = 'owner');
create policy "members: owner removes" on public.crm_members for delete to authenticated
  using ((select public.crm_role()) = 'owner');
revoke update on public.crm_members from authenticated, anon;
grant update (role, name) on public.crm_members to authenticated;

create policy "docs: members read" on public.crm_docs for select to authenticated
  using ((select public.crm_role()) is not null);
create policy "docs: editors add" on public.crm_docs for insert to authenticated
  with check ((select public.crm_role()) in ('owner', 'editor'));
create policy "docs: editors change" on public.crm_docs for update to authenticated
  using ((select public.crm_role()) in ('owner', 'editor')) with check ((select public.crm_role()) in ('owner', 'editor'));

revoke all on public.crm_invites from anon, authenticated;
grant select (id, email, role, name, created_at, expires_at, used_at) on public.crm_invites to authenticated;
grant delete on public.crm_invites to authenticated;
create policy "invites: owner reads" on public.crm_invites for select to authenticated
  using ((select public.crm_role()) = 'owner');
create policy "invites: owner removes" on public.crm_invites for delete to authenticated
  using ((select public.crm_role()) = 'owner');

revoke all on public.crm_join_log from anon, authenticated;

create policy "inquiries: anyone submits" on public.inquiries for insert to anon, authenticated
  with check (handled = false);
create policy "inquiries: members read" on public.inquiries for select to authenticated
  using ((select public.crm_role()) is not null);
create policy "inquiries: editors change" on public.inquiries for update to authenticated
  using ((select public.crm_role()) in ('owner', 'editor')) with check ((select public.crm_role()) in ('owner', 'editor'));
create policy "inquiries: editors remove" on public.inquiries for delete to authenticated
  using ((select public.crm_role()) in ('owner', 'editor'));

-- ───────────────────────── Spúšťače ─────────────────────────

-- Čas zápisu podľa hodín v okamihu zmeny riadka: neskorší zápis má vždy neskorší čas.
create function public.crm_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    new.updated_at := old.updated_at + interval '1 microsecond';
  end if;
  new.updated_by := (select auth.uid());
  return new;
end $$;
create trigger crm_docs_touch before insert or update on public.crm_docs
  for each row execute function public.crm_touch();

-- Projekt nesmie ostať bez vlastníka.
create function public.crm_keep_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.role = 'owner' and old.user_id is not null
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.user_id is null) then
    if (select count(*) from public.crm_members where role = 'owner' and user_id is not null) <= 1 then
      raise exception 'last_owner';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger crm_keep_owner before delete or update on public.crm_members
  for each row execute function public.crm_keep_owner();

-- Formulár na verejnej stránke: najviac 30 dopytov za hodinu.
create function public.inquiries_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.inquiries where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too_many_inquiries';
  end if;
  return new;
end $$;
create trigger inquiries_limit before insert on public.inquiries
  for each row execute function public.inquiries_limit();

-- E-mail o novom dopyte. Po uložení dopytu databáza zavolá skript na hostingu
-- (web/public/notify.php), ktorý pošle upozornenie na e-mail projektu. Požiadavka je
-- podpísaná kľúčom, ktorý pozná len databáza a hosting. Adresa skriptu a kľúč sa nastavujú
-- raz, mimo tohto súboru (pozri README, časť E-mail o novom dopyte); bez nich sa nič neposiela.
create extension if not exists pg_net with schema extensions;  -- jeho funkcie sú v schéme net, cez API nedostupnej

create function public.inquiries_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cfg record;
  payload jsonb;
  stamp text;
begin
  select s.notify_url, s.notify_secret into cfg from public.crm_setup s where s.id = 1;
  if coalesce(cfg.notify_url, '') = '' or coalesce(cfg.notify_secret, '') = '' then
    return new;
  end if;
  payload := jsonb_build_object('id', new.id, 'created_at', new.created_at, 'name', new.name, 'email', new.email,
    'phone', new.phone, 'interest', new.interest, 'message', new.message, 'lang', new.lang);
  stamp := floor(extract(epoch from clock_timestamp()))::bigint::text;
  -- Podpis: HMAC-SHA256 z „čas.telo“; skript ho overí rovnakým kľúčom.
  perform net.http_post(
    url := cfg.notify_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-JH-Timestamp', stamp,
      'X-JH-Signature', encode(extensions.hmac(convert_to(stamp || '.' || payload::text, 'UTF8'), convert_to(cfg.notify_secret, 'UTF8'), 'sha256'), 'hex')),
    timeout_milliseconds := 10000);
  return new;
exception when others then
  -- Upozornenie nesmie zabrániť uloženiu dopytu.
  return new;
end $$;
create trigger inquiries_notify after insert on public.inquiries
  for each row execute function public.inquiries_notify();

-- ───────────────────────── Prístupové kódy ─────────────────────────

create function public.crm_code_hash(code text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(upper(regexp_replace(coalesce(code, ''), '[[:space:]]', '', 'g')), 'UTF8')), 'hex')
$$;

-- Kód JH-XXXXX-XXXXX-XXXXX-XXXXX (20 znakov z 31 = približne 99 bitov náhody).
create function public.crm_new_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := sha256(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()));
  result text := 'JH';
begin
  for i in 0..19 loop
    if i % 5 = 0 then result := result || '-'; end if;
    result := result || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
  end loop;
  return result;
end $$;

-- Overenie kódu (p_commit = false) alebo jeho uplatnenie pre daný účet (p_commit = true).
create function public.crm_redeem_core(p_user uuid, p_email text, p_hash text, p_name text, p_commit boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := left(btrim(coalesce(p_name, '')), 120);
  v_inv public.crm_invites%rowtype;
begin
  if p_hash is null or v_email = '' then return null; end if;

  -- 1) kód prvého vlastníka: platí, kým projekt vlastníka nemá
  if not exists (select 1 from public.crm_members where role = 'owner' and user_id is not null)
     and exists (select 1 from public.crm_setup s where s.id = 1 and s.owner_code_hash = p_hash) then
    if p_commit then
      if p_user is null then raise exception 'no_user'; end if;
      update public.crm_members set user_id = null where user_id = p_user and email <> v_email;
      insert into public.crm_members (email, role, name, user_id) values (v_email, 'owner', v_name, p_user)
        on conflict (email) do update
          set role = 'owner', user_id = excluded.user_id,
              name = case when excluded.name <> '' then excluded.name else public.crm_members.name end;
      update public.crm_setup set owner_code_hash = null where id = 1;
    end if;
    return 'owner';
  end if;

  -- 2) pozvánka vystavená vlastníkom na tento e-mail
  select * into v_inv from public.crm_invites i
   where i.code_hash = p_hash and i.email = v_email and i.used_at is null and i.expires_at > now();
  if not found then return null; end if;
  if p_commit then
    if p_user is null then raise exception 'no_user'; end if;
    update public.crm_invites set used_at = now() where id = v_inv.id and used_at is null;
    if not found then return null; end if;
    update public.crm_members set user_id = null where user_id = p_user and email <> v_email;
    insert into public.crm_members (email, role, name, user_id)
      values (v_email, v_inv.role, case when v_name <> '' then v_name else v_inv.name end, p_user)
      on conflict (email) do update
        set role = excluded.role, user_id = excluded.user_id,
            name = case when excluded.name <> '' then excluded.name else public.crm_members.name end;
  end if;
  return v_inv.role;
end $$;

-- Prihlásený účet uplatní kód sám (obrazovka „Účet nemá prístup“).
create function public.crm_redeem(code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := public.crm_email();
  v_name text;
  v_role text;
begin
  if v_uid is null or v_email is null then raise exception 'not_signed_in'; end if;
  select coalesce(u.raw_user_meta_data ->> 'name', '') into v_name from auth.users u where u.id = v_uid;
  v_role := public.crm_redeem_core(v_uid, v_email, public.crm_code_hash(code), v_name, true);
  if v_role is null then raise exception 'bad_code'; end if;
  return v_role;
end $$;

create function public.crm_claim_owner(code text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  return public.crm_redeem(code);
end $$;

-- Vlastník vystaví pozvánku; kód sa vráti len raz, v databáze ostane jeho odtlačok.
create function public.crm_invite(p_email text, p_role text, p_name text default '') returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_code text;
begin
  if (select public.crm_role()) is distinct from 'owner' then raise exception 'forbidden'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(v_email) > 254 then raise exception 'bad_email'; end if;
  if p_role is null or p_role not in ('owner', 'editor', 'viewer') then raise exception 'bad_role'; end if;
  if exists (select 1 from public.crm_members m where m.email = v_email and m.user_id = (select auth.uid())) then raise exception 'self'; end if;
  if (select count(*) from public.crm_invites i where i.used_at is null and i.expires_at > now()) >= 50 then raise exception 'too_many_invites'; end if;
  -- staršia nevyužitá pozvánka pre ten istý e-mail prestáva platiť
  update public.crm_invites set expires_at = now() where email = v_email and used_at is null and expires_at > now();
  v_code := public.crm_new_code();
  insert into public.crm_invites (email, role, name, code_hash, created_by, expires_at)
    values (v_email, p_role, left(btrim(coalesce(p_name, '')), 120), public.crm_code_hash(v_code), (select auth.uid()), now() + interval '14 days');
  return v_code;
end $$;

-- Pre funkciu Edge „crm-join“ (len servisná rola): najviac 40 pokusov za 15 minút.
create function public.crm_join_attempt() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_slot timestamptz := date_bin(interval '15 minutes', now(), timestamptz '2000-01-01 00:00:00+00');
  v_n integer;
begin
  insert into public.crm_join_log (slot, n) values (v_slot, 1)
    on conflict (slot) do update set n = public.crm_join_log.n + 1
    returning n into v_n;
  return v_n <= 40;
end $$;

create function public.crm_join_check(p_email text, p_hash text) returns text
language sql security definer set search_path = '' as $$
  select public.crm_redeem_core(null, p_email, p_hash, '', false)
$$;

create function public.crm_join_commit(p_user uuid, p_email text, p_hash text, p_name text) returns text
language sql security definer set search_path = '' as $$
  select public.crm_redeem_core(p_user, p_email, p_hash, p_name, true)
$$;

create function public.crm_user_id(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(coalesce(p_email, ''))) limit 1
$$;

-- Kto smie ktorú funkciu volať.
revoke all on function public.crm_email(), public.crm_role(), public.crm_has_owner() from public, anon;
grant execute on function public.crm_email(), public.crm_role(), public.crm_has_owner() to authenticated;
revoke all on function public.crm_touch(), public.crm_keep_owner(), public.inquiries_limit(), public.inquiries_notify() from public, anon, authenticated;
revoke all on function public.crm_code_hash(text), public.crm_new_code(), public.crm_redeem_core(uuid, text, text, text, boolean),
  public.crm_join_attempt(), public.crm_join_check(text, text), public.crm_join_commit(uuid, text, text, text), public.crm_user_id(text)
  from public, anon, authenticated;
grant execute on function public.crm_code_hash(text), public.crm_redeem_core(uuid, text, text, text, boolean),
  public.crm_join_attempt(), public.crm_join_check(text, text), public.crm_join_commit(uuid, text, text, text), public.crm_user_id(text)
  to service_role;
revoke all on function public.crm_redeem(text), public.crm_claim_owner(text), public.crm_invite(text, text, text) from public, anon;
grant execute on function public.crm_redeem(text), public.crm_claim_owner(text), public.crm_invite(text, text, text) to authenticated;

-- Kód prvého vlastníka sa nastaví raz, mimo tohto súboru (v databáze je len odtlačok):
--   update public.crm_setup set owner_code_hash = public.crm_code_hash('<kód>') where id = 1;
-- Rovnako e-mail o novom dopyte – kľúč vznikne v databáze, adresa sa doplní po nahratí skriptu:
--   update public.crm_setup set notify_secret = encode(extensions.gen_random_bytes(32), 'hex') where id = 1;
--   update public.crm_setup set notify_url = 'https://<web>/notify.php' where id = 1;

-- ───────────────────────── Úložisko súborov ─────────────────────────

-- Obrázky projektu: súkromné, čítanie cez dočasné adresy pre členov.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crm-media', 'crm-media', false, 20971520, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
-- Obrázky verejnej stránky.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/avif']);

create policy "crm-media: members read" on storage.objects for select to authenticated
  using (bucket_id = 'crm-media' and (select public.crm_role()) is not null);
create policy "crm-media: editors add" on storage.objects for insert to authenticated
  with check (bucket_id = 'crm-media' and (select public.crm_role()) in ('owner', 'editor'));
create policy "crm-media: editors remove" on storage.objects for delete to authenticated
  using (bucket_id = 'crm-media' and (select public.crm_role()) in ('owner', 'editor'));
