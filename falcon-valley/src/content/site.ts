import type { Localized } from '../lib/lang'

export const company = {
  name: 'Falcons Valley',
  arabic: 'وادي الصقور',
  email: 'info@falconsvalley.sk', // DOPLNIŤ
  phone: '+421 900 000 000', // DOPLNIŤ
  phoneHref: 'tel:+421900000000', // DOPLNIŤ
  instagram: 'https://instagram.com/falconsvalley', // DOPLNIŤ
  youtube: 'https://youtube.com/@falconsvalley', // DOPLNIŤ
  location: { sk: 'Dolina pod Vysokými Tatrami, Slovensko', en: 'Valley below the High Tatras, Slovakia' } as Localized,
  /** adresa, na ktorú FormSubmit doručí správy z formulára */
  formEndpoint: 'https://formsubmit.co/ajax/info@falconsvalley.sk', // DOPLNIŤ
}

export const nav = {
  items: [
    { id: 'story', label: { sk: 'Príbeh', en: 'Story' } },
    { id: 'collection', label: { sk: 'Naše sokoly', en: 'Our falcons' } },
    { id: 'shop', label: { sk: 'Na predaj', en: 'For sale' } },
    { id: 'valley', label: { sk: 'Dolina', en: 'The valley' } },
    { id: 'contact', label: { sk: 'Kontakt', en: 'Contact' } },
  ],
  cta: { sk: 'Sokoly na predaj', en: 'Falcons for sale' } as Localized,
}

export const hero = {
  eyebrow: { sk: 'Falcons Valley · Vysoké Tatry', en: 'Falcons Valley · High Tatras' } as Localized,
  title: { sk: 'Rýchlosť, ktorá sa rodí v doline.', en: 'Speed, born in the valley.' } as Localized,
  subtitle: {
    sk: 'Chovateľská stanica sokolov pod najvyššími štítmi Slovenska. Sokoly sťahovavé, rárohy a gyr hybridy z vlastného odchovu – s rodokmeňom, krúžkom a dokladmi CITES.',
    en: 'A falcon breeding facility beneath Slovakia’s highest peaks. Peregrines, sakers and gyr hybrids from our own breeding – with pedigree, closed ring and CITES papers.',
  } as Localized,
  primary: { sk: 'Pozrieť sokoly na predaj', en: 'View falcons for sale' } as Localized,
  secondary: { sk: 'Náš príbeh', en: 'Our story' } as Localized,
  scroll: { sk: 'Posuňte sa nižšie', en: 'Scroll' } as Localized,
}

export const hooks = [
  { value: 390, suffix: ' km/h', label: { sk: 'najrýchlejší tvor na planéte', en: 'fastest creature on the planet' } },
  { value: 8, suffix: '×', label: { sk: 'ostrejší zrak ako človek', en: 'sharper eyesight than a human' } },
  { value: 2655, suffix: ' m', label: { sk: 'Gerlachovský štít nad našou dolinou', en: 'Gerlachovský štít above our valley' } },
  { value: 100, suffix: ' %', label: { sk: 'vlastný odchov s rodokmeňom', en: 'own breeding with pedigree' } },
]

export const marquee: Localized[] = [
  { sk: 'Sokol sťahovavý', en: 'Peregrine falcon' },
  { sk: 'Sokol rároh', en: 'Saker falcon' },
  { sk: 'Gyr hybridy', en: 'Gyr hybrids' },
  { sk: 'CITES doklady', en: 'CITES documents' },
  { sk: 'Uzavretý krúžok', en: 'Closed ring' },
  { sk: 'Odchov pod rodičmi', en: 'Parent-reared' },
  { sk: 'Vysoké Tatry', en: 'High Tatras' },
]

