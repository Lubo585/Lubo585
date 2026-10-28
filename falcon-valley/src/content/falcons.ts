import type { Localized } from '../lib/lang'

/**
 * Dátový súbor sokolov.
 *
 * Každý sokol je jeden objekt v poli `falcons`. Pre pridanie nového sokola:
 *  1. vložte fotografie do priečinka  public/falcons/<id>/  (napr. public/falcons/tatra/01.jpg)
 *  2. voliteľne vložte video (mp4) do rovnakého priečinka alebo použite odkaz na YouTube
 *  3. doplňte nový objekt do poľa nižšie
 *
 * Ak sokol nemá fotografie (prázdne pole `photos`), stránka zobrazí elegantnú ilustráciu.
 */

export type Species = 'peregrine' | 'saker' | 'gyr' | 'gyr-peregrine' | 'gyr-saker' | 'lanner'

export type FalconStatus = 'available' | 'reserved' | 'sold' | 'breeding'

export type FalconVideo =
  /** odkaz na YouTube (celá URL alebo iba ID videa) */
  | { type: 'youtube'; src: string }
  /** vlastný súbor, napr. "/falcons/tatra/let.mp4" */
  | { type: 'file'; src: string; poster?: string }

export type Falcon = {
  /** jedinečný identifikátor (použite malé písmená bez diakritiky) */
  id: string
  name: string
  species: Species
  sex: 'male' | 'female'
  /** dátum vyliahnutia vo formáte RRRR-MM-DD */
  hatched: string
  /** aktuálna hmotnosť v gramoch */
  weightGrams: number
  /** rozpätie krídel v cm (voliteľné) */
  wingspanCm?: number
  /** pôvod sokola */
  origin: Localized
  /** číslo krúžku (uzavretý krúžok / CITES) */
  ringNumber: string
  /** číslo CITES dokladu (voliteľné) */
  cites?: string
  /** mikročip (voliteľné) */
  microchip?: string
  /** rodičia (voliteľné) */
  parents?: { sire?: string; dam?: string }
  /** cena v EUR; ak chýba, zobrazí sa "cena na vyžiadanie" */
  price?: number
  /** stav: available = na predaj, reserved = rezervovaný, sold = predaný, breeding = chovný pár (nepredajný) */
  status: FalconStatus
  /** cesty k fotografiám, prvá je hlavná */
  photos: string[]
  video?: FalconVideo
  description: Localized
  /** krátke výrazné vlastnosti (max. 4) */
  traits?: Localized[]
}

export const speciesLabel: Record<Species, Localized & { latin: string }> = {
  peregrine: { sk: 'Sokol sťahovavý', en: 'Peregrine falcon', ar: 'الشاهين', latin: 'Falco peregrinus' },
  saker: { sk: 'Sokol rároh', en: 'Saker falcon', ar: 'الصقر الحر', latin: 'Falco cherrug' },
  gyr: { sk: 'Sokol poľovnícky', en: 'Gyrfalcon', ar: 'صقر الجير', latin: 'Falco rusticolus' },
  'gyr-peregrine': { sk: 'Gyr × sťahovavý', en: 'Gyr × Peregrine', ar: 'جير × شاهين', latin: 'F. rusticolus × F. peregrinus' },
  'gyr-saker': { sk: 'Gyr × rároh', en: 'Gyr × Saker', ar: 'جير × حر', latin: 'F. rusticolus × F. cherrug' },
  lanner: { sk: 'Sokol lanner', en: 'Lanner falcon', ar: 'الصقر الوكري', latin: 'Falco biarmicus' },
}

export const statusLabel: Record<FalconStatus, Localized> = {
  available: { sk: 'Na predaj', en: 'Available', ar: 'متاح' },
  reserved: { sk: 'Rezervovaný', en: 'Reserved', ar: 'محجوز' },
  sold: { sk: 'Predaný', en: 'Sold', ar: 'مُباع' },
  breeding: { sk: 'Chovný', en: 'Breeding', ar: 'للتربية' },
}

const VALLEY: Localized = { sk: 'Vlastný odchov, Falcons Valley, Vysoké Tatry', en: 'Own breeding, Falcons Valley, High Tatras', ar: 'إنتاج خاص، وادي الصقور، جبال تاترا العليا' }

/* ------------------------------------------------------------------ */
/*  UKÁŽKOVÉ ÚDAJE – nahraďte vlastnými sokolmi                        */
/* ------------------------------------------------------------------ */

