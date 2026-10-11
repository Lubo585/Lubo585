// Všetky texty webu v nemčine. Položky označené "DOPLNIŤ" sú odhadované
// zástupné hodnoty – pred spustením ich prosím nahraďte reálnymi údajmi.

export const company = {
  shortName: 'PSPK',
  legalName: 'POZEMNÉ STAVBY PODNIK KOŠICE s.r.o.',
  tagline: 'Bau-Fachkräfte für Deutschland',
  address: {
    street: 'Južná trieda 66',
    city: '040 01 Košice',
    country: 'Slowakei',
  },
  email: 'info@pspk.sk',
  phone: '+421 900 000 000', // DOPLNIŤ – telefónne číslo
  phoneDisplay: '+421 900 000 000', // DOPLNIŤ
  ico: '00 000 000', // DOPLNIŤ – IČO
  dic: '0000000000', // DOPLNIŤ – DIČ
  vat: 'SK0000000000', // DOPLNIŤ – IČ DPH
  register: 'Obchodný register Mestského súdu Košice, Oddiel: Sro', // DOPLNIŤ – vložka
  managingDirector: 'Ľubomír Kruk', // DOPLNIŤ – konateľ
  website: 'https://www.pspk.sk',
}

export const nav = {
  links: [
    { label: 'Leistungen', href: '#leistungen' },
    { label: 'Gewerke', href: '#gewerke' },
    { label: 'Einblicke', href: '#einblicke' },
    { label: 'Ablauf', href: '#ablauf' },
    { label: 'Referenzen', href: '#referenzen' },
    { label: 'Kontakt', href: '#kontakt' },
  ],
  cta: 'Personal anfragen',
}

export const hero = {
  eyebrow: 'Personaldienstleistung für die Bauwirtschaft',
  titleLines: ['Qualifizierte', 'Bau-Fachkräfte', 'für Ihr Projekt.'],
  highlight: 'Bau-Fachkräfte',
  subtitle:
    'Wir stellen erfahrene Maurer, Betonbauer, Zimmerer, Trockenbauer und komplette Montageteams aus der Slowakei für Baustellen in ganz Deutschland – flexibel, zuverlässig und rechtssicher.',
  primaryCta: 'Unverbindlich anfragen',
  secondaryCta: 'Unsere Leistungen',
  badges: ['A1-Bescheinigung', 'Deutschsprachige Vorarbeiter', 'Einsatzbereit in 14 Tagen'],
  background: 'photos/betonage.jpg',
  photoMain: 'photos/dachstuhl.jpg',
  photoSmall: 'photos/rohbau-waende.jpg',
}

export const marquee = [
  'Maurer',
  'Betonbauer',
  'Zimmerer',
  'Schalungsbauer',
  'Eisenflechter',
  'Trockenbauer',
  'Fliesenleger',
  'Dachdecker',
  'Elektriker',
  'SHK-Monteure',
  'Maler & Lackierer',
  'Bauhelfer',
]

export const services = {
  eyebrow: 'Leistungen',
  title: 'Personal, das auf der Baustelle ankommt.',
  subtitle:
    'Vom einzelnen Facharbeiter bis zum eingespielten Team mit eigenem Polier – wir liefern genau die Kapazität, die Ihr Projekt gerade braucht.',
  items: [
    {
      icon: 'users',
      image: 'photos/mauerwerk.jpg',
      title: 'Arbeitnehmerüberlassung',
      text: 'Geprüfte Fachkräfte zur zeitlich flexiblen Verstärkung Ihrer Kolonnen – mit allen Nachweisen, Versicherungen und A1-Bescheinigungen.',
    },
    {
      icon: 'hardhat',
      image: 'photos/betonage.jpg',
      title: 'Werkverträge & Subunternehmen',
      text: 'Wir übernehmen abgegrenzte Gewerke als Nachunternehmer: Rohbau, Mauerwerk, Schalung, Trockenbau oder Ausbau – zum Festpreis oder nach Aufmaß.',
    },
    {
      icon: 'layers',
      image: 'photos/dachstuhl.jpg',
      title: 'Komplette Montageteams',
      text: 'Eingespielte Kolonnen von 4 bis 30 Mann inklusive deutschsprachigem Vorarbeiter, Werkzeug und eigener Logistik.',
    },
    {
      icon: 'search',
      image: 'photos/fassade-geruest.jpg',
      title: 'Rekrutierung & Vermittlung',
      text: 'Sie suchen Festpersonal? Wir rekrutieren in der Slowakei gezielt nach Ihrem Profil und begleiten die Einarbeitung vor Ort.',
    },
  ],
}