export const story = {
  eyebrow: { sk: 'Príbeh', en: 'Story' } as Localized,
  title: { sk: 'Kde sa končí les a začína nebo.', en: 'Where the forest ends and the sky begins.' } as Localized,
  steps: [
    {
      title: { sk: 'Dolina', en: 'The valley' },
      text: {
        sk: 'Falcons Valley leží v tichej doline pod Vysokými Tatrami. Čistý vzduch, studené rána a otvorené nebo – prostredie, v ktorom sokoly rastú tak, ako ich stvorila príroda.',
        en: 'Falcons Valley sits in a quiet valley beneath the High Tatras. Clean air, cold mornings and open sky – the environment falcons were made for.',
      },
    },
    {
      title: { sk: 'Odchov', en: 'Breeding' },
      text: {
        sk: 'Mláďatá odchovávame pod rodičmi v priestranných voliérach. Každého sokola od prvého týždňa vážime, krúžkujeme a vedieme mu záznam.',
        en: 'Our young are parent-reared in spacious aviaries. Every falcon is weighed, ringed and documented from its first week.',
      },
    },
    {
      title: { sk: 'Výcvik', en: 'Training' },
      text: {
        sk: 'Sokoly privykáme na rukavicu, kapucňu a prepravu. Odovzdávame ich pripravené na sokoliarsku prácu, nie len „odchované“.',
        en: 'We man each falcon to the glove, hood and travel box. They leave ready for falconry work, not merely “raised”.',
      },
    },
    {
      title: { sk: 'Doklady', en: 'Papers' },
      text: {
        sk: 'Každý sokol má uzavretý krúžok, CITES doklad, mikročip a rodokmeň. Bez výnimky. Transparentne, legálne, dohľadateľne.',
        en: 'Every falcon carries a closed ring, CITES certificate, microchip and pedigree. No exceptions. Transparent, legal, traceable.',
      },
    },
  ],
}

export const pillars = {
  eyebrow: { sk: 'Prečo Falcons Valley', en: 'Why Falcons Valley' } as Localized,
  title: { sk: 'Detail je rozdiel medzi dobrým a výnimočným sokolom.', en: 'Detail is the difference between a good falcon and an exceptional one.' } as Localized,
  items: [
    {
      icon: 'Mountain',
      title: { sk: 'Horská genetika', en: 'Mountain genetics' },
      text: { sk: 'Línie vyberané pre vytrvalosť, výšku letu a zdravie – nie pre rýchly predaj.', en: 'Lines selected for stamina, pitch and health – not for a quick sale.' },
    },
    {
      icon: 'Scale',
      title: { sk: 'Kontrolovaná hmotnosť', en: 'Weight control' },
      text: { sk: 'Každý sokol má záznam hmotnosti od vyliahnutia. Viete presne, čo kupujete.', en: 'Every falcon has a weight log from hatching. You know exactly what you are buying.' },
    },
    {
      icon: 'ShieldCheck',
      title: { sk: 'Legálny pôvod', en: 'Legal provenance' },
      text: { sk: 'CITES, uzavretý krúžok, mikročip. Dokumenty odovzdávame spolu so sokolom.', en: 'CITES, closed ring, microchip. Documents are handed over with the falcon.' },
    },
    {
      icon: 'Video',
      title: { sk: 'Video každého jedinca', en: 'Video of every bird' },
      text: { sk: 'Ku každému sokolovi na predaj pridávame video letu a správania.', en: 'Every falcon for sale comes with a video of its flight and behaviour.' },
    },
    {
      icon: 'HeartHandshake',
      title: { sk: 'Podpora po predaji', en: 'After-sale support' },
      text: { sk: 'Poradíme s výcvikom, výživou aj prepravou. Sme na telefóne.', en: 'We advise on training, nutrition and transport. We are a call away.' },
    },
    {
      icon: 'Plane',
      title: { sk: 'Doprava do celej Európy', en: 'Delivery across Europe' },
      text: { sk: 'Zabezpečíme prepravu a potrebné povolenia do krajín EÚ aj mimo nej.', en: 'We arrange transport and permits within the EU and beyond.' },
    },
  ],
}