export const falcons: Falcon[] = [
  {
    id: 'tatra',
    name: 'Tatra',
    species: 'peregrine',
    sex: 'female',
    hatched: '2026-04-18',
    weightGrams: 1040,
    wingspanCm: 112,
    origin: VALLEY,
    ringNumber: 'SK 26 FV 0412',
    cites: 'SK/CITES/26/0412',
    parents: { sire: 'Kriváň', dam: 'Bystrá' },
    price: 2900,
    status: 'available',
    photos: [],
    description: {
      sk: 'Silná samica z línie Kriváň × Bystrá. Pokojný temperament, výborný apetít, pravidelne vážená a manipulovaná od prvého týždňa. Ideálna pre lov na pole aj na sokoliarske ukážky.',
      en: 'Strong female from the Kriváň × Bystrá line. Calm temperament, excellent appetite, weighed and handled weekly since hatching. Ideal for field hawking and falconry displays.',
      ar: 'أنثى قوية من سلالة كريفان × بيسترا. طباع هادئة وشهية ممتازة، تُوزن وتُعامل أسبوعيًا منذ الفقس. مثالية للصيد الميداني وعروض الصقارة.',
    },
    traits: [
      { sk: 'Pokojná povaha', en: 'Calm temperament', ar: 'طباع هادئة' },
      { sk: 'Odchov pod rodičmi', en: 'Parent-reared', ar: 'تربية تحت الوالدين' },
      { sk: 'Uzavretý krúžok', en: 'Closed ring', ar: 'حلقة مغلقة' },
    ],
  },
  {
    id: 'gerlach',
    name: 'Gerlach',
    species: 'gyr-peregrine',
    sex: 'male',
    hatched: '2026-04-02',
    weightGrams: 860,
    wingspanCm: 108,
    origin: VALLEY,
    ringNumber: 'SK 26 FV 0398',
    cites: 'SK/CITES/26/0398',
    parents: { sire: 'Lomnica', dam: 'Poprad' },
    price: 4200,
    status: 'available',
    photos: [],
    description: {
      sk: 'Hybrid gyr × sťahovavý so striebristým sfarbením. Rýchly, vytrvalý, s prirodzenou výškou letu. Z našej najúspešnejšej chovnej dvojice.',
      en: 'Gyr × Peregrine hybrid with silvery plumage. Fast, enduring, with a natural high pitch. From our most successful breeding pair.',
      ar: 'هجين جير × شاهين بريش فضي. سريع وقوي التحمل مع ارتفاع طيران طبيعي. من أنجح أزواج التربية لدينا.',
    },
    traits: [
      { sk: 'Striebristé sfarbenie', en: 'Silver plumage', ar: 'ريش فضي' },
      { sk: 'Vysoký let', en: 'High pitch', ar: 'طيران عالٍ' },
      { sk: 'Mikročip', en: 'Microchipped', ar: 'شريحة إلكترونية' },
    ],
  },
  {
    id: 'rysy',
    name: 'Rysy',
    species: 'saker',
    sex: 'female',
    hatched: '2026-04-25',
    weightGrams: 1180,
    wingspanCm: 118,
    origin: VALLEY,
    ringNumber: 'SK 26 FV 0421',
    cites: 'SK/CITES/26/0421',
    price: 2400,
    status: 'available',
    photos: [],
    description: {
      sk: 'Rároh s klasickým svetlým sfarbením hlavy. Odvážna, sebavedomá samica, vhodná na lov zajacov a bažantov.',
      en: 'Saker with a classic pale head. Bold, confident female suited to hare and pheasant hawking.',
      ar: 'صقر حر برأس فاتح كلاسيكي. أنثى جريئة وواثقة، مناسبة لصيد الأرانب والحجل.',
    },
    traits: [
      { sk: 'Svetlá hlava', en: 'Pale head', ar: 'رأس فاتح' },
      { sk: 'Odvážna', en: 'Bold', ar: 'جريئة' },
    ],
  },
  {
    id: 'kriva',
    name: 'Krivá',
    species: 'peregrine',
    sex: 'male',
    hatched: '2026-04-18',
    weightGrams: 690,
    wingspanCm: 96,
    origin: VALLEY,
    ringNumber: 'SK 26 FV 0413',
    cites: 'SK/CITES/26/0413',
    parents: { sire: 'Kriváň', dam: 'Bystrá' },
    price: 2200,
    status: 'reserved',
    photos: [],
    description: {
      sk: 'Samec z rovnakého hniezda ako Tatra. Ľahký, obratný, extrémne rýchly v strmhlavom lete.',
      en: 'Tiercel from the same clutch as Tatra. Light, agile, extremely fast in the stoop.',
      ar: 'ذكر من نفس العش الذي خرجت منه تاترا. خفيف ورشيق وسريع للغاية في الانقضاض.',
    },
    traits: [
      { sk: 'Obratný', en: 'Agile', ar: 'رشيق' },
      { sk: 'Odchov pod rodičmi', en: 'Parent-reared', ar: 'تربية تحت الوالدين' },
    ],
  },
  {
    id: 'furkota',
    name: 'Furkota',
    species: 'gyr-saker',
    sex: 'female',
    hatched: '2026-03-30',
    weightGrams: 1320,
    wingspanCm: 124,
    origin: VALLEY,
    ringNumber: 'SK 26 FV 0390',
    cites: 'SK/CITES/26/0390',
    price: 3800,
    status: 'available',
    photos: [],
    description: {
      sk: 'Veľká, silná samica gyr × rároh. Stvorená pre otvorené pláne a lov väčšej koristi.',
      en: 'Large, powerful Gyr × Saker female. Built for open plains and larger quarry.',
      ar: 'أنثى جير × حر كبيرة وقوية. خُلقت للسهول المفتوحة وصيد الطرائد الأكبر.',
    },
    traits: [
      { sk: 'Veľký rámec', en: 'Large frame', ar: 'بنية كبيرة' },
      { sk: 'Vytrvalá', en: 'Enduring', ar: 'قوية التحمل' },
    ],
  },
  {
    id: 'mlynica',
    name: 'Mlynica',
    species: 'lanner',
    sex: 'female',
    hatched: '2025-05-06',
    weightGrams: 640,
    wingspanCm: 100,
    origin: { sk: 'Vlastný odchov, Falcons Valley – ročiak', en: 'Own breeding, Falcons Valley – one year old', ar: 'إنتاج خاص، وادي الصقور – بعمر سنة' },
    ringNumber: 'SK 25 FV 0307',
    cites: 'SK/CITES/25/0307',
    status: 'sold',
    photos: [],
    description: {
      sk: 'Lanner s výbornou manipulovateľnosťou. Už našla nový domov.',
      en: 'Lanner with excellent manners. Already found a new home.',
      ar: 'وكري سهل التعامل ممتاز. وجدت بيتها الجديد بالفعل.',
    },
  },

  /* ---- chovné jedince (nepredajné) ---- */
  {
    id: 'krivan',
    name: 'Kriváň',
    species: 'peregrine',
    sex: 'male',
    hatched: '2019-04-12',
    weightGrams: 720,
    wingspanCm: 98,
    origin: { sk: 'Zakladateľ chovu, Falcons Valley', en: 'Foundation male, Falcons Valley', ar: 'الذكر المؤسس، وادي الصقور' },
    ringNumber: 'SK 19 FV 0021',
    status: 'breeding',
    photos: [],
    description: {
      sk: 'Zakladateľ našej línie sokolov sťahovavých. Sedem sezón, desiatky úspešných mláďat.',
      en: 'Founder of our peregrine line. Seven seasons, dozens of successful offspring.',
      ar: 'مؤسس سلالة الشواهين لدينا. سبعة مواسم وعشرات الفراخ الناجحة.',
    },
  },
  {
    id: 'bystra',
    name: 'Bystrá',
    species: 'peregrine',
    sex: 'female',
    hatched: '2019-05-01',
    weightGrams: 1010,
    wingspanCm: 110,
    origin: { sk: 'Zakladateľka chovu, Falcons Valley', en: 'Foundation female, Falcons Valley', ar: 'الأنثى المؤسسة، وادي الصقور' },
    ringNumber: 'SK 19 FV 0034',
    status: 'breeding',
    photos: [],
    description: {
      sk: 'Starostlivá matka s výnimočným pokojom pri hniezdení.',
      en: 'Attentive mother with exceptional calm on the nest.',
      ar: 'أم حنون بهدوء استثنائي على العش.',
    },
  },
  {
    id: 'lomnica',
    name: 'Lomnica',
    species: 'gyr',
    sex: 'male',
    hatched: '2018-04-20',
    weightGrams: 1150,
    wingspanCm: 120,
    origin: { sk: 'Chovný samec, import z Nemecka', en: 'Breeding male, imported from Germany', ar: 'ذكر تربية، مستورد من ألمانيا' },
    ringNumber: 'DE 18 GYR 1183',
    status: 'breeding',
    photos: [],
    description: {
      sk: 'Biely gyr s dokonalou stavbou tela. Otec našich hybridov.',
      en: 'White gyrfalcon with perfect conformation. Sire of our hybrids.',
      ar: 'جير أبيض ببنية جسم مثالية. أبو هجائننا.',
    },
  },
  {
    id: 'poprad',
    name: 'Poprad',
    species: 'peregrine',
    sex: 'female',
    hatched: '2020-04-28',
    weightGrams: 1060,
    wingspanCm: 112,
    origin: VALLEY,
    ringNumber: 'SK 20 FV 0077',
    status: 'breeding',
    photos: [],
    description: {
      sk: 'Dcéra Kriváňa a Bystrej, dnes matka našich najrýchlejších hybridov.',
      en: 'Daughter of Kriváň and Bystrá, now dam of our fastest hybrids.',
      ar: 'ابنة كريفان وبيسترا، واليوم أم أسرع هجائننا.',
    },
  },
]

export const forSale = falcons.filter((f) => f.status !== 'breeding')
export const breeders = falcons.filter((f) => f.status === 'breeding')
