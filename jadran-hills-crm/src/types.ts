// Dátový model CRM pre developerský projekt.
// Všetky sumy sú v EUR. Náklady sa vedú bez DPH (predpoklad: odpočítateľná),
// predajné ceny v cenníku s DPH (ak je to zapnuté v nastaveniach).

export type ID = string

// ───────────────────────── Projekt ─────────────────────────

export interface ProjectInfo {
  name: string
  subtitle: string
  investor: string
  investorId: string // OIB / IČO
  investorAddress: string
  location: string
  cadastral: string
  stage: string // slovný popis štádia
  /** Dátum právoplatnosti stavebného povolenia (YYYY-MM-DD) – od neho plynie 3-ročná lehota na začatie stavby. */
  permitFinalDate: string | null
  /** Lehota na začatie stavby v rokoch od právoplatnosti povolenia. */
  permitValidYears: number
  notes: string
}

export type ParcelUse = 'building' | 'road' | 'other'

export interface Parcel {
  id: ID
  number: string
  kind: string // kultúra podľa katastra
  area: number // m²
  use: ParcelUse
  pricePerM2: number // kúpna cena €/m²
  note: string
}

export interface Building {
  id: ID
  code: string // A, B, C
  name: string
  parcelNumber: string
  designRef: string // označenie projektu (ZOP)
  /** Etapizácia: posun začiatku výstavby tohto domu oproti harmonogramu (mesiace). */
  startOffset: number
  grossFloorArea: number // hrubá podlažná plocha vr. terás (m²)
  grossVolume: number // obostavaný objem (m³) – základ pre komunálny/vodný príspevok
  note: string
}

export interface TechParam {
  id: ID
  group: string
  label: string
  value: string
  source: string
}

// ───────────────────────── Jednotky ─────────────────────────

export type UnitStatus = 'free' | 'reserved' | 'precontract' | 'sold' | 'handed'

export interface Unit {
  id: ID
  buildingId: ID
  label: string // napr. A1
  floor: number // 0 = prízemie
  layout: string // napr. 3-izbový (2 spálne)
  bedrooms: number
  interior: number // m² vnútorná podlahová plocha
  coveredTerrace: number // m² krytá terasa
  loggia: number // m²
  roofTerrace: number // m² strešná terasa
  garden: number // m² záhrada / predzáhradka
  parking: number // počet parkovacích miest
  orientation: string
  status: UnitStatus
  priceMode: 'auto' | 'manual'
  manualPrice: number // cenníková cena pri ručnom režime
  soldPrice: number | null // skutočná zmluvná cena
  saleDate: string | null // YYYY-MM-DD dátum rezervácie / zmluvy
  clientId: ID | null
  note: string
}

// ───────────────────────── Klienti a obchod ─────────────────────────

export type PipelineStage =
  | 'new'
  | 'contacted'
  | 'viewing'
  | 'offer'
  | 'reservation'
  | 'precontract'
  | 'contract'
  | 'lost'

export interface Client {
  id: ID
  name: string
  email: string
  phone: string
  country: string
  language: string
  source: string
  agent: string // realitná kancelária / maklér
  budget: number
  unitIds: ID[]
  stage: PipelineStage
  nextDate: string | null
  nextAction: string
  note: string
  createdAt: string
}

export type ActivityKind = 'call' | 'email' | 'meeting' | 'viewing' | 'offer' | 'note'

export interface Activity {
  id: ID
  clientId: ID
  date: string
  kind: ActivityKind
  text: string
}

export interface Payment {
  id: ID
  unitId: ID
  clientId: ID | null
  label: string
  due: string // YYYY-MM-DD
  amount: number // s DPH, ako v zmluve
  paid: boolean
  paidDate: string | null
}

// ───────────────────────── Náklady ─────────────────────────

export type CostGroupId = 'land' | 'prep' | 'build' | 'soft' | 'sales' | 'overhead' | 'reserve'

export type CostCalc =
  | { kind: 'fixed'; amount: number }
  | { kind: 'land' } // súčet parciel × cena/m²
  | { kind: 'qty'; qty: number; unit: string; unitPrice: number }
  | { kind: 'pct'; base: 'land' | 'construction' | 'revenue'; pct: number }
  | { kind: 'boq'; scope: 'building' | 'site' } // súčet výkazu výmer
  | { kind: 'monthly'; amount: number } // mesačná suma × trvanie

export type CostTiming =
  | { mode: 'month'; month: number }
  | { mode: 'range'; start: number; months: number }
  | { mode: 'phase'; phaseId: ID }
  | { mode: 'construction' } // podľa harmonogramu stavebných oddielov
  | { mode: 'project' } // rovnomerne od začiatku modelu po odovzdanie (predlžuje sa s meškaním)
  | { mode: 'sales' } // podľa inkasa tržieb

export interface CostItem {
  id: ID
  group: CostGroupId
  name: string
  calc: CostCalc
  timing: CostTiming
  contracted: number // zazmluvnené
  paid: number // uhradené
  note: string
}

// ───────────────────────── Výkaz výmer ─────────────────────────

export interface BoqSection {
  id: ID
  code: string
  name: string
  /** building = množstvá platia na 1 dom (násobia sa počtom domov), site = celý areál. */
  scope: 'building' | 'site'
  phaseId: ID | null // fáza harmonogramu, v ktorej sa oddiel realizuje
}

/** P = údaj priamo z projektu, V = výpočet z údajov projektu, O = odhad (overiť). */
export type BoqSource = 'P' | 'V' | 'O'