export const collection = {
  eyebrow: { sk: 'Naše sokoly', en: 'Our falcons' } as Localized,
  title: { sk: 'Chovné páry, ktoré píšu našu líniu.', en: 'The breeding pairs that write our line.' } as Localized,
  subtitle: {
    sk: 'Zakladatelia chovu a ich potomkovia. Tieto sokoly nie sú na predaj – sú srdcom Falcons Valley.',
    en: 'Our founders and their offspring. These falcons are not for sale – they are the heart of Falcons Valley.',
  } as Localized,
}

export const shop = {
  eyebrow: { sk: 'Shop', en: 'Shop' } as Localized,
  title: { sk: 'Sokoly na predaj.', en: 'Falcons for sale.' } as Localized,
  subtitle: {
    sk: 'Aktuálna ponuka mláďat a ročiakov. Každý s fotografiami, hmotnosťou, pôvodom a číslom krúžku.',
    en: 'Current offer of this year’s young and yearlings. Each with photos, weight, origin and ring number.',
  } as Localized,
  all: { sk: 'Všetky', en: 'All' } as Localized,
  onlyAvailable: { sk: 'Len dostupné', en: 'Available only' } as Localized,
  detail: { sk: 'Detail', en: 'Details' } as Localized,
  inquire: { sk: 'Mám záujem', en: 'Inquire' } as Localized,
  priceOnRequest: { sk: 'Cena na vyžiadanie', en: 'Price on request' } as Localized,
  empty: { sk: 'Momentálne nemáme žiadne sokoly v tejto kategórii.', en: 'No falcons in this category right now.' } as Localized,
  labels: {
    species: { sk: 'Druh', en: 'Species' },
    sex: { sk: 'Pohlavie', en: 'Sex' },
    male: { sk: 'Samec', en: 'Male' },
    female: { sk: 'Samica', en: 'Female' },
    hatched: { sk: 'Vyliahnutý', en: 'Hatched' },
    weight: { sk: 'Hmotnosť', en: 'Weight' },
    wingspan: { sk: 'Rozpätie', en: 'Wingspan' },
    origin: { sk: 'Pôvod', en: 'Origin' },
    ring: { sk: 'Číslo krúžku', en: 'Ring number' },
    cites: { sk: 'CITES', en: 'CITES' },
    microchip: { sk: 'Mikročip', en: 'Microchip' },
    parents: { sk: 'Rodičia', en: 'Parents' },
    video: { sk: 'Video', en: 'Video' },
    photos: { sk: 'Fotografie', en: 'Photos' },
    noPhotos: { sk: 'Fotografie čoskoro', en: 'Photos coming soon' },
    close: { sk: 'Zavrieť', en: 'Close' },
    prev: { sk: 'Predchádzajúca', en: 'Previous' },
    next: { sk: 'Nasledujúca', en: 'Next' },
  },
}

export const process = {
  eyebrow: { sk: 'Ako prebieha kúpa', en: 'How buying works' } as Localized,
  title: { sk: 'Štyri kroky od doliny k vašej rukavici.', en: 'Four steps from the valley to your glove.' } as Localized,
  steps: [
    { title: { sk: 'Výber', en: 'Choose' }, text: { sk: 'Vyberiete si sokola v ponuke, pošleme vám aktuálne fotografie, hmotnosť a video.', en: 'Pick a falcon from the offer; we send current photos, weight and video.' } },
    { title: { sk: 'Rezervácia', en: 'Reserve' }, text: { sk: 'Zálohou sokola rezervujete. Dohodneme termín odovzdania.', en: 'A deposit reserves the falcon. We agree on a handover date.' } },
    { title: { sk: 'Doklady', en: 'Papers' }, text: { sk: 'Pripravíme CITES, veterinárne osvedčenie a prípadné vývozné povolenia.', en: 'We prepare CITES, the veterinary certificate and any export permits.' } },
    { title: { sk: 'Odovzdanie', en: 'Handover' }, text: { sk: 'Osobne v doline alebo prepravou k vám. Sokol odchádza s kompletnou dokumentáciou.', en: 'In person in the valley or delivered to you. The falcon leaves with complete documentation.' } },
  ],
}

