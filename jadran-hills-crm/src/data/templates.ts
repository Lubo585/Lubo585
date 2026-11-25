// Vytvorenie projektu z parametrov: jednotky, výkaz výmer, rozpočet, harmonogram,
// kontrolný zoznam povolení (Chorvátsko), register rizík a úvodné úlohy.
// Šablóny sú všeobecné – konkrétne (dôverné) údaje projektu prichádzajú v `ProjectParams`.

import type {
  Contact,
  CostItem,
  DocItem,
  ID,
  MediaItem,
  Parcel,
  PermitItem,
  Phase,
  ProjectData,
  ProjectInfo,
  Risk,
  Settings,
  Task,
  TechParam,
  Tender,
  Unit,
} from '../types'
import { generateBoq, type BuildingGeometry, type PhaseKey, type SiteGeometry } from './boqTemplate'

export interface UnitTemplate {
  no: number
  floor: number
  layout: string
  bedrooms: number
  interior: number
  coveredTerrace: number
  loggia: number
  roofTerrace: number
  garden: number
  parking: number
  orientation: string
  note: string
}

export interface BuildingParams {
  code: string
  name: string
  parcelNumber: string
  designRef: string
  grossFloorArea: number
  grossVolume: number
  note: string
}

export interface Rates {
  landTaxPct: number // daň z prevodu nehnuteľností pri kúpe pozemku (0 pri predaji s DPH)
  communalPerM3: number // komunálny príspevok €/m³
  waterPerM3: number // vodný príspevok €/m³
  gridPerKw: number // pripojovací poplatok elektrina €/kW
  peakPowerKw: number // pripojovaný výkon spolu (kW)
  basePricePerM2: number // cenníková cena €/m² predajnej plochy
  parkingPrice?: number // cena parkovacieho miesta, ak sa kupuje k bytu zvlášť (inak je v cene bytu)
  landExitPerM2: number // alternatíva: predaj pozemku s povolením
  contingencyPct: number // stavebná rezerva
  priceIndex: number // cenová hladina výkazu výmer (1 = základné ceny šablóny)
  interestPct: number
  loanSharePct: number // úver ako % stavebných nákladov
}

export interface ProjectParams {
  project: ProjectInfo
  startMonth: string
  landPaid: boolean
  parcels: Omit<Parcel, 'id'>[]
  buildings: BuildingParams[]
  geometry: BuildingGeometry
  site: Omit<SiteGeometry, 'buildings'>
  unitTemplates: UnitTemplate[]
  rates: Rates
  tech: Omit<TechParam, 'id'>[]
  contacts: Omit<Contact, 'id'>[]
  documents: Omit<DocItem, 'id'>[]
  /** Obrázky pribalené k súkromnému zostaveniu (priečinok private/media). */
  media?: MediaSeed[]
}

export type MediaSeed = Pick<MediaItem, 'title' | 'note' | 'kind' | 'w' | 'h' | 'line' | 'cover'> & { file: string }

// ───────────────────────── Harmonogram ─────────────────────────

interface PhaseSeed extends Omit<Phase, 'id' | 'progress'> {
  key: string
}

