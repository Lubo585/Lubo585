import type { Localized } from '../lib/lang'

const L = (sk: string, en: string, ar: string): Localized => ({ sk, en, ar })

export const company = {
  name: 'Falcons Valley',
  arabic: 'وادي الصقور',
  email: 'info@falconsvalley.com',
  website: 'https://falconsvalley.com',
  phone: '+421 900 000 000', // DOPLNIŤ
  phoneHref: 'tel:+421900000000', // DOPLNIŤ
  instagram: 'https://instagram.com/falconsvalley', // DOPLNIŤ
  youtube: 'https://youtube.com/@falconsvalley', // DOPLNIŤ
  location: L('Dolina pod Vysokými Tatrami, Slovensko', 'Valley below the High Tatras, Slovakia', 'وادٍ أسفل جبال تاترا العليا، سلوفاكيا'),
  /** adresa, na ktorú FormSubmit doručí správy z formulára */
  formEndpoint: 'https://formsubmit.co/ajax/info@falconsvalley.com',
}

export const nav = {
  items: [
    { id: 'story', label: L('Príbeh', 'Story', 'قصتنا') },
    { id: 'collection', label: L('Naše sokoly', 'Our falcons', 'صقورنا') },
    { id: 'shop', label: L('Na predaj', 'For sale', 'للبيع') },
    { id: 'valley', label: L('Dolina', 'The valley', 'الوادي') },
    { id: 'contact', label: L('Kontakt', 'Contact', 'اتصل بنا') },
  ],
  cta: L('Sokoly na predaj', 'Falcons for sale', 'صقور للبيع'),
}

export const hero = {
  eyebrow: L('Falcons Valley · Vysoké Tatry', 'Falcons Valley · High Tatras', 'وادي الصقور · جبال تاترا العليا'),
  title: L('Rýchlosť, ktorá sa rodí v doline.', 'Speed, born in the valley.', 'سرعة تولد في الوادي.'),
  subtitle: L(
    'Chovateľská stanica sokolov pod najvyššími štítmi Slovenska. Sokoly sťahovavé, rárohy a gyr hybridy z vlastného odchovu – s rodokmeňom, krúžkom a dokladmi CITES.',
    'A falcon breeding facility beneath Slovakia’s highest peaks. Peregrines, sakers and gyr hybrids from our own breeding – with pedigree, closed ring and CITES papers.',
    'مزرعة لتربية الصقور أسفل أعلى قمم سلوفاكيا. شواهين وصقور حرة وهجائن الجير من إنتاجنا الخاص، مع شجرة النسب وحلقة مغلقة ووثائق سايتس.',
  ),
  primary: L('Pozrieť sokoly na predaj', 'View falcons for sale', 'استعرض الصقور للبيع'),
  secondary: L('Náš príbeh', 'Our story', 'قصتنا'),
  scroll: L('Posuňte sa nižšie', 'Scroll', 'مرر للأسفل'),
}

export const hooks = [
  { value: 390, suffix: ' km/h', label: L('najrýchlejší tvor na planéte', 'fastest creature on the planet', 'أسرع كائن على كوكب الأرض') },
  { value: 8, suffix: '×', label: L('ostrejší zrak ako človek', 'sharper eyesight than a human', 'بصر أحدّ من بصر الإنسان') },
  { value: 2655, suffix: ' m', label: L('Gerlachovský štít nad našou dolinou', 'Gerlachovský štít above our valley', 'قمة غيرلاخوفسكي فوق وادينا') },
  { value: 100, suffix: ' %', label: L('vlastný odchov s rodokmeňom', 'own breeding with pedigree', 'إنتاج خاص مع شجرة النسب') },
]