export const trades = {
  eyebrow: 'Gewerke',
  title: 'Von der Bodenplatte bis zum Dachfirst.',
  subtitle: 'Unsere Fachkräfte decken alle Phasen des Hoch- und Ausbaus ab.',
  groups: [
    {
      name: 'Rohbau',
      items: ['Maurer', 'Betonbauer', 'Schalungsbauer', 'Eisenflechter', 'Kranführer', 'Bauhelfer'],
    },
    {
      name: 'Holz & Dach',
      items: ['Zimmerer', 'Dachdecker', 'Holzrahmenbau', 'Spengler', 'Fassadenbauer'],
    },
    {
      name: 'Ausbau',
      items: ['Trockenbauer', 'Fliesenleger', 'Estrichleger', 'Maler & Lackierer', 'Bodenleger', 'Putzer'],
    },
    {
      name: 'Haustechnik',
      items: ['Elektriker', 'SHK-Installateure', 'Lüftungsmonteure', 'Schweißer', 'Rohrleitungsbauer'],
    },
  ],
}

export const gallery = {
  eyebrow: 'Einblicke',
  title: 'Unsere Baustellen. Unsere Leute.',
  subtitle: 'Aufnahmen von eigenen Projekten in der Slowakei – vom Rohbau bis zur Übergabe.',
  items: [
    { src: 'photos/rohbau-luft.jpg', caption: 'Rohbau Mehrfamilienhaus', tag: 'Rohbau' },
    { src: 'photos/mauerwerk.jpg', caption: 'Mauerwerk aus Porenbeton', tag: 'Maurer' },
    { src: 'photos/dachstuhl.jpg', caption: 'Dachstuhl & Holzbau', tag: 'Zimmerer' },
    { src: 'photos/villa.jpg', caption: 'Einfamilienhaus, schlüsselfertig', tag: 'Ausbau' },
    { src: 'photos/fussbodenheizung.jpg', caption: 'Fußbodenheizung im Altbau', tag: 'Haustechnik' },
    { src: 'photos/holzbau-halle.jpg', caption: 'Industriehalle, Holztragwerk', tag: 'Holzbau' },
    { src: 'photos/lueftung.jpg', caption: 'Lüftungsanlage', tag: 'Lüftung' },
    { src: 'photos/winterbau.jpg', caption: 'Rohbau im Winter', tag: 'Rohbau' },
    { src: 'photos/einfamilienhaus.jpg', caption: 'Fassade & Fenster', tag: 'Ausbau' },
    { src: 'photos/brownfield-silo.jpg', caption: 'Brownfield-Areal, Košice', tag: 'Revitalisierung' },
  ],
}

export const why = {
  eyebrow: 'Warum PSPK',
  title: 'Wir kennen beide Seiten der Baustelle.',
  subtitle:
    'Als Bauunternehmen aus Košice wissen wir, was ein Polier von seiner Mannschaft erwartet – deshalb vermitteln wir nur Leute, die wir selbst einsetzen würden.',
  image: 'photos/fabrika-tag.jpg',
  items: [
    {
      icon: 'clock',
      title: 'Schnell verfügbar',
      text: 'Einsatzbereite Fachkräfte in der Regel innerhalb von 10 bis 14 Tagen nach Auftragserteilung.',
    },
    {
      icon: 'shield',
      title: 'Rechtssicher & transparent',
      text: 'A1-Bescheinigungen, Mindestlohn-Dokumentation, SOKA-BAU und Zollmeldungen – wir kümmern uns um die komplette Compliance.',
    },
    {
      icon: 'languages',
      title: 'Deutschsprachige Vorarbeiter',
      text: 'Jedes Team hat einen Ansprechpartner, der Ihre Anweisungen direkt an die Mannschaft weitergibt.',
    },
    {
      icon: 'home',
      title: 'Unterkunft & Anreise inklusive',
      text: 'Wir organisieren Unterkunft, Fahrzeuge und Anfahrt – Sie stellen nur die Baustelle.',
    },
    {
      icon: 'scale',
      title: 'Flexibel skalierbar',
      text: 'Aufstocken, reduzieren, verlängern: Sie passen die Teamgröße an Ihren Bauzeitenplan an.',
    },
    {
      icon: 'award',
      title: 'Eigene Bauerfahrung',
      text: 'Mit der Revitalisierung der Fabrika 48 in Košice haben wir bewiesen, dass wir anspruchsvolle Projekte selbst umsetzen.',
    },
  ],
}