const PHASES: PhaseSeed[] = [
  { key: 'prep', name: 'Príprava realizácie – tendre, zmluvy, financovanie, realizačný projekt', group: 'prep', start: 0, duration: 4, tag: null, note: '' },
  { key: 'fees', name: 'Poplatky, prípojky a ohlásenie začatia stavby', group: 'prep', start: 3, duration: 1, tag: null, note: 'Ohlásenie začatia stavby najneskôr 8 dní vopred.' },
  { key: 'earth', name: 'Zemné práce', group: 'build', start: 4, duration: 1, tag: 'construction_start', note: 'Zemné práce musia skončiť pred letným zákazom prác.' },
  { key: 'foundations', name: 'Základy a spodná stavba', group: 'build', start: 5, duration: 2, tag: null, note: '' },
  { key: 'shell', name: 'Hrubá stavba – murivo, stropy, schodisko', group: 'build', start: 6, duration: 9, tag: 'shell', note: 'Trvanie zahŕňa letnú prestávku konštrukčných prác počas turistickej sezóny.' },
  { key: 'roof', name: 'Strecha, terasy a hydroizolácie', group: 'build', start: 15, duration: 2, tag: null, note: '' },
  { key: 'windows', name: 'Výplne otvorov', group: 'build', start: 15, duration: 2, tag: null, note: '' },
  { key: 'mep', name: 'Inštalácie – zdravotechnika, elektro, klimatizácia', group: 'build', start: 15, duration: 6, tag: null, note: '' },
  { key: 'plaster', name: 'Priečky, omietky a potery', group: 'build', start: 16, duration: 3, tag: null, note: '' },
  { key: 'pool', name: 'Bazény', group: 'build', start: 16, duration: 3, tag: null, note: 'Výkopy a betonáž dokončiť pred letným zákazom prác.' },
  { key: 'facade', name: 'Fasáda a zateplenie', group: 'build', start: 17, duration: 3, tag: null, note: '' },
  { key: 'finishes', name: 'Obklady, dlažby, maľby, dvere', group: 'build', start: 18, duration: 4, tag: null, note: 'Vnútorné práce možno robiť aj počas sezóny.' },
  { key: 'site', name: 'Areál – múry, spevnené plochy, prípojky, zeleň', group: 'build', start: 17, duration: 3, tag: null, note: '' },
  { key: 'completion', name: 'Technická prehliadka a kolaudácia (uporabna dozvola)', group: 'finish', start: 22, duration: 2, tag: 'completion', note: '' },
  { key: 'condo', name: 'Rozdelenie na byty a zápis do pozemkovej knihy (etažiranje)', group: 'finish', start: 23, duration: 2, tag: null, note: '' },
  { key: 'handover', name: 'Odovzdávanie bytov kupujúcim', group: 'finish', start: 24, duration: 2, tag: 'handover', note: '' },
  { key: 'presale', name: 'Predpredaj a predaj', group: 'sales', start: 2, duration: 28, tag: 'presale', note: '' },
]

const phaseId = (key: string): ID => `ph_${key}`

// ───────────────────────── Povolenia (Chorvátsko) ─────────────────────────

type PermitSeed = Omit<PermitItem, 'id' | 'due' | 'doneDate'>