export const marquee: Localized[] = [
  L('Sokol sťahovavý', 'Peregrine falcon', 'الشاهين'),
  L('Sokol rároh', 'Saker falcon', 'الصقر الحر'),
  L('Gyr hybridy', 'Gyr hybrids', 'هجائن الجير'),
  L('CITES doklady', 'CITES documents', 'وثائق سايتس'),
  L('Uzavretý krúžok', 'Closed ring', 'حلقة مغلقة'),
  L('Odchov pod rodičmi', 'Parent-reared', 'تربية تحت الوالدين'),
  L('Vysoké Tatry', 'High Tatras', 'جبال تاترا العليا'),
]

export const story = {
  eyebrow: L('Príbeh', 'Story', 'قصتنا'),
  title: L('Kde sa končí les a začína nebo.', 'Where the forest ends and the sky begins.', 'حيث تنتهي الغابة وتبدأ السماء.'),
  steps: [
    {
      title: L('Dolina', 'The valley', 'الوادي'),
      text: L(
        'Falcons Valley leží v tichej doline pod Vysokými Tatrami. Čistý vzduch, studené rána a otvorené nebo – prostredie, v ktorom sokoly rastú tak, ako ich stvorila príroda.',
        'Falcons Valley sits in a quiet valley beneath the High Tatras. Clean air, cold mornings and open sky – the environment falcons were made for.',
        'يقع وادي الصقور في وادٍ هادئ أسفل جبال تاترا العليا. هواء نقي وصباحات باردة وسماء مفتوحة، البيئة التي خُلقت الصقور من أجلها.',
      ),
    },
    {
      title: L('Odchov', 'Breeding', 'التربية'),
      text: L(
        'Mláďatá odchovávame pod rodičmi v priestranných voliérach. Každého sokola od prvého týždňa vážime, krúžkujeme a vedieme mu záznam.',
        'Our young are parent-reared in spacious aviaries. Every falcon is weighed, ringed and documented from its first week.',
        'نربي الفراخ تحت والديها في أقفاص طيران واسعة. يُوزن كل صقر ويُحلَّق ويُوثَّق منذ أسبوعه الأول.',
      ),
    },
    {
      title: L('Výcvik', 'Training', 'التدريب'),
      text: L(
        'Sokoly privykáme na rukavicu, kapucňu a prepravu. Odovzdávame ich pripravené na sokoliarsku prácu, nie len „odchované“.',
        'We man each falcon to the glove, hood and travel box. They leave ready for falconry work, not merely “raised”.',
        'نعوّد كل صقر على القفاز والبرقع وصندوق النقل. تغادرنا جاهزة لعمل الصقارة، لا مجرد «مرباة».',
      ),
    },
    {
      title: L('Doklady', 'Papers', 'الوثائق'),
      text: L(
        'Každý sokol má uzavretý krúžok, CITES doklad, mikročip a rodokmeň. Bez výnimky. Transparentne, legálne, dohľadateľne.',
        'Every falcon carries a closed ring, CITES certificate, microchip and pedigree. No exceptions. Transparent, legal, traceable.',
        'لكل صقر حلقة مغلقة وشهادة سايتس وشريحة إلكترونية وشجرة نسب. بلا استثناء. شفافية وقانونية وإمكانية تتبع.',
      ),
    },
  ],
}

