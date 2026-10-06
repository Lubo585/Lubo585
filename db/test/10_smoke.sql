\set ON_ERROR_STOP on
\pset format unaligned
-- 1. registrácia cez trigger na auth.users
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','marek@example.sk', now(), '{"display_name":"Marek K.","country":"SK"}'),
 ('22222222-2222-2222-2222-222222222222','jana@example.sk', now(), '{"display_name":"Jana P.","country":"SK"}'),
 ('33333333-3333-3333-3333-333333333333','lucie@example.cz', now(), '{"display_name":"Lucie H.","country":"CZ","language":"cs"}');
select 'profily: ' || count(*) from profiles;
update profiles set phone = '+421900111222', phone_verified_at = now(), verification_level = 2, home_lat = 48.148, home_lng = 17.107 where id = '11111111-1111-1111-1111-111111111111';

-- 2. limit inzerátov: Jana má level 1 => max 3 aktívne
insert into listings (owner_id, category_id, title, description, price_minor, currency, country, city, lat, lng, status)
select '22222222-2222-2222-2222-222222222222', 38, 'Detský bicykel 20 palcov ' || g, 'Test', 8000, 'EUR', 'SK', 'Trnava', 48.377, 17.587, 'active' from generate_series(1,3) g;
do $$ begin
  insert into listings (owner_id, category_id, title, description, price_minor, currency, country, city, lat, lng, status)
  values ('22222222-2222-2222-2222-222222222222', 38, 'Štvrtý bicykel nad limit', 'Test', 8000, 'EUR', 'SK', 'Trnava', 48.377, 17.587, 'active');
  raise exception 'limit sa neuplatnil';
exception when check_violation then raise notice 'OK limit: %', sqlerrm; end $$;

-- 3. inzeráty Mareka (level 2) a Lucie (CZ)
insert into listings (owner_id, category_id, title, description, price_minor, currency, country, city, lat, lng, status, delivery_available, safe_payment)
values ('11111111-1111-1111-1111-111111111111', 38, 'Horský bicykel Kross Level 5.0, rám L, 29"', 'Hydraulické brzdy Shimano, servisovaný.', 42000, 'EUR', 'SK', 'Bratislava', 48.158, 17.165, 'active', true, true);
insert into listings (owner_id, category_id, title, description, price_minor, currency, country, city, lat, lng, status, delivery_available)
values ('33333333-3333-3333-3333-333333333333', 39, 'Kočárek Joolz Day+ kompletní set', 'Po jednom dítěti.', 850000, 'CZK', 'CZ', 'Praha', 50.087, 14.421, 'active', true);
select 'slug: ' || slug || ' | expires: ' || (expires_at::date = (now() + interval '60 days')::date) from listings where title like 'Horský%';

-- 4. chybná mena ku krajine musí zlyhať
do $$ begin
  insert into listings (owner_id, category_id, title, description, price_minor, currency, country, city, lat, lng)
  values ('33333333-3333-3333-3333-333333333333', 39, 'Zlá mena test', 'x', 100, 'EUR', 'CZ', 'Brno', 49.19, 16.6);
  raise exception 'mena sa nekontroluje';
exception when check_violation then raise notice 'OK mena: check zachytil'; end $$;

-- 5. hľadanie: bez diakritiky, podstrom kategórie "sport" (id 6), okruh 30 km od Bratislavy
select 'hladanie "horsky bicykel": ' || count(*) from search_listings(p_query => 'horsky bicykel');
select 'hladanie "kocik" (CZ kočárek cez kategóriu): ' || count(*) from search_listings(p_query => 'kocarek');
select 'podstrom sport: ' || count(*) from search_listings(p_category_id => 6);
select 'okruh 30 km BA: ' || count(*) || ' (' || string_agg(round(distance_km::numeric,1)::text, ', ') || ' km)' from search_listings(p_lat => 48.148, p_lng => 17.107, p_radius_km => 30, p_sort => 'nearest');
select 'okruh 80 km BA: ' || count(*) from search_listings(p_lat => 48.148, p_lng => 17.107, p_radius_km => 80);
select 'len overení: ' || count(*) from search_listings(p_verified_only => true);
select 'total_count v riadku: ' || max(total_count) from search_listings(p_limit => 1);