const PERMITS: PermitSeed[] = [
  { group: 'Pred začatím stavby', name: 'Právoplatné stavebné povolenie', nameLocal: 'pravomoćna građevinska dozvola', authority: 'Upravni odjel za prostorno uređenje i graditeljstvo', status: 'done', note: 'Stavbu treba začať v zákonnej lehote od právoplatnosti, inak povolenie zaniká. Doplňte dátum právoplatnosti a lehotu v karte projektu; ktorá úprava platí pre vaše povolenie, overte u advokáta.' },
  { group: 'Pred začatím stavby', name: 'Zmena investora v stavebnom povolení', nameLocal: 'izmjena građevinske dozvole – promjena investitora', authority: 'Stavebný úrad', status: 'todo', note: 'Potrebné, ak pozemok kúpila iná spoločnosť, než je uvedená v povolení. Ak sa investor nezmenil, označte ako „netýka sa“.' },
  { group: 'Pred začatím stavby', name: 'Realizačný projekt a výkaz výmer', nameLocal: 'izvedbeni projekt, troškovnik', authority: 'Projektant', status: 'todo', note: 'Podklad pre tender a pre presný výkaz výmer.' },
  { group: 'Pred začatím stavby', name: 'Geotechnický prieskum', nameLocal: 'geotehnički elaborat', authority: 'Geotechnik', status: 'todo', note: 'V hlavnom projekte nie je prieskum podložia; dôležité pre základy a bazény.' },
  { group: 'Pred začatím stavby', name: 'Zmluva so zhotoviteľom', nameLocal: 'ugovor o građenju', authority: 'Zhotoviteľ', status: 'todo', note: 'Pevná cena, harmonogram, zádržné, záruky, zmluvné pokuty.' },
  { group: 'Pred začatím stavby', name: 'Menovanie stavebného dozoru', nameLocal: 'imenovanje nadzornog inženjera', authority: 'Investor', status: 'todo', note: 'Povinný odborný dozor (stručni nadzor) počas celej výstavby.' },
  { group: 'Pred začatím stavby', name: 'Koordinátor BOZP a plán výstavby', nameLocal: 'koordinator zaštite na radu, plan izvođenja radova', authority: 'Investor', status: 'todo', note: '' },
  { group: 'Pred začatím stavby', name: 'Komunálny príspevok – výmer a úhrada', nameLocal: 'rješenje o komunalnom doprinosu', authority: 'Obec (Općina)', status: 'todo', note: 'Počíta sa z obostavaného objemu (m³); bazény podľa plochy.' },
  { group: 'Pred začatím stavby', name: 'Vodný príspevok – výmer a úhrada', nameLocal: 'rješenje o vodnom doprinosu', authority: 'Hrvatske vode', status: 'todo', note: '' },
  { group: 'Pred začatím stavby', name: 'Zmluva o pripojení – elektrina', nameLocal: 'ugovor o priključenju (HEP ODS)', authority: 'HEP ODS', status: 'progress', note: 'Elektroenergetický súhlas je podľa projektu vydaný; uzavrieť zmluvu a uhradiť poplatok.' },
  { group: 'Pred začatím stavby', name: 'Prípojka vody a kanalizácie', nameLocal: 'ugovor o priključenju na vodoopskrbu i odvodnju', authority: 'Vodárenská spoločnosť', status: 'todo', note: '' },
  { group: 'Pred začatím stavby', name: 'Vytýčenie stavby geodetom', nameLocal: 'iskolčenje građevine', authority: 'Oprávnený geodet', status: 'todo', note: '' },
  { group: 'Pred začatím stavby', name: 'Ohlásenie začatia stavby', nameLocal: 'prijava početka građenja', authority: 'Stavebný úrad, stavebná inšpekcia', status: 'todo', note: 'Najneskôr 8 dní pred začatím prác.' },
  { group: 'Pred začatím stavby', name: 'Tabuľa a oplotenie staveniska', nameLocal: 'ploča gradilišta', authority: 'Zhotoviteľ', status: 'todo', note: '' },
  { group: 'Pred začatím stavby', name: 'Poistenie stavby', nameLocal: 'osiguranje objekta u izgradnji (CAR)', authority: 'Poisťovňa', status: 'todo', note: '' },
  { group: 'Pred začatím stavby', name: 'Overenie sezónneho zákazu stavebných prác', nameLocal: 'odluka o privremenoj zabrani izvođenja građevinskih radova', authority: 'Obec (Općina)', status: 'todo', note: 'Pobrežné obce každoročne zakazujú zemné a konštrukčné práce v sezóne (spravidla polovica júna až začiatok septembra). Overte aktuálne rozhodnutie obce.' },
  { group: 'Počas stavby', name: 'Stavebný denník', nameLocal: 'građevinski dnevnik', authority: 'Zhotoviteľ, dozor', status: 'todo', note: '' },
  { group: 'Počas stavby', name: 'Kontrolné skúšky a doklady o materiáloch', nameLocal: 'izjave o svojstvima, ispitivanja betona', authority: 'Zhotoviteľ, dozor', status: 'todo', note: '' },
  { group: 'Počas stavby', name: 'Zmeny projektu – zmena povolenia', nameLocal: 'izmjena i dopuna građevinske dozvole', authority: 'Stavebný úrad', status: 'na', note: 'Len ak sa stavba odchýli od hlavného projektu.' },
  { group: 'Po dokončení', name: 'Záverečná správa dozoru a vyhlásenie zhotoviteľa', nameLocal: 'završno izvješće nadzornog inženjera, izjava izvođača', authority: 'Dozor, zhotoviteľ', status: 'todo', note: '' },
  { group: 'Po dokončení', name: 'Geodetické zameranie a zápis stavby do katastra', nameLocal: 'geodetski elaborat za evidentiranje građevine', authority: 'Geodet, kataster', status: 'todo', note: '' },
  { group: 'Po dokončení', name: 'Energetické certifikáty', nameLocal: 'energetski certifikat', authority: 'Energetický certifikátor', status: 'todo', note: 'Potrebné pre kolaudáciu aj predaj.' },
  { group: 'Po dokončení', name: 'Technická prehliadka a kolaudačné rozhodnutie', nameLocal: 'tehnički pregled, uporabna dozvola', authority: 'Stavebný úrad', status: 'todo', note: '' },
  { group: 'Po dokončení', name: 'Rozdelenie na bytové jednotky', nameLocal: 'etažni elaborat, potvrda o samostalnim uporabnim cjelinama', authority: 'Projektant, stavebný úrad', status: 'todo', note: '' },
  { group: 'Po dokončení', name: 'Zápis bytov do pozemkovej knihy', nameLocal: 'uknjižba etažnog vlasništva', authority: 'Pozemkovoknižný súd', status: 'todo', note: '' },
  { group: 'Po dokončení', name: 'Správca domu a zmluva spoluvlastníkov', nameLocal: 'međuvlasnički ugovor, upravitelj zgrade, pričuva', authority: 'Investor, správca', status: 'todo', note: 'Vrátane pravidiel užívania bazéna a spoločných priestorov. Krátkodobý prenájom v bytovom dome vyžaduje súhlas dvoch tretín spoluvlastníkov – súhlas možno zakotviť v zmluve ešte pred predajom bytov.' },
  { group: 'Predaj', name: 'Vzor predzmluvy a kúpnej zmluvy', nameLocal: 'predugovor, ugovor o kupoprodaji', authority: 'Advokát (HR)', status: 'todo', note: 'Splátkový kalendár, zabezpečenie kupujúcich, termín odovzdania.' },
  { group: 'Predaj', name: 'Daňový režim predaja', nameLocal: 'PDV / porez na promet nekretnina', authority: 'Daňový poradca', status: 'todo', note: 'Prvý predaj novostavby platiteľom DPH podlieha DPH; overiť odpočet DPH z výstavby a režim pri pozemku.' },
  { group: 'Predaj', name: 'OIB pre zahraničných kupujúcich', nameLocal: 'osobni identifikacijski broj', authority: 'Porezna uprava', status: 'na', note: 'Kupujúci z EÚ nadobúdajú nehnuteľnosti bez obmedzení; potrebujú OIB.' },
  { group: 'Predaj', name: 'Kategorizácia pre krátkodobý prenájom', nameLocal: 'rješenje o odobrenju za pružanje ugostiteljskih usluga u domaćinstvu', authority: 'Úrad župy', status: 'na', note: 'Voliteľné – podpora pre kupujúcich-investorov alebo pri stratégii držby.' },
]