export const pillars = {
  eyebrow: L('Prečo Falcons Valley', 'Why Falcons Valley', 'لماذا وادي الصقور'),
  title: L(
    'Detail je rozdiel medzi dobrým a výnimočným sokolom.',
    'Detail is the difference between a good falcon and an exceptional one.',
    'التفاصيل هي الفرق بين صقر جيد وصقر استثنائي.',
  ),
  items: [
    {
      icon: 'Mountain',
      title: L('Horská genetika', 'Mountain genetics', 'جينات جبلية'),
      text: L('Línie vyberané pre vytrvalosť, výšku letu a zdravie – nie pre rýchly predaj.', 'Lines selected for stamina, pitch and health – not for a quick sale.', 'سلالات مختارة للتحمل وعلو الطيران والصحة، لا للبيع السريع.'),
    },
    {
      icon: 'Scale',
      title: L('Kontrolovaná hmotnosť', 'Weight control', 'وزن مراقب'),
      text: L('Každý sokol má záznam hmotnosti od vyliahnutia. Viete presne, čo kupujete.', 'Every falcon has a weight log from hatching. You know exactly what you are buying.', 'لكل صقر سجل وزن منذ الفقس. تعرف بالضبط ما تشتريه.'),
    },
    {
      icon: 'ShieldCheck',
      title: L('Legálny pôvod', 'Legal provenance', 'منشأ قانوني'),
      text: L('CITES, uzavretý krúžok, mikročip. Dokumenty odovzdávame spolu so sokolom.', 'CITES, closed ring, microchip. Documents are handed over with the falcon.', 'سايتس وحلقة مغلقة وشريحة إلكترونية. نسلّم الوثائق مع الصقر.'),
    },
    {
      icon: 'Video',
      title: L('Video každého jedinca', 'Video of every bird', 'فيديو لكل طائر'),
      text: L('Ku každému sokolovi na predaj pridávame video letu a správania.', 'Every falcon for sale comes with a video of its flight and behaviour.', 'نرفق مع كل صقر للبيع فيديو لطيرانه وسلوكه.'),
    },
    {
      icon: 'HeartHandshake',
      title: L('Podpora po predaji', 'After-sale support', 'دعم ما بعد البيع'),
      text: L('Poradíme s výcvikom, výživou aj prepravou. Sme na telefóne.', 'We advise on training, nutrition and transport. We are a call away.', 'ننصحك في التدريب والتغذية والنقل. نحن على بُعد مكالمة.'),
    },
    {
      icon: 'Plane',
      title: L('Doprava do celej Európy', 'Delivery across Europe', 'توصيل إلى كل أوروبا والخليج'),
      text: L('Zabezpečíme prepravu a potrebné povolenia do krajín EÚ aj mimo nej.', 'We arrange transport and permits within the EU and beyond.', 'نرتب النقل والتصاريح اللازمة داخل الاتحاد الأوروبي وخارجه.'),
    },
  ],
}

export const collection = {
  eyebrow: L('Naše sokoly', 'Our falcons', 'صقورنا'),
  title: L('Chovné páry, ktoré píšu našu líniu.', 'The breeding pairs that write our line.', 'أزواج التربية التي تكتب سلالتنا.'),
  subtitle: L(
    'Zakladatelia chovu a ich potomkovia. Tieto sokoly nie sú na predaj – sú srdcom Falcons Valley.',
    'Our founders and their offspring. These falcons are not for sale – they are the heart of Falcons Valley.',
    'مؤسسو المزرعة وذريتهم. هذه الصقور ليست للبيع، إنها قلب وادي الصقور.',
  ),
}

export const shop = {
  eyebrow: L('Shop', 'Shop', 'المتجر'),
  title: L('Sokoly na predaj.', 'Falcons for sale.', 'صقور للبيع.'),
  subtitle: L(
    'Aktuálna ponuka mláďat a ročiakov. Každý s fotografiami, hmotnosťou, pôvodom a číslom krúžku.',
    'Current offer of this year’s young and yearlings. Each with photos, weight, origin and ring number.',
    'العرض الحالي من فراخ هذا العام والطيور بعمر سنة. لكل منها صور ووزن ومنشأ ورقم حلقة.',
  ),
  all: L('Všetky', 'All', 'الكل'),
  onlyAvailable: L('Len dostupné', 'Available only', 'المتاح فقط'),
  detail: L('Detail', 'Details', 'التفاصيل'),
  inquire: L('Mám záujem', 'Inquire', 'أرغب بالشراء'),
  priceOnRequest: L('Cena na vyžiadanie', 'Price on request', 'السعر عند الطلب'),
  empty: L('Momentálne nemáme žiadne sokoly v tejto kategórii.', 'No falcons in this category right now.', 'لا توجد صقور في هذه الفئة حاليًا.'),
  labels: {
    species: L('Druh', 'Species', 'النوع'),
    sex: L('Pohlavie', 'Sex', 'الجنس'),
    male: L('Samec', 'Male', 'ذكر'),
    female: L('Samica', 'Female', 'أنثى'),
    hatched: L('Vyliahnutý', 'Hatched', 'تاريخ الفقس'),
    weight: L('Hmotnosť', 'Weight', 'الوزن'),
    wingspan: L('Rozpätie', 'Wingspan', 'باع الجناحين'),
    origin: L('Pôvod', 'Origin', 'المنشأ'),
    ring: L('Číslo krúžku', 'Ring number', 'رقم الحلقة'),
    cites: L('CITES', 'CITES', 'سايتس'),
    microchip: L('Mikročip', 'Microchip', 'الشريحة الإلكترونية'),
    parents: L('Rodičia', 'Parents', 'الوالدان'),
    video: L('Video', 'Video', 'فيديو'),
    photos: L('Fotografie', 'Photos', 'الصور'),
    noPhotos: L('Fotografie čoskoro', 'Photos coming soon', 'الصور قريبًا'),
    close: L('Zavrieť', 'Close', 'إغلاق'),
    prev: L('Predchádzajúca', 'Previous', 'السابق'),
    next: L('Nasledujúca', 'Next', 'التالي'),
  },
}

