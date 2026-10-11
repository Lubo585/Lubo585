// Všetky texty webu v nemčine. Položky označené "DOPLNIŤ" sú odhadované
// zástupné hodnoty – pred spustením ich prosím nahraďte reálnymi údajmi.

// Firemné údaje podľa Obchodného registra SR a Registra účtovných závierok (IČO 52616533)
export const company = {
  shortName: 'PSPSK',
  legalName: 'POZEMNÉ STAVBY PODNIK KOŠICE s.r.o.',
  tagline: 'Bau-Nachunternehmer für Deutschland',
  address: {
    street: 'Južná trieda 66',
    city: '040 01 Košice',
    country: 'Slowakei',
  },
  email: 'info@pspsk.de',
  phone: '+421 900 000 000', // DOPLNIŤ – telefónne číslo
  phoneDisplay: '+421 900 000 000', // DOPLNIŤ
  ico: '52 616 533',
  dic: '2121105954',
  vat: 'SK2121105954',
  register: 'Handelsregister: Mestský súd Košice (Stadtgericht Košice), Abt. Sro, Nr. 47394/V',
  founded: '2019',
  shareCapital: '5.000 EUR',
  managingDirector: 'Štefan Nagy-Bačo',
  website: 'https://www.pspsk.de',
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
  cta: 'Angebot anfragen',
}