// ───────────────────────── Riziká ─────────────────────────

type RiskSeed = Omit<Risk, 'id' | 'owner' | 'status'>

const RISKS: RiskSeed[] = [
  { category: 'Náklady', title: 'Prekročenie stavebných nákladov (rast cien prác a materiálov)', probability: 4, impact: 4, mitigation: 'Tender s pevnou cenou po oddieloch, minimálne 3 ponuky, stavebná rezerva, kontrola zmien cez dozor.' },
  { category: 'Trh', title: 'Pomalší predaj alebo tlak na ceny', probability: 3, impact: 5, mitigation: 'Predpredaj pred začatím stavby, viac predajných kanálov a krajín, etapizácia výstavby po domoch.' },
  { category: 'Termín', title: 'Oneskorenie výstavby (kapacity zhotoviteľov, počasie, dodávky)', probability: 3, impact: 4, mitigation: 'Zmluvné míľniky a pokuty, rezerva v harmonograme, týždenné kontrolné dni.' },
  { category: 'Termín', title: 'Sezónny zákaz stavebných prác v obci', probability: 3, impact: 3, mitigation: 'Overiť rozhodnutie obce na daný rok; hrubú stavbu plánovať mimo sezóny, v lete vnútorné práce.' },
  { category: 'Povolenia', title: 'Zánik stavebného povolenia pri nezačatí stavby v zákonnej lehote', probability: 2, impact: 5, mitigation: 'Sledovať lehotu od právoplatnosti, včas ohlásiť začatie stavby, prípadne požiadať o predĺženie.' },
  { category: 'Financovanie', title: 'Nedostatok vlastných zdrojov alebo podmienky banky (predpredaj)', probability: 3, impact: 4, mitigation: 'Rokovať s viacerými bankami, pripraviť rezervu, zvážiť spoluinvestora alebo etapizáciu.' },
  { category: 'Technické', title: 'Podložie – skala alebo podzemná voda pri základoch a bazénoch', probability: 3, impact: 3, mitigation: 'Geotechnický prieskum pred tendrom, jednotkové ceny za výkop v skale v zmluve.' },
  { category: 'Technické', title: 'Chýbajúce alebo nejednoznačné údaje vo výkaze výmer', probability: 4, impact: 3, mitigation: 'Realizačný projekt s podrobným výkazom, overenie množstiev označených ako odhad.' },
  { category: 'Kvalita', title: 'Vady diela a reklamácie kupujúcich', probability: 3, impact: 3, mitigation: 'Zádržné 5–10 %, banková záruka, preberacie protokoly, fotodokumentácia zakrývaných konštrukcií.' },
  { category: 'Siete', title: 'Termíny a kapacita prípojok (elektrina, voda, kanalizácia)', probability: 3, impact: 3, mitigation: 'Včas uzavrieť zmluvy o pripojení, overiť spôsob odkanalizovania.' },
  { category: 'Dane', title: 'Nesprávne nastavený režim DPH pri kúpe pozemku a predaji bytov', probability: 2, impact: 4, mitigation: 'Daňový poradca v Chorvátsku pred prvou predzmluvou; overiť odpočet DPH z výstavby.' },
  { category: 'Právne', title: 'Prístupová cesta a vecné bremená', probability: 2, impact: 4, mitigation: 'Overiť vlastníctvo a zápis práva prechodu k parcele cesty, zmluvne upraviť užívanie.' },
  { category: 'Trh', title: 'Zmeny regulácie a zdanenia krátkodobého prenájmu', probability: 3, impact: 3, mitigation: 'Nestavať predaj len na výnose z prenájmu; sledovať legislatívu, pripraviť alternatívne argumenty.' },
  { category: 'Financovanie', title: 'Rast úrokových sadzieb', probability: 2, impact: 2, mitigation: 'Fixácia alebo strop, rýchle splácanie úveru z predpredaja.' },
]