export const valley = {
  eyebrow: { sk: 'Dolina', en: 'The valley' } as Localized,
  title: { sk: 'Pod štítmi, ktoré vidieť z celého Slovenska.', en: 'Beneath peaks seen from all of Slovakia.' } as Localized,
  text: {
    sk: 'Vysoké Tatry sú najmenšie veľhory sveta. Naša dolina je ich tichým kútom – miestom, kde sa sokoly učia lietať proti vetru z hrebeňov.',
    en: 'The High Tatras are the smallest high mountains in the world. Our valley is their quiet corner – where falcons learn to fly against the wind off the ridges.',
  } as Localized,
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
  eyebrow: { sk: 'Dolina v obrazoch', en: 'The valley in pictures' } as Localized,
  title: { sk: 'Krása, ktorú sokoly vidia každý deň.', en: 'The beauty our falcons see every day.' } as Localized,
  subtitle: {
    sk: 'Štíty, plesá a doliny Vysokých Tatier – domov Falcons Valley.',
    en: 'Peaks, tarns and valleys of the High Tatras – home of Falcons Valley.',
  } as Localized,
}

export const contact = {
  eyebrow: { sk: 'Kontakt', en: 'Contact' } as Localized,
  title: { sk: 'Napíšte nám. Odpovedáme do 24 hodín.', en: 'Write to us. We reply within 24 hours.' } as Localized,
  subtitle: {
    sk: 'Záujem o konkrétneho sokola, rezerváciu alebo návštevu doliny? Ozvite sa.',
    en: 'Interested in a particular falcon, a reservation or a visit to the valley? Get in touch.',
  } as Localized,
  form: {
    name: { sk: 'Meno a priezvisko', en: 'Full name' },
    email: { sk: 'E-mail', en: 'Email' },
    phone: { sk: 'Telefón (voliteľné)', en: 'Phone (optional)' },
    falcon: { sk: 'Sokol, o ktorého máte záujem', en: 'Falcon you are interested in' },
    none: { sk: 'Všeobecná otázka', en: 'General question' },
    message: { sk: 'Správa', en: 'Message' },
    send: { sk: 'Odoslať správu', en: 'Send message' },
    sending: { sk: 'Odosielam…', en: 'Sending…' },
    sent: { sk: 'Ďakujeme, správa bola odoslaná. Ozveme sa vám čo najskôr.', en: 'Thank you, your message has been sent. We will get back to you shortly.' },
    error: { sk: 'Odoslanie zlyhalo. Napíšte nám priamo na', en: 'Sending failed. Email us directly at' },
    consent: { sk: 'Odoslaním súhlasíte so spracovaním údajov na účely odpovede.', en: 'By sending you agree to processing of your data for the purpose of replying.' },
  },
  direct: { sk: 'Alebo priamo', en: 'Or directly' },
}

export const footer = {
  tagline: { sk: 'Sokoly z doliny pod Vysokými Tatrami.', en: 'Falcons from the valley below the High Tatras.' } as Localized,
  legal: { sk: 'Všetky sokoly pochádzajú z legálneho chovu s dokladmi CITES. Predaj len osobám s oprávnením držať dravce podľa platnej legislatívy.', en: 'All falcons come from legal breeding with CITES documents. Sold only to persons licensed to keep birds of prey under applicable law.' } as Localized,
  rights: { sk: 'Všetky práva vyhradené.', en: 'All rights reserved.' } as Localized,
  photoCredits: { sk: 'Fotografie Tatier:', en: 'Tatras photos:' } as Localized,
}
