-- Číselníky: kraje, mestá, mestské časti, kategórie, služby
insert into public.regions(slug,name) values
 ('bratislavsky','Bratislavský kraj'),('trnavsky','Trnavský kraj'),('trenciansky','Trenčiansky kraj'),('nitriansky','Nitriansky kraj'),
 ('zilinsky','Žilinský kraj'),('banskobystricky','Banskobystrický kraj'),('presovsky','Prešovský kraj'),('kosicky','Košický kraj');

insert into public.cities(region_id,slug,name) values
 ((select id from regions where slug='bratislavsky'),'bratislava','Bratislava'),
 ((select id from regions where slug='bratislavsky'),'senec','Senec'),
 ((select id from regions where slug='bratislavsky'),'pezinok','Pezinok'),
 ((select id from regions where slug='bratislavsky'),'malacky','Malacky'),
 ((select id from regions where slug='trnavsky'),'trnava','Trnava'),
 ((select id from regions where slug='trnavsky'),'piestany','Piešťany'),
 ((select id from regions where slug='trnavsky'),'dunajska-streda','Dunajská Streda'),
 ((select id from regions where slug='trnavsky'),'galanta','Galanta'),
 ((select id from regions where slug='trnavsky'),'skalica','Skalica'),
 ((select id from regions where slug='trenciansky'),'trencin','Trenčín'),
 ((select id from regions where slug='trenciansky'),'prievidza','Prievidza'),
 ((select id from regions where slug='trenciansky'),'povazska-bystrica','Považská Bystrica'),
 ((select id from regions where slug='trenciansky'),'nove-mesto-nad-vahom','Nové Mesto nad Váhom'),
 ((select id from regions where slug='trenciansky'),'partizanske','Partizánske'),
 ((select id from regions where slug='nitriansky'),'nitra','Nitra'),
 ((select id from regions where slug='nitriansky'),'nove-zamky','Nové Zámky'),
 ((select id from regions where slug='nitriansky'),'komarno','Komárno'),
 ((select id from regions where slug='nitriansky'),'levice','Levice'),
 ((select id from regions where slug='nitriansky'),'topolcany','Topoľčany'),
 ((select id from regions where slug='nitriansky'),'sala','Šaľa'),
 ((select id from regions where slug='zilinsky'),'zilina','Žilina'),
 ((select id from regions where slug='zilinsky'),'martin','Martin'),
 ((select id from regions where slug='zilinsky'),'liptovsky-mikulas','Liptovský Mikuláš'),
 ((select id from regions where slug='zilinsky'),'ruzomberok','Ružomberok'),
 ((select id from regions where slug='zilinsky'),'cadca','Čadca'),
 ((select id from regions where slug='zilinsky'),'dolny-kubin','Dolný Kubín'),
 ((select id from regions where slug='banskobystricky'),'banska-bystrica','Banská Bystrica'),
 ((select id from regions where slug='banskobystricky'),'zvolen','Zvolen'),
 ((select id from regions where slug='banskobystricky'),'lucenec','Lučenec'),
 ((select id from regions where slug='banskobystricky'),'rimavska-sobota','Rimavská Sobota'),
 ((select id from regions where slug='banskobystricky'),'brezno','Brezno'),
 ((select id from regions where slug='presovsky'),'presov','Prešov'),
 ((select id from regions where slug='presovsky'),'poprad','Poprad'),
 ((select id from regions where slug='presovsky'),'humenne','Humenné'),
 ((select id from regions where slug='presovsky'),'bardejov','Bardejov'),
 ((select id from regions where slug='presovsky'),'vranov-nad-toplou','Vranov nad Topľou'),
 ((select id from regions where slug='presovsky'),'kezmarok','Kežmarok'),
 ((select id from regions where slug='kosicky'),'kosice','Košice'),
 ((select id from regions where slug='kosicky'),'michalovce','Michalovce'),
 ((select id from regions where slug='kosicky'),'spisska-nova-ves','Spišská Nová Ves'),
 ((select id from regions where slug='kosicky'),'trebisov','Trebišov'),
 ((select id from regions where slug='kosicky'),'roznava','Rožňava');

-- Mestské časti Bratislavy a Košíc
insert into public.cities(region_id,parent_id,slug,name)
select c.region_id, c.id, 'bratislava-'||public.slugify(p.n), p.n
from public.cities c, unnest(array['Staré Mesto','Ružinov','Nové Mesto','Petržalka','Karlova Ves','Dúbravka','Rača','Vrakuňa','Podunajské Biskupice','Lamač','Devínska Nová Ves','Vajnory']) as p(n)
where c.slug='bratislava';
insert into public.cities(region_id,parent_id,slug,name)
select c.region_id, c.id, 'kosice-'||public.slugify(p.n), p.n
from public.cities c, unnest(array['Staré Mesto','Sever','Juh','Západ','Sídlisko KVP','Sídlisko Ťahanovce','Dargovských hrdinov','Nad jazerom','Šaca','Barca']) as p(n)
where c.slug='kosice';

insert into public.categories(slug,name,sort,seo_title,seo_description) values
 ('spolocnicky','Spoločníčky',10,'Spoločníčky {mesto} – overené inzeráty','Overené spoločníčky v meste {mesto}. Reálne fotky, hodnotenia, diskrétny kontakt.'),
 ('privat','Priváty',20,'Priváty {mesto} – overené inzeráty','Diskrétne priváty v meste {mesto} s overenými profilmi a hodnoteniami.'),
 ('eroticke-masaze','Erotické masáže',30,'Erotické masáže {mesto}','Erotické a tantra masáže v meste {mesto}. Overené salóny a masérky.'),
 ('pary','Páry',40,'Páry {mesto}','Inzeráty párov v meste {mesto}.'),
 ('muzi','Muži',50,'Spoločníci – muži {mesto}','Inzeráty mužov v meste {mesto}.'),
 ('trans','Trans',60,'Trans {mesto}','Trans inzeráty v meste {mesto}.'),
 ('online','Online & videohovory',70,'Online služby a videohovory','Online služby, videohovory a chat. Overené profily.'),
 ('praca','Práca a spolupráca',80,'Práca a spolupráca','Pracovné ponuky a spolupráca v odvetví.');

insert into public.service_tags(slug,name) values
 ('klasika','Klasika'),('eroticka-masaz','Erotická masáž'),('tantra','Tantra'),('spolocnicka-na-vecer','Spoločníčka na večer'),
 ('sprcha-spolu','Sprcha spolu'),('striptiz','Striptíz'),('bozkavanie','Bozkávanie'),('gfe','GFE'),('fetis','Fetiš'),
 ('dominancia','Dominancia'),('videohovor','Videohovor'),('vyjazdy','Výjazdy'),('hotel','Hotel'),('parkovanie','Parkovanie');

-- SEO texty pre mestá (šablóna, {mesto} nahradí aplikácia)
update public.cities set
  seo_title = coalesce(seo_title, name || ' – overené erotické inzeráty | NazovPortalu'),
  seo_description = coalesce(seo_description, 'Overené erotické inzeráty v meste ' || name || ': spoločníčky, priváty, masáže. Reálne fotky, hodnotenia, diskrétny kontakt.');