// ───────────────────────── Úlohy ─────────────────────────

type TaskSeed = Omit<Task, 'id' | 'owner' | 'due' | 'status'> & { dueInDays: number }

const TASKS: TaskSeed[] = [
  { title: 'Doplniť skutočnú kúpnu cenu a vedľajšie náklady pozemku', area: 'Ekonomika', priority: 1, dueInDays: 7, note: 'Východisková cena je predpoklad – upravte parcely v karte projektu.' },
  { title: 'Overiť plochy bytov, terás, záhrad a parkovanie podľa architektonického projektu', area: 'Jednotky', priority: 1, dueInDays: 10, note: 'Plochy sú prevzaté z výkresov inštalácií; záhrady a parkovanie nie sú známe.' },
  { title: 'Zadať realizačný projekt a podrobný výkaz výmer', area: 'Výkaz výmer', priority: 1, dueInDays: 14, note: '' },
  { title: 'Objednať geotechnický prieskum', area: 'Príprava', priority: 2, dueInDays: 14, note: '' },
  { title: 'Overiť sezónny zákaz stavebných prác a potvrdiť harmonogram', area: 'Harmonogram', priority: 1, dueInDays: 14, note: '' },
  { title: 'Pripraviť tendrové balíky a osloviť aspoň 3 zhotoviteľov', area: 'Tendre', priority: 1, dueInDays: 30, note: '' },
  { title: 'Rokovať s bankami o projektovom financovaní', area: 'Financovanie', priority: 1, dueInDays: 30, note: 'Zistiť požadovaný podiel predpredaja a vlastných zdrojov.' },
  { title: 'Požiadať o výmer komunálneho a vodného príspevku', area: 'Povolenia', priority: 2, dueInDays: 45, note: '' },
  { title: 'Uzavrieť zmluvu o pripojení na elektrinu', area: 'Povolenia', priority: 2, dueInDays: 45, note: '' },
  { title: 'Overiť spôsob odkanalizovania a prípojku vody', area: 'Povolenia', priority: 2, dueInDays: 30, note: '' },
  { title: 'Schváliť cenník a predajnú stratégiu, vybrať realitné kancelárie', area: 'Predaj', priority: 1, dueInDays: 30, note: '' },
  { title: 'Vizualizácie, web projektu a predajné materiály', area: 'Predaj', priority: 2, dueInDays: 45, note: '' },
  { title: 'Vzor predzmluvy a kúpnej zmluvy s chorvátskym advokátom', area: 'Predaj', priority: 2, dueInDays: 45, note: '' },
  { title: 'Daňové nastavenie – DPH pri predaji a odpočet z výstavby', area: 'Ekonomika', priority: 1, dueInDays: 21, note: '' },
  { title: 'Menovať stavebný dozor a koordinátora BOZP', area: 'Príprava', priority: 2, dueInDays: 60, note: '' },
  { title: 'Poistenie stavby a zodpovednosti', area: 'Príprava', priority: 3, dueInDays: 75, note: '' },
  { title: 'Ohlásiť začatie stavby (8 dní vopred)', area: 'Povolenia', priority: 1, dueInDays: 100, note: '' },
]

// ───────────────────────── Pomocné funkcie ─────────────────────────