export const process = {
  eyebrow: L('Ako prebieha kúpa', 'How buying works', 'كيف تتم عملية الشراء'),
  title: L('Štyri kroky od doliny k vašej rukavici.', 'Four steps from the valley to your glove.', 'أربع خطوات من الوادي إلى قفازك.'),
  steps: [
    { title: L('Výber', 'Choose', 'الاختيار'), text: L('Vyberiete si sokola v ponuke, pošleme vám aktuálne fotografie, hmotnosť a video.', 'Pick a falcon from the offer; we send current photos, weight and video.', 'تختار صقرًا من العرض، ونرسل لك صورًا حديثة ووزنه وفيديو.') },
    { title: L('Rezervácia', 'Reserve', 'الحجز'), text: L('Zálohou sokola rezervujete. Dohodneme termín odovzdania.', 'A deposit reserves the falcon. We agree on a handover date.', 'بدفع عربون يُحجز الصقر. نتفق على موعد التسليم.') },
    { title: L('Doklady', 'Papers', 'الوثائق'), text: L('Pripravíme CITES, veterinárne osvedčenie a prípadné vývozné povolenia.', 'We prepare CITES, the veterinary certificate and any export permits.', 'نجهّز سايتس والشهادة البيطرية وتصاريح التصدير إن لزم.') },
    { title: L('Odovzdanie', 'Handover', 'التسليم'), text: L('Osobne v doline alebo prepravou k vám. Sokol odchádza s kompletnou dokumentáciou.', 'In person in the valley or delivered to you. The falcon leaves with complete documentation.', 'شخصيًا في الوادي أو بالتوصيل إليك. يغادر الصقر بوثائق كاملة.') },
  ],
}

export const valley = {
  eyebrow: L('Dolina', 'The valley', 'الوادي'),
  title: L('Pod štítmi, ktoré vidieť z celého Slovenska.', 'Beneath peaks seen from all of Slovakia.', 'تحت قمم تُرى من كل سلوفاكيا.'),
  text: L(
    'Vysoké Tatry sú najmenšie veľhory sveta. Naša dolina je ich tichým kútom – miestom, kde sa sokoly učia lietať proti vetru z hrebeňov.',
    'The High Tatras are the smallest high mountains in the world. Our valley is their quiet corner – where falcons learn to fly against the wind off the ridges.',
    'جبال تاترا العليا هي أصغر جبال شاهقة في العالم. وادينا ركنها الهادئ، حيث تتعلم الصقور الطيران ضد الريح القادمة من السلاسل الجبلية.',
  ),
  peaks: [
    { name: 'Kriváň', height: 2494, x: 9 },
    { name: 'Rysy', height: 2501, x: 30 },
    { name: 'Gerlachovský štít', height: 2655, x: 48 },
    { name: 'Slavkovský štít', height: 2452, x: 62 },
    { name: 'Lomnický štít', height: 2634, x: 79 },
    { name: 'Ľadový štít', height: 2627, x: 90 },
  ],
}