-- 6. chat: Jana píše Marekovi, počítadlá neprečítaných
select set_config('test.uid', '22222222-2222-2222-2222-222222222222', false);
insert into conversations (listing_id, buyer_id, seller_id) select id, '22222222-2222-2222-2222-222222222222', owner_id from listings where title like 'Horský%';
insert into messages (conversation_id, sender_id, body) select id, '22222222-2222-2222-2222-222222222222', 'Je bicykel ešte dostupný?' from conversations;
select 'seller_unread=' || seller_unread || ' buyer_unread=' || buyer_unread || ' preview=' || last_message_preview from conversations;
select set_config('test.uid', '11111111-1111-1111-1111-111111111111', false);
select mark_conversation_read(id) from conversations;
select 'po precitani seller_unread=' || seller_unread from conversations;

-- 7. objednávka: created -> paid -> shipped -> delivered -> released, inzerát reserved -> sold
insert into orders (listing_id, buyer_id, seller_id, currency, item_minor, service_fee_minor, shipping_minor)
select id, '22222222-2222-2222-2222-222222222222', owner_id, 'EUR', 42000, service_fee_minor(42000, 'EUR'), 399 from listings where title like 'Horský%';
select 'poplatok 420 €: ' || service_fee_minor(42000,'EUR') || ' c, total=' || total_minor from orders;
do $$ begin
  update orders set status = 'released';
  raise exception 'preskočenie stavov prešlo';
exception when check_violation then raise notice 'OK automat: %', sqlerrm; end $$;
update orders set status = 'paid';
select 'inzerat po zaplateni: ' || status from listings where title like 'Horský%';
update orders set status = 'shipped';
update orders set status = 'delivered';
select 'auto_release o 48h: ' || (auto_release_at > now() + interval '47 hours') from orders;
update orders set status = 'released';
select 'inzerat po uvolneni: ' || status || ', sold_at set: ' || (sold_at is not null) from listings where title like 'Horský%';
select 'udalosti: ' || string_agg(to_status::text, ' > ' order by id) from order_events;
select 'predaje Marek: ' || sales_count from profiles where id = '11111111-1111-1111-1111-111111111111';

-- 8. hodnotenie: iba účastník, prepočet priemeru
insert into reviews (order_id, reviewer_id, reviewee_id, rating, comment) select id, buyer_id, seller_id, 5, 'Super' from orders;
do $$ begin
  insert into reviews (order_id, reviewer_id, reviewee_id, rating) select id, '33333333-3333-3333-3333-333333333333', seller_id, 1 from orders;
  raise exception 'cudzie hodnotenie prešlo';
exception when check_violation then raise notice 'OK review: cudzí nemôže hodnotiť'; end $$;
select 'rating Marek: ' || rating_avg || ' (' || rating_count || ')' from profiles where id = '11111111-1111-1111-1111-111111111111';

-- 9. odkrytie čísla: Jana si pozrie Marekovo číslo, limit 10/deň
select set_config('test.uid', '22222222-2222-2222-2222-222222222222', false);
update listings set status = 'active' where title like 'Horský%';  -- pre test znovu aktívny
select 'cislo: ' || reveal_phone(id) from listings where title like 'Horský%';
do $$ declare lid bigint; begin
  select id into lid from listings where title like 'Horský%';
  for i in 1..9 loop perform reveal_phone(lid); end loop;
  perform reveal_phone(lid);
  raise exception 'limit odkrytia neplatí';
exception when check_violation then raise notice 'OK reveal: %', sqlerrm; end $$;

-- 10. podobné predané ceny + obľúbené počítadlo + expirácia
update listings set status = 'sold' where title like 'Horský%';
select 'similar_sold: ' || count(*) from similar_sold_prices(38, 'Bicykel Kross Level', 'EUR');
insert into favorites (user_id, listing_id) select '33333333-3333-3333-3333-333333333333', id from listings where title like 'Detský%' limit 1;
select 'favorites_count: ' || max(favorites_count) from listings;
update listings set expires_at = now() - interval '1 day' where title like 'Detský bicykel 20 palcov 1';
select 'expirovane: ' || expire_listings();
select 'RLS zapnute na tabulkach: ' || count(*) from pg_tables where schemaname = 'public' and rowsecurity;
