\set QUIET 1
\pset footer off
\echo '=== Bezpečnostné testy'
reset role; set request.jwt.claim.sub = '';
\echo '--- telefón v attributes sa vo verejnom view nezobrazí (0 riadkov s kľúčom phone):'
update public.listings set attributes = attributes || '{"phone":"+421999","vyska":"168"}' where id='aaaaaaaa-0000-0000-0000-000000000001';
set role anon;
select count(*) from public.public_listings where attributes ? 'phone';
select attributes->>'vyska' as vyska from public.public_listings;
\echo '--- anonym bez IP hlavičky nedostane číslo (očakávaná chyba Prihláste sa):'
select public.reveal_phone('aaaaaaaa-0000-0000-0000-000000000001','falosny-hash-od-klienta');
\echo '--- anonym s IP hlavičkou: 30 OK, 31. zlyhá aj keď mení p_ip_hash (očakávaná chyba):'
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.9, 10.0.0.1"}', false);
select count(*) from (select public.reveal_phone('aaaaaaaa-0000-0000-0000-000000000001', 'hash-' || g) from generate_series(1,30) g) x;
select public.reveal_phone('aaaaaaaa-0000-0000-0000-000000000001','iny-hash');
\echo '--- limit nahlásení 10/hod (11. zlyhá – očakávaná chyba):'
select count(*) from (select public.submit_report('aaaaaaaa-0000-0000-0000-000000000001','other','spam ' || g) from generate_series(1,10) g) x;
select public.submit_report('aaaaaaaa-0000-0000-0000-000000000001','other','spam 11');
reset role; set request.jwt.claim.sub = ''; select set_config('request.headers', '', false);
\echo '--- objednávka: klient pošle 0.01 € za TOP 30 dní, server nastaví 79 €:'
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.orders(listing_id,buyer_id,product,amount_eur,status,paid_at) values ('aaaaaaaa-0000-0000-0000-000000000001',auth.uid(),'top_30d',0.01,'paid',now()) returning amount_eur, status, paid_at;
\echo '--- objednávka na cudzí inzerát (očakávaná chyba):'
reset role; set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.orders(listing_id,buyer_id,product,amount_eur) values ('aaaaaaaa-0000-0000-0000-000000000001',auth.uid(),'top_1d',5);
\echo '--- slug si používateľ nevyberie (admin -> generovaný), ani last_online_at:'
reset role; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.listings(id,owner_id,category_id,city_id,slug,title,body,last_online_at,status) values ('aaaaaaaa-0000-0000-0000-000000000002',auth.uid(),1,(select id from cities where slug='kosice'),'admin','Test slug','Dostatočne dlhý text inzerátu na test.',now(),'draft') returning slug, last_online_at;
update public.listings set last_online_at = now(), slug='hack' where id='aaaaaaaa-0000-0000-0000-000000000002' returning slug, last_online_at;
\echo '--- fotka: upload do privátneho bucketu, po schválení presun do verejného:'
reset role; insert into storage.objects(bucket_id,name) values ('listing-uploads','aaaaaaaa-0000-0000-0000-000000000001/f1.jpg'); -- simulácia uploadu cez Storage API
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.listing_photos(id,listing_id,storage_path,approved) values ('dddddddd-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001/f1.jpg',true) returning approved;
reset role; select bucket_id from storage.objects where name like 'aaaaaaaa-0000-0000-0000-000000000001/f1%';
set role authenticated; set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
update public.listing_photos set approved = true where id='dddddddd-0000-0000-0000-000000000001';
reset role; select bucket_id from storage.objects where name like 'aaaaaaaa-0000-0000-0000-000000000001/f1%';
\echo '--- spam správ: 60/min OK, 61. zlyhá (očakávaná chyba):'
reset role; set request.jwt.claim.sub = '';
insert into public.listings(id,owner_id,category_id,city_id,title,body,status) values ('aaaaaaaa-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',1,(select id from cities where slug='nitra'),'Druhy inzerat','Dostatočne dlhý text inzerátu na test správ.','active');
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.start_conversation('aaaaaaaa-0000-0000-0000-000000000003','ahoj') as c2 \gset
insert into public.messages(conversation_id,sender_id,body) select :'c2', auth.uid(), 'msg '||g from generate_series(1,58) g;  -- používateľ už má 2 správy -> spolu 60
select count(*) as sent_in_minute from public.messages where conversation_id = :'c2';
insert into public.messages(conversation_id,sender_id,body) values (:'c2', auth.uid(), 'msg 61');