export interface BoqItem {
  id: ID
  sectionId: ID
  code: string
  name: string
  unit: string
  qty: number
  unitPrice: number // € bez DPH, dodávka + montáž
  source: BoqSource
  note: string
}

// ───────────────────────── Harmonogram ─────────────────────────

export type PhaseGroup = 'prep' | 'build' | 'finish' | 'sales'
export type PhaseTag = 'construction_start' | 'shell' | 'completion' | 'handover' | 'presale'

export interface Phase {
  id: ID
  name: string
  group: PhaseGroup
  start: number // mesiac od začiatku modelu (0 = settings.startMonth)
  duration: number // mesiace
  progress: number // 0–100 %
  tag: PhaseTag | null
  note: string
}

// ───────────────────────── Partneri a tendre ─────────────────────────

export interface Contact {
  id: ID
  kind: string // projektant, zhotoviteľ, dozor, banka, realitka…
  company: string
  person: string
  role: string
  email: string
  phone: string
  note: string
}

export type TenderStatus = 'prep' | 'sent' | 'bids' | 'evaluation' | 'contract'

export interface Bid {
  id: ID
  contactId: ID | null
  supplier: string
  amount: number
  weeks: number
  note: string
}

export interface Tender {
  id: ID
  name: string
  sectionIds: ID[] // oddiely výkazu výmer v balíku
  status: TenderStatus
  deadline: string | null
  bids: Bid[]
  winnerBidId: ID | null
  note: string
}

// ───────────────────────── Povolenia, dokumenty, riziká, úlohy ─────────────────────────

export type CheckStatus = 'done' | 'progress' | 'todo' | 'na'

export interface PermitItem {
  id: ID
  group: string
  name: string
  nameLocal: string // úradný názov v chorvátčine
  authority: string
  status: CheckStatus
  due: string | null
  doneDate: string | null
  note: string
}

export interface DocItem {
  id: ID
  category: string
  title: string
  buildingCode: string
  url: string
  note: string
}

export type RiskStatus = 'open' | 'watch' | 'closed'

export interface Risk {
  id: ID
  category: string
  title: string
  probability: number // 1–5
  impact: number // 1–5
  mitigation: string
  owner: string
  status: RiskStatus
}

export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Task {
  id: ID
  title: string
  area: string
  owner: string
  due: string | null
  priority: 1 | 2 | 3 // 1 = vysoká
  status: TaskStatus
  note: string
}

// ───────────────────────── Nastavenia modelu ─────────────────────────

export interface Scenario {
  id: ID
  name: string
  priceDeltaPct: number // zmena predajných cien
  constructionDeltaPct: number // zmena stavebných nákladov
  delayMonths: number // predĺženie výstavby
  salesShiftMonths: number // posun konca predaja
  interestDeltaPp: number // zmena úroku v p. b.
}

export interface RentAssumptions {
  adr1: number // priemerná cena za noc – 1 spálňa
  adr2: number // 2 spálne
  adr2roof: number // 2 spálne so strešnou terasou
  nights: number // obsadené noci za rok
  feesPct: number // provízie platforiem + správa (% z tržieb)
  costPerUnitYear: number // energie, údržba, poistenie, pauš. daň na jednotku / rok
  capRatePct: number // výnosová miera pre ocenenie
}

export interface Settings {
  startMonth: string // YYYY-MM = mesiac 0 modelu
  vatPct: number
  pricesIncludeVat: boolean
  profitTaxPct: number
  areaCoef: { coveredTerrace: number; loggia: number; roofTerrace: number; garden: number }
  pricing: {
    basePerM2: number // € za m² predajnej plochy (v cenníkovom vyjadrení)
    floorAdjPct: number[] // príplatok podľa podlažia (index = podlažie)
    buildingAdjPct: Record<ID, number>
    parkingPrice: number // cena parkovacieho miesta (0 = v cene bytu)
    roundTo: number
  }
  sales: {
    startMonth: number // začiatok predpredaja
    endMonth: number // dopredaj
    depositPct: number // záloha pri podpise
    shellPct: number // splátka po dokončení hrubej stavby
    finalPct: number // doplatok pri odovzdaní
  }
  finance: {
    equity: number // dostupné vlastné zdroje
    loanLimit: number // úverový rámec
    interestPct: number // p. a.
    feePct: number // poplatok za poskytnutie z rámca
  }
  rent: RentAssumptions
  landExitPerM2: number // alternatíva: predaj pozemku s povolením (€/m²)
  scenarios: Scenario[]
}

// ───────────────────────── Celý projekt ─────────────────────────

export interface ProjectData {
  schema: 1
  meta: { createdAt: string; updatedAt: string }
  project: ProjectInfo
  settings: Settings
  parcels: Parcel[]
  buildings: Building[]
  tech: TechParam[]
  units: Unit[]
  clients: Client[]
  activities: Activity[]
  payments: Payment[]
  costs: CostItem[]
  boqSections: BoqSection[]
  boq: BoqItem[]
  phases: Phase[]
  contacts: Contact[]
  tenders: Tender[]
  permits: PermitItem[]
  documents: DocItem[]
  risks: Risk[]
  tasks: Task[]
}

/** Kolekcie s položkami, ktoré majú `id` – používa ich generický editor v store. */
export type CollectionKey =
  | 'parcels'
  | 'buildings'
  | 'tech'
  | 'units'
  | 'clients'
  | 'activities'
  | 'payments'
  | 'costs'
  | 'boqSections'
  | 'boq'
  | 'phases'
  | 'contacts'
  | 'tenders'
  | 'permits'
  | 'documents'
  | 'risks'
  | 'tasks'