export const hero = {
  eyebrow: 'Ihr Nachunternehmer aus der Slowakei',
  titleLines: ['Qualifizierte', 'Bau-Fachkräfte', 'für Ihr Projekt.'],
  highlight: 'Bau-Fachkräfte',
  subtitle:
    'Wir übernehmen Rohbau, Mauerwerk, Zimmererarbeiten, Trockenbau und Ausbau als Nachunternehmer auf Werkvertragsbasis – mit eigenen, eingespielten Teams aus der Slowakei für Baustellen in ganz Deutschland.',
  primaryCta: 'Unverbindlich anfragen',
  secondaryCta: 'Unsere Leistungen',
  badges: ['Werkvertrag zum Festpreis', 'Deutschsprachige Vorarbeiter', 'Start in 10–14 Tagen'],
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
  title: 'Gewerke, die wir für Sie ausführen.',
  subtitle:
    'Vom einzelnen Gewerk bis zum kompletten Rohbau – wir übernehmen klar abgegrenzte Leistungen als Nachunternehmer, mit eigenem Polier, eigenem Werkzeug und Verantwortung für das Ergebnis.',
  items: [
    {
      icon: 'users',
      image: 'photos/mauerwerk.jpg',
      title: 'Rohbau & Mauerwerk',
      text: 'Fundamente, Bodenplatten, Mauerwerk aus Ziegel oder Porenbeton, Decken und Stahlbeton – komplett als Nachunternehmer zum Festpreis oder nach Aufmaß.',
    },
    {
      icon: 'hardhat',
      image: 'photos/betonage.jpg',
      title: 'Schalung, Bewehrung & Beton',
      text: 'Schalungsbau, Eisenflechten und Betonage für Wohn-, Gewerbe- und Industriebauten – termingerecht, mit eigener Kolonne und eigenem Vorarbeiter.',
    },
    {
      icon: 'layers',
      image: 'photos/dachstuhl.jpg',
      title: 'Holzbau, Dach & Ausbau',
      text: 'Dachstühle, Holzrahmenbau, Trockenbau, Estrich, Fliesen und Malerarbeiten – eingespielte Teams von 4 bis 30 Mann inklusive Werkzeug und Logistik.',
    },
    {
      icon: 'search',
      image: 'photos/fassade-geruest.jpg',
      title: 'Haustechnik & Elektro',
      text: 'Elektroinstallation, Heizung, Sanitär, Lüftung und Fußbodenheizung – ausgeführt von geprüften Fachkräften mit eigener Bauleitung.',
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
    'Als Bauunternehmen aus Košice wissen wir, was ein Bauleiter von seinem Nachunternehmer erwartet – deshalb setzen wir nur Leute ein, die sich auf unseren eigenen Baustellen bewährt haben.',
  image: 'photos/fabrika-tag.jpg',
  items: [
    {
      icon: 'clock',
      title: 'Schnell auf der Baustelle',
      text: 'Unsere Teams starten in der Regel innerhalb von 10 bis 14 Tagen nach Vertragsunterzeichnung.',
    },
    {
      icon: 'shield',
      title: 'Rechtssicher & transparent',
      text: 'Werkvertrag mit klarem Leistungsumfang, A1-Bescheinigungen, Mindestlohn-Dokumentation, SOKA-BAU und Zollmeldungen – wir kümmern uns um die komplette Entsende-Compliance.',
    },
    {
      icon: 'languages',
      title: 'Deutschsprachige Vorarbeiter',
      text: 'Jedes Team hat einen deutschsprachigen Polier, der die Ausführung vor Ort verantwortet und mit Ihrer Bauleitung abstimmt.',
    },
    {
      icon: 'home',
      title: 'Unterkunft & Anreise inklusive',
      text: 'Wir organisieren Unterkunft, Fahrzeuge und Anfahrt – Sie stellen nur die Baustelle.',
    },
    {
      icon: 'scale',
      title: 'Flexibel skalierbar',
      text: 'Mehrere Gewerke parallel, zusätzliche Bauabschnitte, verlängerte Laufzeit: Wir passen die Teamgröße an Ihren Bauzeitenplan an.',
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
  title: 'In vier Schritten zum ausgeführten Gewerk.',
  steps: [
    {
      n: '01',
      title: 'Bedarf klären',
      text: 'Sie nennen uns Gewerk, Leistungsumfang, Zeitraum und Einsatzort. Wir melden uns innerhalb von 24 Stunden mit einem ersten Vorschlag.',
    },
    {
      n: '02',
      title: 'Angebot & Team',
      text: 'Wir kalkulieren das Gewerk auf Basis Ihrer Pläne, erstellen ein Festpreis- oder Einheitspreisangebot und stellen das passende Team zusammen.',
    },
    {
      n: '03',
      title: 'Werkvertrag & Formalitäten',
      text: 'Werkvertrag nach VOB/B, A1-Bescheinigungen, Zoll- und Entsendemeldungen – wir bereiten alles vor, Sie unterschreiben.',
    },
    {
      n: '04',
      title: 'Ausführung & Abnahme',
      text: 'Das Team reist an und führt das Gewerk aus. Ein fester Ansprechpartner bleibt bis zur Abnahme für Sie erreichbar.',
    },
  ],
}

export const stats = {
  // DOPLNIŤ – zástupné čísla, nahraďte reálnymi
  items: [
    { value: 120, suffix: '+', label: 'Fachkräfte im Team' },
    { value: 15, suffix: '', label: 'Jahre Bauerfahrung' },
    { value: 40, suffix: '+', label: 'Projekte in DE & SK' },
    { value: 14, suffix: ' Tage', label: 'bis zum Baustart' },
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
    'Schreiben Sie uns kurz, welches Gewerk Sie wann und wo ausgeführt haben möchten – wir melden uns innerhalb eines Werktags mit einem Vorschlag.',
  form: {
    name: 'Name',
    companyName: 'Unternehmen',
    email: 'E-Mail',
    phone: 'Telefon',
    trade: 'Gewerk / Leistungsumfang',
    message: 'Projekt, Zeitraum, Einsatzort',
    submit: 'Anfrage senden',
    privacy: 'Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Daten zur Bearbeitung der Anfrage zu.',
    subject: 'Anfrage Werkvertrag Bauleistungen',
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
  note: 'Alle Leistungen werden als Nachunternehmer auf Basis von Werkverträgen erbracht – gemäß Arbeitnehmer-Entsendegesetz (AEntG), EU-Entsenderichtlinie und den tariflichen Vorgaben der deutschen Bauwirtschaft.',
}