function addDays(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step

export function defaultSettings(startMonth: string, rates: Rates): Settings {
  return {
    startMonth,
    vatPct: 25,
    pricesIncludeVat: true,
    profitTaxPct: 18,
    areaCoef: { coveredTerrace: 0.5, loggia: 0.75, roofTerrace: 0.25, garden: 0.1 },
    pricing: { basePerM2: rates.basePricePerM2, floorAdjPct: [0, 2, 4], buildingAdjPct: {}, parkingPrice: rates.parkingPrice ?? 0, roundTo: 500 },
    sales: { startMonth: 2, endMonth: 30, depositPct: 10, shellPct: 30, finalPct: 60 },
    finance: { equity: 0, loanLimit: 0, interestPct: rates.interestPct, feePct: 1 },
    rent: { adr1: 100, adr2: 145, adr2roof: 175, nights: 85, feesPct: 25, costPerUnitYear: 2600, capRatePct: 5.5 },
    landExitPerM2: rates.landExitPerM2,
    scenarios: [
      { id: 'sc_pes', name: 'Pesimistický', priceDeltaPct: -8, constructionDeltaPct: 12, delayMonths: 6, salesShiftMonths: 9, interestDeltaPp: 1 },
      { id: 'sc_real', name: 'Realistický', priceDeltaPct: 0, constructionDeltaPct: 0, delayMonths: 0, salesShiftMonths: 0, interestDeltaPp: 0 },
      { id: 'sc_opt', name: 'Optimistický', priceDeltaPct: 6, constructionDeltaPct: -3, delayMonths: 0, salesShiftMonths: -4, interestDeltaPp: -0.5 },
    ],
  }
}

function costTemplate(p: ProjectParams, landTotal: number): CostItem[] {
  const nB = p.buildings.length
  const nU = p.unitTemplates.length * nB
  const volume = p.buildings.reduce((a, b) => a + b.grossVolume, 0)
  const r = p.rates
  let i = 0
  const item = (c: Omit<CostItem, 'id' | 'contracted' | 'paid'> & { paid?: number }): CostItem => {
    i += 1
    return { id: `cost_${String(i).padStart(2, '0')}`, contracted: c.paid ?? 0, paid: c.paid ?? 0, group: c.group, name: c.name, calc: c.calc, timing: c.timing, note: c.note }
  }
  return [
    item({ group: 'land', name: 'Kúpna cena pozemkov', calc: { kind: 'land' }, timing: { mode: 'month', month: 0 }, paid: p.landPaid ? landTotal : 0, note: 'Súčet parciel × cena za m² (upravte v karte projektu).' }),
    item({ group: 'land', name: 'Daň z prevodu nehnuteľností', calc: { kind: 'pct', base: 'land', pct: r.landTaxPct }, timing: { mode: 'month', month: 0 }, paid: p.landPaid ? (landTotal * r.landTaxPct) / 100 : 0, note: 'Platí sa, ak predaj pozemku nepodliehal DPH. Pri kúpe s DPH nastavte 0 %.' }),
    item({ group: 'land', name: 'Právne služby, notár a poplatky pri kúpe', calc: { kind: 'fixed', amount: 9000 }, timing: { mode: 'month', month: 0 }, paid: p.landPaid ? 9000 : 0, note: '' }),

    item({ group: 'prep', name: 'Realizačný projekt a podrobný výkaz výmer', calc: { kind: 'qty', qty: nB, unit: 'dom', unitPrice: 12000 }, timing: { mode: 'phase', phaseId: phaseId('prep') }, note: 'Hlavný projekt je hotový; realizačná dokumentácia pre tender a stavbu.' }),
    item({ group: 'prep', name: 'Geotechnický prieskum', calc: { kind: 'fixed', amount: 6500 }, timing: { mode: 'phase', phaseId: phaseId('prep') }, note: '' }),
    item({ group: 'prep', name: 'Geodet – vytýčenie, zameranie, elaborát pre kataster', calc: { kind: 'qty', qty: nB, unit: 'dom', unitPrice: 2800 }, timing: { mode: 'phase', phaseId: phaseId('fees') }, note: '' }),
    item({ group: 'prep', name: 'Komunálny príspevok (komunalni doprinos)', calc: { kind: 'qty', qty: Math.round(volume), unit: 'm³', unitPrice: r.communalPerM3 }, timing: { mode: 'phase', phaseId: phaseId('fees') }, note: 'Obostavaný objem × sadzba obce. Sadzbu overte v aktuálnom rozhodnutí obce.' }),
    item({ group: 'prep', name: 'Vodný príspevok (vodni doprinos)', calc: { kind: 'qty', qty: Math.round(volume), unit: 'm³', unitPrice: r.waterPerM3 }, timing: { mode: 'phase', phaseId: phaseId('fees') }, note: 'Obostavaný objem × sadzba Hrvatske vode.' }),
    item({ group: 'prep', name: 'Pripojovací poplatok – elektrina', calc: { kind: 'qty', qty: r.peakPowerKw, unit: 'kW', unitPrice: r.gridPerKw }, timing: { mode: 'phase', phaseId: phaseId('fees') }, note: 'Pripojovaný výkon × jednotková cena distribútora.' }),
    item({ group: 'prep', name: 'Pripojovacie poplatky – voda a kanalizácia', calc: { kind: 'qty', qty: nB, unit: 'dom', unitPrice: 3500 }, timing: { mode: 'phase', phaseId: phaseId('fees') }, note: '' }),
    item({ group: 'prep', name: 'Správne poplatky a ohlásenia', calc: { kind: 'fixed', amount: 2500 }, timing: { mode: 'phase', phaseId: phaseId('fees') }, note: '' }),

    item({ group: 'build', name: 'Stavebné práce – domy', calc: { kind: 'boq', scope: 'building' }, timing: { mode: 'construction' }, note: 'Podľa modulu Výkaz výmer: súčet oddielov × počet domov, alebo sadzby na m².' }),
    item({ group: 'build', name: 'Stavebné práce – areál', calc: { kind: 'boq', scope: 'site' }, timing: { mode: 'construction' }, note: 'Podľa modulu Výkaz výmer – areálové oddiely.' }),
    item({ group: 'build', name: 'Stavebná rezerva', calc: { kind: 'pct', base: 'construction', pct: r.contingencyPct }, timing: { mode: 'construction' }, note: 'Rezerva na nepredvídané práce a spresnenie množstiev.' }),

    item({ group: 'soft', name: 'Stavebný dozor (stručni nadzor)', calc: { kind: 'pct', base: 'construction', pct: 1.8 }, timing: { mode: 'construction' }, note: '' }),
    item({ group: 'soft', name: 'Projektový manažment a inžiniering', calc: { kind: 'pct', base: 'construction', pct: 2 }, timing: { mode: 'construction' }, note: '' }),
    item({ group: 'soft', name: 'Koordinátor BOZP', calc: { kind: 'fixed', amount: 9000 }, timing: { mode: 'construction' }, note: '' }),
    item({ group: 'soft', name: 'Poistenie stavby a zodpovednosti', calc: { kind: 'pct', base: 'construction', pct: 0.3 }, timing: { mode: 'phase', phaseId: phaseId('earth') }, note: '' }),
    item({ group: 'soft', name: 'Skúšky, revízie a energetické certifikáty', calc: { kind: 'fixed', amount: nU * 150 + nB * 1200 }, timing: { mode: 'phase', phaseId: phaseId('completion') }, note: '' }),
    item({ group: 'soft', name: 'Technická prehliadka a kolaudácia', calc: { kind: 'qty', qty: nB, unit: 'dom', unitPrice: 1800 }, timing: { mode: 'phase', phaseId: phaseId('completion') }, note: '' }),
    item({ group: 'soft', name: 'Rozdelenie na byty a zápis do pozemkovej knihy', calc: { kind: 'qty', qty: nU, unit: 'byt', unitPrice: 300 }, timing: { mode: 'phase', phaseId: phaseId('condo') }, note: '' }),

    item({ group: 'sales', name: 'Provízie realitných kancelárií', calc: { kind: 'pct', base: 'revenue', pct: 2 }, timing: { mode: 'sales' }, note: 'Predpoklad: približne dve tretiny predajov cez sprostredkovateľa s províziou 3 %.' }),
    item({ group: 'sales', name: 'Marketing – značka, web, vizualizácie, kampane', calc: { kind: 'pct', base: 'revenue', pct: 1 }, timing: { mode: 'phase', phaseId: phaseId('presale') }, note: '' }),
    item({ group: 'sales', name: 'Vzorový byt a home staging', calc: { kind: 'fixed', amount: 18000 }, timing: { mode: 'phase', phaseId: phaseId('finishes') }, note: '' }),
    item({ group: 'sales', name: 'Právne služby pri predaji', calc: { kind: 'qty', qty: nU, unit: 'byt', unitPrice: 450 }, timing: { mode: 'sales' }, note: '' }),

    item({ group: 'overhead', name: 'Réžia projektovej spoločnosti (účtovníctvo, správa, cesty)', calc: { kind: 'monthly', amount: 2800 }, timing: { mode: 'project' }, note: 'Mesačná suma počas celého projektu – pri meškaní rastie.' }),
    item({ group: 'overhead', name: 'Prevádzka dokončených nepredaných bytov a areálu', calc: { kind: 'monthly', amount: 1800 }, timing: { mode: 'phase', phaseId: phaseId('handover') }, note: 'Energie, údržba bazénov a daň z nehnuteľností za nepredané byty do dopredaja.' }),

    item({ group: 'reserve', name: 'Všeobecná rezerva projektu', calc: { kind: 'pct', base: 'construction', pct: 2 }, timing: { mode: 'construction' }, note: '' }),
  ]
}

function tenderTemplate(sectionIds: ID[]): Tender[] {
  const pick = (codes: string[]) => sectionIds.filter((id) => codes.some((c) => id === `sec_${c}`))
  const mk = (id: string, name: string, codes: string[], note = ''): Tender => ({
    id, name, sectionIds: pick(codes), status: 'prep', deadline: null, bids: [], winnerBidId: null, note,
  })
  return [
    mk('tn_shell', 'Hrubá stavba', ['01', '02', '03', '04'], 'Zemné práce, základy, murivo, stropy.'),
    mk('tn_envelope', 'Strecha, fasáda a výplne otvorov', ['05', '06', '09']),
    mk('tn_interior', 'Dokončovacie práce', ['07', '08', '10', '11']),
    mk('tn_mep', 'Technické zariadenia budov', ['12', '13', '14']),
    mk('tn_pool', 'Bazény', ['15']),
    mk('tn_site', 'Areál a prípojky', ['20', '21', '22', '23', '24']),
  ]
}

/** Zostaví kompletný projekt z parametrov. */
export function createProject(p: ProjectParams, today: string): ProjectData {
  const now = new Date().toISOString()
  const parcels: Parcel[] = p.parcels.map((x, i) => ({ ...x, id: `par_${i + 1}` }))
  const landTotal = parcels.reduce((a, x) => a + x.area * x.pricePerM2, 0)

  const buildings = p.buildings.map((b) => ({ ...b, id: `b_${b.code}`, startOffset: 0 }))
  const units: Unit[] = []
  for (const b of buildings) {
    for (const t of p.unitTemplates) {
      units.push({
        id: `u_${b.code}${t.no}`,
        buildingId: b.id,
        label: `${b.code}${t.no}`,
        floor: t.floor,
        layout: t.layout,
        bedrooms: t.bedrooms,
        interior: t.interior,
        coveredTerrace: t.coveredTerrace,
        loggia: t.loggia,
        roofTerrace: t.roofTerrace,
        garden: t.garden,
        parking: t.parking,
        orientation: t.orientation,
        status: 'free',
        priceMode: 'auto',
        manualPrice: 0,
        soldPrice: null,
        saleDate: null,
        clientId: null,
        note: t.note,
      })
    }
  }

  const phases: Phase[] = PHASES.map(({ key, ...rest }) => ({ ...rest, id: phaseId(key), progress: 0 }))
  const keys: PhaseKey[] = ['earth', 'foundations', 'shell', 'roof', 'windows', 'plaster', 'facade', 'finishes', 'mep', 'pool', 'site']
  const phaseIds = Object.fromEntries(keys.map((k) => [k, phaseId(k)])) as Record<PhaseKey, ID>
  const { sections, items } = generateBoq(p.geometry, { ...p.site, buildings: buildings.length }, phaseIds, p.rates.priceIndex || 1)

  const costs = costTemplate(p, landTotal)
  const settings = defaultSettings(p.startMonth, p.rates)

  // Východiskové financovanie: úver ako podiel stavebných nákladov, zvyšok vlastné zdroje.
  const nB = Math.max(1, buildings.length)
  const construction = items.reduce((a, it) => {
    const sec = sections.find((s) => s.id === it.sectionId)
    return a + it.qty * it.unitPrice * (sec?.scope === 'building' ? nB : 1)
  }, 0)
  settings.finance.loanLimit = roundTo((construction * p.rates.loanSharePct) / 100, 50_000)
  settings.finance.equity = roundTo(landTotal * (1 + p.rates.landTaxPct / 100) + construction * 0.45, 50_000)

  return {
    schema: 1,
    meta: { createdAt: now, updatedAt: now },
    project: p.project,
    settings,
    parcels,
    buildings,
    tech: p.tech.map((t, i) => ({ ...t, id: `tech_${i + 1}` })),
    units,
    clients: [],
    activities: [],
    payments: [],
    costs,
    boqSections: sections,
    boq: items,
    phases,
    contacts: p.contacts.map((c, i) => ({ ...c, id: `con_${i + 1}` })),
    tenders: tenderTemplate(sections.map((s) => s.id)),
    permits: PERMITS.map((x, i) => ({ ...x, id: `per_${i + 1}`, due: null, doneDate: null })),
    documents: p.documents.map((d, i) => ({ ...d, id: `doc_${i + 1}` })),
    risks: RISKS.map((x, i) => ({ ...x, id: `risk_${i + 1}`, owner: '', status: 'open' as const })),
    tasks: TASKS.map(({ dueInDays, ...x }, i) => ({ ...x, id: `task_${i + 1}`, owner: '', due: addDays(today, dueInDays), status: 'todo' as const })),
    media: (p.media ?? []).map((m, i) => ({ ...m, id: `med_${i + 1}`, assetId: null, src: null, addedAt: now })),
  }
}
