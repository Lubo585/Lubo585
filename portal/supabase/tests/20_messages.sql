\set QUIET 1
\pset footer off
\echo '=== Správy a zariadenia'
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '--- klient začne konverzáciu k inzerátu:'
select public.start_conversation('aaaaaaaa-0000-0000-0000-000000000001','Dobrý deň, ste dnes dostupná?') as conv \gset
select client_unread, advertiser_unread from public.conversations where id = :'conv';
\echo '--- inzerentka vidí správu, odpovie, označí prečítané:'
reset role; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select sender_id = '22222222-2222-2222-2222-222222222222' as from_client, body from public.messages where conversation_id = :'conv';
select public.mark_read(:'conv');
insert into public.messages(conversation_id, sender_id, body) values (:'conv', auth.uid(), 'Áno, od 14:00.');
select client_unread, advertiser_unread from public.conversations where id = :'conv';
\echo '--- cudzí používateľ (moderátor bez staff práv by nevidel; tu tretí účet) nevidí nič:'
reset role; set request.jwt.claim.sub = '';
insert into auth.users(id,email,raw_user_meta_data) values ('55555555-5555-5555-5555-555555555555','cudzi@test.sk','{"date_of_birth":"1991-01-01"}');
set role authenticated; set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select count(*) as visible_messages from public.messages;
\echo '--- cudzí sa pokúsi poslať správu do cudzej konverzácie (očakávaná chyba):'
insert into public.messages(conversation_id, sender_id, body) values (:'conv', auth.uid(), 'spam');
\echo '--- inzerentka nemôže písať sama sebe (očakávaná chyba):'
reset role; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.start_conversation('aaaaaaaa-0000-0000-0000-000000000001','test');
\echo '--- klient zablokuje, ďalšia správa zlyhá (očakávaná chyba):'
reset role; set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.block_conversation(:'conv');
insert into public.messages(conversation_id, sender_id, body) values (:'conv', auth.uid(), 'ešte niečo');
\echo '--- registrácia zariadenia a config:'
insert into public.device_tokens(user_id, token, platform, app_version) values (auth.uid(), 'fcm-token-1', 'android', '1.0.0');
select platform, app_version from public.device_tokens;
reset role; set role anon; set request.jwt.claim.sub = '';
select key from public.app_config order by key;
\echo '--- realtime publikácia obsahuje messages a conversations:'
select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;
