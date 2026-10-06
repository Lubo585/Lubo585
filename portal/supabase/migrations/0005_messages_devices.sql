-- =====================================================================
-- Správy medzi klientom a inzerentkou (realtime), zariadenia pre push,
-- konfigurácia aplikácie (minimálna verzia, oznamy)
-- =====================================================================

-- ---------- Konverzácie a správy ----------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  client_id       uuid not null references public.profiles(id) on delete cascade,
  advertiser_id   uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  client_unread   int not null default 0,
  advertiser_unread int not null default 0,
  blocked_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique (listing_id, client_id)
);
create index conversations_client_idx     on public.conversations(client_id, last_message_at desc);
create index conversations_advertiser_idx on public.conversations(advertiser_id, last_message_at desc);

create table public.messages (
  id              bigserial primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index messages_conv_idx on public.messages(conversation_id, created_at);

-- Po správe: aktualizuj konverzáciu a počítadlá neprečítaných
create or replace function public.messages_after_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations c set
    last_message_at = new.created_at,
    client_unread     = client_unread     + case when new.sender_id = c.advertiser_id then 1 else 0 end,
    advertiser_unread = advertiser_unread + case when new.sender_id = c.client_id     then 1 else 0 end
  where c.id = new.conversation_id;
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages for each row execute function public.messages_after_insert();

-- Odoslať smie len účastník, nie zablokovaný, nie zabanovaný
create or replace function public.messages_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if c.id is null then raise exception 'Konverzácia neexistuje.' using errcode = 'P0002'; end if;
  if new.sender_id not in (c.client_id, c.advertiser_id) then raise exception 'Nie ste účastníkom.' using errcode = '42501'; end if;
  if c.blocked_by is not null then raise exception 'Konverzácia je zablokovaná.' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles where id = new.sender_id and banned_at is not null) then raise exception 'Účet je zablokovaný.' using errcode = '42501'; end if;
  if (select count(*) from public.messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 60 then
    raise exception 'Príliš veľa správ. Skúste o chvíľu.' using errcode = '53400';
  end if;
  new.read_at := null; new.created_at := now();
  return new;
end $$;
create trigger messages_guard before insert on public.messages for each row execute function public.messages_guard();

-- RPC: začať (alebo nájsť) konverzáciu k inzerátu a poslať prvú správu
create or replace function public.start_conversation(p_listing uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_adv uuid; v_conv uuid;
begin
  if auth.uid() is null then raise exception 'Prihláste sa.' using errcode = '42501'; end if;
  select owner_id into v_adv from public.listings where id = p_listing and status = 'active';
  if v_adv is null then raise exception 'Inzerát nie je dostupný.' using errcode = 'P0002'; end if;
  if v_adv = auth.uid() then raise exception 'Nemôžete písať sami sebe.' using errcode = '42501'; end if;
  insert into public.conversations(listing_id, client_id, advertiser_id) values (p_listing, auth.uid(), v_adv)
    on conflict (listing_id, client_id) do update set last_message_at = now() returning id into v_conv;
  insert into public.messages(conversation_id, sender_id, body) values (v_conv, auth.uid(), left(p_body, 2000));
  -- prvá správa sa počíta ako kontakt (umožní neskôr recenziu)
  insert into public.contacts(listing_id, user_id) values (p_listing, auth.uid());
  return v_conv;
end $$;

-- RPC: označiť konverzáciu ako prečítanú
create or replace function public.mark_read(p_conversation uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.messages m set read_at = now() where m.conversation_id = p_conversation and m.read_at is null and m.sender_id <> auth.uid()
    and exists (select 1 from public.conversations c where c.id = p_conversation and auth.uid() in (c.client_id, c.advertiser_id));
  update public.conversations set
    client_unread     = case when client_id     = auth.uid() then 0 else client_unread end,
    advertiser_unread = case when advertiser_id = auth.uid() then 0 else advertiser_unread end
  where id = p_conversation and auth.uid() in (client_id, advertiser_id);
end $$;

-- RPC: zablokovať konverzáciu (ktorýkoľvek účastník)
create or replace function public.block_conversation(p_conversation uuid) returns void
language sql security definer set search_path = public as $$
  update public.conversations set blocked_by = auth.uid() where id = p_conversation and auth.uid() in (client_id, advertiser_id)
$$;

-- ---------- Zariadenia (push notifikácie) ----------
create table public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null unique,
  platform   text not null check (platform in ('ios','android','web')),
  app_version text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index device_tokens_user_idx on public.device_tokens(user_id);

-- ---------- Konfigurácia aplikácie (čítajú web aj mobil) ----------
create table public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_config(key, value) values
 ('min_app_version', '{"ios":"1.0.0","android":"1.0.0"}'),
 ('maintenance',     '{"enabled":false,"message":""}'),
 ('announcement',    '{"enabled":false,"title":"","body":""}'),
 ('features',        '{"messages":true,"reviews":true,"video_verification":true}');

-- ---------- RLS ----------
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.device_tokens enable row level security;
alter table public.app_config    enable row level security;

create policy "konverzacie ucastnik" on public.conversations for select using (auth.uid() in (client_id, advertiser_id) or public.is_staff());
create policy "spravy ucastnik"      on public.messages for select using (exists (select 1 from public.conversations c where c.id = conversation_id and (auth.uid() in (c.client_id, c.advertiser_id) or public.is_staff())));
create policy "spravy odoslanie"     on public.messages for insert with check (sender_id = auth.uid());
create policy "zariadenia vlastne"   on public.device_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "config citanie"       on public.app_config for select using (true);
create policy "config staff"         on public.app_config for all using (public.is_staff()) with check (public.is_staff());

grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update, delete on public.device_tokens to authenticated;
grant select on public.app_config to anon, authenticated;
grant usage, select on sequence public.messages_id_seq to authenticated;
grant execute on function public.start_conversation, public.mark_read, public.block_conversation to authenticated;

-- Realtime: klienti dostávajú nové správy a zmeny konverzácií okamžite (RLS sa uplatňuje aj na realtime)
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter table public.messages replica identity full;
