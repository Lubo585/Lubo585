\set QUIET 1
\pset footer off
insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','nikol@test.sk','{"display_name":"Nikol","date_of_birth":"1999-05-02","phone":"+421900111222"}'),
 ('22222222-2222-2222-2222-222222222222','klient@test.sk','{"date_of_birth":"1990-01-01"}'),
 ('33333333-3333-3333-3333-333333333333','mod@test.sk','{"date_of_birth":"1985-01-01"}');
\echo '--- neplnoletá registrácia (očakávaná chyba constraintu):'
insert into auth.users(id,email,raw_user_meta_data) values ('44444444-4444-4444-4444-444444444444','mlada@test.sk','{"date_of_birth":"2010-01-01"}');
update public.profiles set role='moderator' where id='33333333-3333-3333-3333-333333333333';
\echo '--- rola moderátora nastavená serverom (moderator):'
select role from public.profiles where id='33333333-3333-3333-3333-333333333333';
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.listings(id,owner_id,category_id,city_id,title,body,age,price_from,status,verified_until,top_until)
values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
  (select id from categories where slug='spolocnicky'),(select id from cities where slug='bratislava-ruzinov'),
  'Nikol, 26 – Ružinov','Príjemná a diskrétna spoločníčka z Ružinova, vlastný privát s parkovaním.',26,80,'pending',now()+interval '1 year',now()+interval '1 year');
\echo '--- po vložení (pending, bez overenia/TOP):'
select status, slug, verified_until, top_until from public.listings where id='aaaaaaaa-0000-0000-0000-000000000001';
update public.listings set status='active' where id='aaaaaaaa-0000-0000-0000-000000000001';
\echo '--- samo-aktivácia (má ostať pending):'
select status from public.listings where id='aaaaaaaa-0000-0000-0000-000000000001';
update public.profiles set role='admin' where id=auth.uid();
\echo '--- samo-povýšenie (má ostať user):'
select role from public.profiles where id=auth.uid();
insert into public.verifications(id,listing_id,storage_path) values ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001/selfie.mp4');
reset role; set role authenticated; set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.moderate_listing('aaaaaaaa-0000-0000-0000-000000000001','active',null);
update public.verifications set status='approved', reviewed_by=auth.uid(), reviewed_at=now() where id='bbbbbbbb-0000-0000-0000-000000000001';
reset role; set role anon; set request.jwt.claim.sub = '';
\echo '--- verejný výpis (active, overené):'
select title, city_name, parent_city_name, is_verified, is_top, rating_count from public.public_listings;
\echo '--- anon priamo z tabuľky (očakávaná chyba oprávnení):'
select count(*) from public.listings;
\echo '--- search bratislava + "ruzinov" bez diakritiky:'
select title, city_slug from public.search_listings(p_city=>'bratislava', p_q=>'ruzinov');
\echo '--- anon reveal_phone (povolené s IP hlavičkou od servera, loguje hash IP):'
select set_config('request.headers', '{"x-forwarded-for":"198.51.100.7"}', false) \gset
select public.reveal_phone('aaaaaaaa-0000-0000-0000-000000000001');
select set_config('request.headers', '', false) \gset
reset role; set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '--- recenzia bez kontaktu (očakávaná chyba):'
insert into public.reviews(listing_id,author_id,rating,body) values ('aaaaaaaa-0000-0000-0000-000000000001',auth.uid(),5,'Super');
select public.reveal_phone('aaaaaaaa-0000-0000-0000-000000000001') as phone;
insert into public.reviews(listing_id,author_id,rating,body,approved) values ('aaaaaaaa-0000-0000-0000-000000000001',auth.uid(),5,'Super',true);
\echo '--- recenzia po kontakte (approved false):'
select rating, approved from public.reviews;
\echo '--- nahlásenie neplnoletosti (priorita 1):'
select public.submit_report('aaaaaaaa-0000-0000-0000-000000000001','underage','test') as rid \gset
select priority, status from public.reports where id = :'rid';
reset role; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.orders(id,listing_id,buyer_id,product,amount_eur) values ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',auth.uid(),'top_7d',25);
\echo '--- kupujúci si sám označí zaplatené (RLS: 0 riadkov, stav pending):'
update public.orders set status='paid' where id='cccccccc-0000-0000-0000-000000000001';
select status from public.orders;
reset role; set request.jwt.claim.sub = '';
update public.orders set status='paid', paid_at=now(), provider='test' where id='cccccccc-0000-0000-0000-000000000001';
\echo '--- po webhooku: TOP ~7 dní (true,true) + overenie schválené moderátorom s JWT (verified true):'
select (l.top_until - now()) > interval '6 days 23 hours' as top_7d_ok, p.is_top, p.is_verified from public.listings l join public.public_listings p on p.id=l.id;
\echo '--- rate limit: 30 volaní OK, 31. zlyhá (očakávaná chyba):'
set role anon; set request.jwt.claim.sub = '';
select set_config('request.headers', '{"x-forwarded-for":"198.51.100.8"}', false) \gset
select count(*) from (select public.reveal_phone('aaaaaaaa-0000-0000-0000-000000000001') from generate_series(1,30)) x;
select public.reveal_phone('aaaaaaaa-0000-0000-0000-000000000001');
select set_config('request.headers', '', false) \gset
