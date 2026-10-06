-- Strom kategórií Tržko (SK a CZ názvy, spoločný slug). Spustiť po schema.sql.
-- Atribúty v attributes_schema používa formulár aj funkcia „inzerát z fotky“.

with roots as (
  insert into categories (slug, name_sk, name_cs, icon, sort_order, attributes_schema) values
  ('auta',          'Autá',            'Auta',             '🚗', 1, '[{"key":"year","label_sk":"Rok výroby","label_cs":"Rok výroby","type":"number"},{"key":"mileage_km","label_sk":"Najazdené km","label_cs":"Najeto km","type":"number"},{"key":"fuel","label_sk":"Palivo","label_cs":"Palivo","type":"select","options":["benzín","nafta","hybrid","elektro","LPG"]}]'),
  ('elektro',       'Elektro',         'Elektro',          '📱', 2, '[{"key":"brand","label_sk":"Značka","label_cs":"Značka","type":"text"},{"key":"storage_gb","label_sk":"Úložisko (GB)","label_cs":"Úložiště (GB)","type":"number"}]'),
  ('nabytok',       'Nábytok',         'Nábytek',          '🛋️', 3, '[]'),
  ('deti',          'Deti',            'Děti',             '🧸', 4, '[{"key":"age_from","label_sk":"Vek od","label_cs":"Věk od","type":"number"}]'),
  ('oblecenie',     'Oblečenie',       'Oblečení',         '👟', 5, '[{"key":"size","label_sk":"Veľkosť","label_cs":"Velikost","type":"text"},{"key":"gender","label_sk":"Pre koho","label_cs":"Pro koho","type":"select","options":["dámske","pánske","detské","unisex"]}]'),
  ('sport',         'Šport',           'Sport',            '🚲', 6, '[]'),
  ('dom-a-zahrada', 'Dom a záhrada',   'Dům a zahrada',    '🪴', 7, '[]'),
  ('zvierata',      'Zvieratá',        'Zvířata',          '🐕', 8, '[]'),
  ('reality',       'Reality',         'Reality',          '🏠', 9, '[{"key":"area_m2","label_sk":"Plocha (m²)","label_cs":"Plocha (m²)","type":"number"},{"key":"rooms","label_sk":"Počet izieb","label_cs":"Počet pokojů","type":"number"}]'),
  ('praca',         'Práca',           'Práce',            '💼', 10, '[]'),
  ('sluzby',        'Služby',          'Služby',           '🛠️', 11, '[]'),
  ('ostatne',       'Ostatné',         'Ostatní',          '📦', 12, '[]')
  returning id, slug
)
insert into categories (parent_id, slug, name_sk, name_cs, sort_order, attributes_schema)
select r.id, s.slug, s.name_sk, s.name_cs, s.sort_order, s.attrs::jsonb
from roots r
join (values
  ('auta', 'osobne',        'Osobné autá',        'Osobní auta',        1, '[]'),
  ('auta', 'dodavky',       'Dodávky a úžitkové', 'Dodávky a užitkové', 2, '[]'),
  ('auta', 'motocykle',     'Motocykle',          'Motocykly',          3, '[]'),
  ('auta', 'nahradne-diely','Náhradné diely',     'Náhradní díly',      4, '[]'),
  ('auta', 'pneumatiky',    'Pneumatiky a disky', 'Pneumatiky a disky', 5, '[]'),
  ('elektro', 'mobily',     'Mobily',             'Mobily',             1, '[{"key":"battery_health","label_sk":"Stav batérie (%)","label_cs":"Stav baterie (%)","type":"number"}]'),
  ('elektro', 'notebooky',  'Notebooky',          'Notebooky',          2, '[{"key":"ram_gb","label_sk":"RAM (GB)","label_cs":"RAM (GB)","type":"number"}]'),
  ('elektro', 'pc',         'Počítače a diely',   'Počítače a díly',    3, '[]'),
  ('elektro', 'tv-audio',   'TV a audio',         'TV a audio',         4, '[]'),
  ('elektro', 'herne-konzoly','Herné konzoly a hry','Herní konzole a hry',5, '[]'),
  ('elektro', 'foto',       'Foto a video',       'Foto a video',       6, '[]'),
  ('elektro', 'spotrebice', 'Spotrebiče',         'Spotřebiče',         7, '[]'),
  ('nabytok', 'sedacky',    'Sedačky a kreslá',   'Sedačky a křesla',   1, '[]'),
  ('nabytok', 'postele',    'Postele a matrace',  'Postele a matrace',  2, '[]'),
  ('nabytok', 'stoly',      'Stoly a stoličky',   'Stoly a židle',      3, '[]'),
  ('nabytok', 'skrine',     'Skrine a komody',    'Skříně a komody',    4, '[]'),
  ('deti', 'kociky',        'Kočíky',             'Kočárky',            1, '[]'),
  ('deti', 'autosedacky',   'Autosedačky',        'Autosedačky',        2, '[{"key":"weight_group","label_sk":"Hmotnostná skupina","label_cs":"Hmotnostní skupina","type":"text"}]'),
  ('deti', 'detske-oblecenie','Detské oblečenie', 'Dětské oblečení',    3, '[{"key":"size","label_sk":"Veľkosť","label_cs":"Velikost","type":"text"}]'),
  ('deti', 'hracky',        'Hračky',             'Hračky',             4, '[]'),
  ('deti', 'knihy-pre-deti','Knihy pre deti',     'Knihy pro děti',     5, '[]'),
  ('oblecenie', 'damske',   'Dámske',             'Dámské',             1, '[]'),
  ('oblecenie', 'panske',   'Pánske',             'Pánské',             2, '[]'),
  ('oblecenie', 'obuv',     'Obuv',               'Obuv',               3, '[{"key":"shoe_size","label_sk":"Veľkosť obuvi","label_cs":"Velikost obuvi","type":"number"}]'),
  ('oblecenie', 'doplnky',  'Doplnky a šperky',   'Doplňky a šperky',   4, '[]'),
  ('sport', 'bicykle',      'Bicykle',            'Kola',               1, '[{"key":"frame_size","label_sk":"Veľkosť rámu","label_cs":"Velikost rámu","type":"text"},{"key":"wheel_size","label_sk":"Kolesá (palce)","label_cs":"Kola (palce)","type":"text"}]'),
  ('sport', 'fitness',      'Fitness',            'Fitness',            2, '[]'),
  ('sport', 'zimne-sporty', 'Zimné športy',       'Zimní sporty',       3, '[]'),
  ('sport', 'turistika',    'Turistika a kemping','Turistika a kemping',4, '[]'),
  ('dom-a-zahrada', 'naradie','Náradie',          'Nářadí',             1, '[]'),
  ('dom-a-zahrada', 'zahrada','Záhrada',          'Zahrada',            2, '[]'),
  ('dom-a-zahrada', 'rastliny','Rastliny',        'Rostliny',           3, '[]'),
  ('dom-a-zahrada', 'stavba', 'Stavebný materiál','Stavební materiál',  4, '[]'),
  ('zvierata', 'psy',       'Psy',                'Psi',                1, '[]'),
  ('zvierata', 'macky',     'Mačky',              'Kočky',              2, '[]'),
  ('zvierata', 'potreby',   'Chovateľské potreby','Chovatelské potřeby',3, '[]'),
  ('reality', 'byty-predaj','Byty na predaj',     'Byty na prodej',     1, '[]'),
  ('reality', 'byty-prenajom','Byty na prenájom', 'Byty k pronájmu',    2, '[]'),
  ('reality', 'domy',       'Domy',               'Domy',               3, '[]'),
  ('reality', 'pozemky',    'Pozemky',            'Pozemky',            4, '[]'),
  ('praca', 'ponuky',       'Ponuky práce',       'Nabídky práce',      1, '[]'),
  ('praca', 'brigady',      'Brigády',            'Brigády',            2, '[]'),
  ('sluzby', 'remeselnici', 'Remeselníci',        'Řemeslníci',         1, '[]'),
  ('sluzby', 'doucovanie',  'Doučovanie',         'Doučování',          2, '[]'),
  ('sluzby', 'stahovanie',  'Sťahovanie a doprava','Stěhování a doprava',3, '[]'),
  ('ostatne', 'knihy',      'Knihy',              'Knihy',              1, '[]'),
  ('ostatne', 'zberatelstvo','Zberateľstvo',      'Sběratelství',       2, '[]'),
  ('ostatne', 'hudobne-nastroje','Hudobné nástroje','Hudební nástroje', 3, '[]'),
  ('ostatne', 'darujem',    'Darujem',            'Daruji',             4, '[]')
) as s(parent_slug, slug, name_sk, name_cs, sort_order, attrs) on s.parent_slug = r.slug;