export const process = {
  eyebrow: 'Ablauf',
  title: 'In vier Schritten zur verstärkten Mannschaft.',
  steps: [
    {
      n: '01',
      title: 'Bedarf klären',
      text: 'Sie nennen uns Gewerk, Anzahl, Zeitraum und Einsatzort. Wir melden uns innerhalb von 24 Stunden mit einem Vorschlag.',
    },
    {
      n: '02',
      title: 'Team zusammenstellen',
      text: 'Wir wählen passende Fachkräfte aus unserem Pool aus und stellen Ihnen Profile und Qualifikationsnachweise vor.',
    },
    {
      n: '03',
      title: 'Verträge & Formalitäten',
      text: 'Arbeitnehmerüberlassungs- oder Werkvertrag, A1, Meldungen – wir bereiten alles vor, Sie unterschreiben.',
    },
    {
      n: '04',
      title: 'Einsatz & Betreuung',
      text: 'Das Team reist an und startet. Ein fester Ansprechpartner bleibt während des gesamten Einsatzes für Sie erreichbar.',
    },
  ],
}

export const stats = {
  // DOPLNIŤ – zástupné čísla, nahraďte reálnymi
  items: [
    { value: 120, suffix: '+', label: 'Fachkräfte im Pool' },
    { value: 15, suffix: '', label: 'Jahre Bauerfahrung' },
    { value: 40, suffix: '+', label: 'Projekte in DE & SK' },
    { value: 14, suffix: ' Tage', label: 'bis zum Einsatzstart' },
  ],
}

export const references = {
  eyebrow: 'Referenzen',
  title: 'Projekte, die für uns sprechen.',
  featured: {
    name: 'Fabrika 48',
    location: 'Košice, Slowakei',
    type: 'Revitalisierung eines Brownfield-Industriegebäudes',
    text: 'Komplette Sanierung und Umnutzung einer ehemaligen Fabrik – Statik, Rohbau, Haustechnik und Ausbau aus einer Hand. Ausgezeichnet mit dem Hall of Fame Award.',
    image: 'fabrika-48.jpg',
    tags: ['Rohbau', 'Statik', 'Haustechnik', 'Ausbau'],
  },
  // DOPLNIŤ – upresnite názvy, miesta a rozsah podľa skutočnosti
  others: [
    {
      name: 'Einfamilienhaus',
      location: 'Košice, Slowakei',
      scope: 'Rohbau, Dach, Fassade und schlüsselfertiger Ausbau',
      image: 'photos/villa.jpg',
    },
    {
      name: 'Dachstuhl & Holztragwerk',
      location: 'Ostslowakei',
      scope: 'Zimmererarbeiten, Dachsanierung, Holzrahmenbau',
      image: 'photos/dachstuhl.jpg',
    },
    {
      name: 'Industrie-Areal',
      location: 'Košice, Slowakei',
      scope: 'Revitalisierung einer Brownfield-Fläche, Rohbau und Haustechnik',
      image: 'photos/brownfield-silo.jpg',
    },
  ],
  note: 'Weitere Referenzen und Ansprechpartner nennen wir Ihnen gern auf Anfrage.',
}

export const contact = {
  eyebrow: 'Kontakt',
  title: 'Sprechen wir über Ihr Projekt.',
  subtitle:
    'Schreiben Sie uns kurz, welches Gewerk Sie wann und wo brauchen – wir melden uns innerhalb eines Werktags.',
  form: {
    name: 'Name',
    companyName: 'Unternehmen',
    email: 'E-Mail',
    phone: 'Telefon',
    trade: 'Gewerk / Anzahl Fachkräfte',
    message: 'Projekt, Zeitraum, Einsatzort',
    submit: 'Anfrage senden',
    privacy: 'Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Daten zur Bearbeitung der Anfrage zu.',
    subject: 'Anfrage Bau-Fachkräfte',
  },
  direct: {
    title: 'Direkt erreichen',
    hours: 'Mo – Fr, 7:00 – 17:00 Uhr',
  },
}

export const footer = {
  legalTitle: 'Impressum',
  copyright: `© ${new Date().getFullYear()} ${company.legalName}. Alle Rechte vorbehalten.`,
  links: [
    { label: 'Impressum', href: '#impressum' },
    { label: 'Datenschutz', href: '#datenschutz' },
  ],
  note: 'Arbeitnehmerüberlassung und Werkverträge erfolgen gemäß den geltenden Vorschriften (AÜG, AEntG, Entsenderichtlinie).',
}