export const gallery = {
  eyebrow: L('Dolina v obrazoch', 'The valley in pictures', 'الوادي في صور'),
  title: L('Krása, ktorú sokoly vidia každý deň.', 'The beauty our falcons see every day.', 'الجمال الذي تراه صقورنا كل يوم.'),
  subtitle: L(
    'Štíty, plesá a doliny Vysokých Tatier – domov Falcons Valley.',
    'Peaks, tarns and valleys of the High Tatras – home of Falcons Valley.',
    'قمم وبحيرات وأودية جبال تاترا العليا، موطن وادي الصقور.',
  ),
}

export const contact = {
  eyebrow: L('Kontakt', 'Contact', 'اتصل بنا'),
  title: L('Napíšte nám. Odpovedáme do 24 hodín.', 'Write to us. We reply within 24 hours.', 'راسلنا. نرد خلال 24 ساعة.'),
  subtitle: L(
    'Záujem o konkrétneho sokola, rezerváciu alebo návštevu doliny? Ozvite sa.',
    'Interested in a particular falcon, a reservation or a visit to the valley? Get in touch.',
    'مهتم بصقر معين أو بحجز أو بزيارة الوادي؟ تواصل معنا.',
  ),
  form: {
    name: L('Meno a priezvisko', 'Full name', 'الاسم الكامل'),
    email: L('E-mail', 'Email', 'البريد الإلكتروني'),
    phone: L('Telefón (voliteľné)', 'Phone (optional)', 'الهاتف (اختياري)'),
    falcon: L('Sokol, o ktorého máte záujem', 'Falcon you are interested in', 'الصقر الذي يهمك'),
    none: L('Všeobecná otázka', 'General question', 'سؤال عام'),
    message: L('Správa', 'Message', 'الرسالة'),
    send: L('Odoslať správu', 'Send message', 'إرسال الرسالة'),
    sending: L('Odosielam…', 'Sending…', 'جارٍ الإرسال…'),
    sent: L('Ďakujeme, správa bola odoslaná. Ozveme sa vám čo najskôr.', 'Thank you, your message has been sent. We will get back to you shortly.', 'شكرًا لك، تم إرسال رسالتك. سنتواصل معك قريبًا.'),
    error: L('Odoslanie zlyhalo. Napíšte nám priamo na', 'Sending failed. Email us directly at', 'فشل الإرسال. راسلنا مباشرة على'),
    consent: L('Odoslaním súhlasíte so spracovaním údajov na účely odpovede.', 'By sending you agree to processing of your data for the purpose of replying.', 'بالإرسال توافق على معالجة بياناتك لغرض الرد.'),
  },
  direct: L('Alebo priamo', 'Or directly', 'أو مباشرة'),
}

export const footer = {
  tagline: L('Sokoly z doliny pod Vysokými Tatrami.', 'Falcons from the valley below the High Tatras.', 'صقور من الوادي أسفل جبال تاترا العليا.'),
  legal: L(
    'Všetky sokoly pochádzajú z legálneho chovu s dokladmi CITES. Predaj len osobám s oprávnením držať dravce podľa platnej legislatívy.',
    'All falcons come from legal breeding with CITES documents. Sold only to persons licensed to keep birds of prey under applicable law.',
    'جميع الصقور من تربية قانونية مع وثائق سايتس. البيع فقط للأشخاص المرخص لهم بحيازة الطيور الجارحة وفق القانون المعمول به.',
  ),
  rights: L('Všetky práva vyhradené.', 'All rights reserved.', 'جميع الحقوق محفوظة.'),
  photoCredits: L('Fotografie Tatier:', 'Tatras photos:', 'صور تاترا:'),
}
