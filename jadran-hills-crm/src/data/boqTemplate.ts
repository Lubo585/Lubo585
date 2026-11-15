// Generátor výkazu výmer pre malý murovaný bytový dom so ŽB stropmi a plochou strechou.
// Množstvá sa počítajú z geometrických parametrov stavby; jednotkové ceny sú
// orientačné (dodávka + montáž, bez DPH, chorvátske pobrežie 2026) a treba ich
// nahradiť ponukami zhotoviteľov.
//
// Pôvod množstva: P = údaj priamo z projektu, V = výpočet z údajov projektu,
// O = odhad podľa bežných pomerov (pred tendrom overiť podľa výkresov).

import type { BoqItem, BoqSection, BoqSource, ID } from '../types'

export interface WindowType {
  name: string
  w: number // cm
  h: number // cm
  count: number
  kind: 'sliding' | 'window'
}

export interface PoolGeometry {
  innerL: number
  innerW: number
  depth: number // priemerná hĺbka vody
  outerL: number
  outerW: number
  deckArea: number // spevnená plocha okolo bazéna
}

export interface BuildingGeometry {
  floors: number
  floorHeight: number // konštrukčná výška podlažia (m)
  slabThickness: number // m
  heatedFootprint: number // podlaha na teréne vykurovanej časti (m²)
  grossFootprint: number // pôdorys podlažia vrátane terás (m²)
  netArea: number // úžitková plocha vykurovanej časti – všetky podlažia (m²)
  staircaseArea: number // schodisko na jedno podlažie (m²)
  facadeWallArea: number // obvodové steny bez otvorov (m²)
  windowArea: number // otvory spolu (m²)
  windowTypes: WindowType[]
  extPerimeter: number // obvod vykurovanej časti (m)
  bearingWallLen: number // vnútorné nosné steny na podlažie (m)
  partitionLen: number // priečky na podlažie (m)
  roofInsulatedArea: number // strecha nad vykurovaným priestorom (m²)
  roofTerraceArea: number // pochôdzne strešné terasy (m²)
  greenRoofArea: number // vegetačná strecha (m²)
  coveredTerraceArea: number // kryté terasy a lodžie spolu (m²)
  pergolaArea: number // m²
  parapetLen: number // atiky a deliace steny strešných terás (m)
  railingLen: number // zábradlia terás a lodžií (m)
  apartmentsLarge: number
  apartmentsSmall: number
  bathrooms: number
  wcs: number
  wallTileArea: number // obklady kúpeľní, WC, kuchynské zásteny (m²)
  interiorDoors: number
  acLarge: number // súpravy multi-split 1 + 3
  acSmall: number // súpravy multi-split 1 + 2
  floorHeatingArea: number // elektrické podlahové kúrenie (m²)
  fans: number
  stairSteps: number // stupňov na jedno podlažie
  pool: PoolGeometry | null
}

export interface SiteGeometry {
  buildings: number
  plotArea: number // stavebné parcely spolu (m²)
  roadArea: number // parcela prístupovej cesty (m²)
  fenceLen: number // oplotenie (m)
  retainingLen: number // oporné a ohradové ŽB múry (m)
  parkingSpaces: number
  greenArea: number // zeleň (m²)
}

export type PhaseKey =
  | 'earth'
  | 'foundations'
  | 'shell'
  | 'roof'
  | 'windows'
  | 'plaster'
  | 'facade'
  | 'finishes'
  | 'mep'
  | 'pool'
  | 'site'

const r1 = (v: number) => Math.round(v * 10) / 10
const r2 = (v: number) => Math.round(v * 100) / 100
const f1 = (v: number) => String(r1(v)).replace('.', ',')
const f2 = (v: number) => String(r2(v)).replace('.', ',')

/** Zaokrúhli cenu na tri platné číslice (napr. 197,8 → 198; 6 785 → 6 790). */
function nicePrice(v: number): number {
  if (v <= 0) return 0
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 2)
  return Math.round(v / mag) * mag
}

/**
 * @param priceIndex cenová hladina: 1,00 = základné orientačné ceny šablóny;
 *   vyššia hodnota zohľadní región, rok a prirážku generálneho zhotoviteľa.
 */
export function generateBoq(
  g: BuildingGeometry,
  site: SiteGeometry,
  phaseIds: Partial<Record<PhaseKey, ID>>,
  priceIndex = 1,
): { sections: BoqSection[]; items: BoqItem[] } {
  const sections: BoqSection[] = []
  const items: BoqItem[] = []
  let current: BoqSection | null = null
  let n = 0

  const section = (code: string, name: string, scope: 'building' | 'site', phase: PhaseKey | null) => {
    current = { id: `sec_${code}`, code, name, scope, phaseId: phase ? (phaseIds[phase] ?? null) : null }
    sections.push(current)
    n = 0
  }
  const add = (name: string, unit: string, qty: number, unitPrice: number, source: BoqSource, note = '') => {
    if (!current) return
    n += 1
    const code = `${current.code}.${String(n).padStart(2, '0')}`
    items.push({
      id: `boq_${code.replace('.', '_')}`,
      sectionId: current.id,
      code,
      name,
      unit,
      qty: unit === 'ks' || unit === 'kpl' ? Math.round(qty) : r2(qty),
      unitPrice: priceIndex === 1 ? unitPrice : nicePrice(unitPrice * priceIndex),
      source,
      note,
    })
  }

  const F = g.floors
  const clear = g.floorHeight - g.slabThickness
  const apartments = g.apartmentsLarge + g.apartmentsSmall
  // Dĺžka základových pásov: obvod + vnútorné nosné steny + okraje terás na teréne.
  const foundLen = g.extPerimeter + g.bearingWallLen + Math.max(0, (g.grossFootprint - g.heatedFootprint) / 3)
  const stairHole = Math.max(0, g.staircaseArea / 2)
  const slabArea = g.grossFootprint - stairHole

  // ───────────── 01 Zemné práce ─────────────
  section('01', 'Zemné práce', 'building', 'earth')
  add('Odstránenie ornice a hrubé terénne úpravy v priestore stavby', 'm²', g.grossFootprint * 1.6, 5.5, 'V',
    `pôdorys ${f1(g.grossFootprint)} m² × 1,6 (pracovný priestor)`)
  const excStrip = foundLen * 1.0 * 0.8
  add('Výkop základových pásov a rýh vr. odvozu (zemina / skalné podložie tr. III–V)', 'm³', excStrip, 36, 'O',
    `dĺžka pásov ≈ ${f1(foundLen)} m × 1,0 × 0,8 m; triedu horniny potvrdí geotechnický prieskum`)
  add('Výkop a vyrovnanie pláne pod podlahovú dosku', 'm³', g.grossFootprint * 0.35, 24, 'O',
    `${f1(g.grossFootprint)} m² × 0,35 m`)
  add('Hutnený štrkový podsyp pod podlahovú dosku', 'm³', g.grossFootprint * 0.3, 38, 'V',
    'v projekte vrstva drveného kameniva 10 cm; uvažované 30 cm vr. vyrovnania')
  add('Spätný zásyp základov s hutnením', 'm³', foundLen * 0.35, 18, 'O', `${f1(foundLen)} m × 0,35 m³/m`)

  // ───────────── 02 Základy a spodná stavba ─────────────
  section('02', 'Základy a spodná stavba', 'building', 'foundations')
  const stripM3 = foundLen * 0.8 * 0.6 + 12 * 0.3 * 0.6
  const stemM3 = foundLen * 0.25 * 0.6
  const groundSlabM3 = g.grossFootprint * 0.15
  add('Podkladový betón C12/15 hr. 8 cm pod základové pásy', 'm²', foundLen * 1.0, 14, 'O')
  add('Základové pásy 80/60 cm a 30/60 cm (schodisko), betón C25/30 XC2', 'm³', stripM3, 172, 'V',
    `prierez podľa statiky; ${f1(foundLen)} m × 0,48 m² + pás schodiska`)
  add('Debnenie základových pásov', 'm²', foundLen * 2 * 0.6, 21, 'V')
  add('Základový (nadzákladový) múr hr. 25 cm, betón C25/30', 'm³', stemM3, 185, 'O', 'výška uvažovaná 60 cm')
  add('Debnenie základového múru obojstranné', 'm²', foundLen * 2 * 0.6, 24, 'O')
  add('Podlahová ŽB doska hr. 15 cm, betón C25/30', 'm³', groundSlabM3, 178, 'V',
    `${f1(g.grossFootprint)} m² × 0,15 m (hrúbka podľa statiky)`)
  add('Výstuž základov a podlahovej dosky B500B (tyče, siete Q335)', 't',
    (stripM3 * 70 + stemM3 * 90 + groundSlabM3 * 65) / 1000, 1480, 'O', 'smerné stupne vystuženia 65–90 kg/m³')
  add('Hydroizolácia podlahy na teréne – bitúmenový pás', 'm²', g.heatedFootprint * 1.1, 17, 'P',
    `plocha podlahy na teréne ${f2(g.heatedFootprint)} m² + 10 % presahy`)
  add('Zvislá hydroizolácia a tepelná izolácia sokla XPS', 'm²', g.extPerimeter * 0.6, 46, 'O')
  add('Základový uzemňovací pás FeZn', 'm', foundLen, 6.5, 'V')

  // ───────────── 03 Zvislé nosné konštrukcie ─────────────
  section('03', 'Zvislé nosné konštrukcie', 'building', 'shell')
  const extMasonry = g.facadeWallArea * 0.82
  const intBearing = g.bearingWallLen * clear * F * 0.9
  const nTie = Math.round((g.extPerimeter + g.bearingWallLen) / 2.6)
  const nCol = 6
  const colM3 = F * clear * (nTie * 0.0625 + nCol * 0.1275)
  const parapetM3 = g.parapetLen * 1.05 * 0.15
  const roofHead = 4 * Math.sqrt(g.staircaseArea) * 2.7
  add('Murivo obvodové z dierovaných tehlových blokov hr. 25 cm, malta M5', 'm²', extMasonry, 64, 'V',
    `plocha obvodových stien ${f2(g.facadeWallArea)} m² (tepelná technika) − 18 % ŽB vence a stĺpiky`)
  add('Murivo vnútorné nosné hr. 25 cm (medzibytové a schodiskové steny)', 'm²', intBearing, 64, 'O',
    `≈ ${f1(g.bearingWallLen)} m na podlažie × ${f2(clear)} m × ${F} podl. − otvory`)
  add('Murivo nadstavby výlezu na strešnú terasu', 'm²', roofHead, 64, 'O')
  add('ŽB stužujúce stĺpiky 25/25 a stĺpy 25/51 cm, betón C25/30', 'm³', colM3, 215, 'O',
    `≈ ${nTie} stĺpikov + ${nCol} stĺpov na podlažie`)
  add('Debnenie stĺpikov a stĺpov', 'm²', F * clear * (nTie * 0.5 + nCol * 1.52), 31, 'O')
  add('ŽB atiky a deliace steny strešných terás hr. 15 cm', 'm³', parapetM3, 230, 'O',
    `≈ ${f1(g.parapetLen)} m × 1,05 m × 0,15 m`)
  add('Debnenie atík a stien terás obojstranné', 'm²', g.parapetLen * 1.05 * 2, 33, 'O')
  add('Výstuž zvislých ŽB prvkov B500B', 't', (colM3 * 150 + parapetM3 * 90) / 1000, 1520, 'O')

  // ───────────── 04 Vodorovné konštrukcie ─────────────
  section('04', 'Vodorovné konštrukcie a schodisko', 'building', 'shell')
  const slabsM3 = slabArea * g.slabThickness * F
  const headM3 = (g.staircaseArea + 4) * g.slabThickness
  const beamsM3 = (g.extPerimeter + g.bearingWallLen) * 0.0625 * F
  const stairsM3 = F * 3.1
  add(`Stropné ŽB dosky hr. ${Math.round(g.slabThickness * 100)} cm, betón C25/30`, 'm³', slabsM3, 182, 'V',
    `(${f1(g.grossFootprint)} − ${f1(stairHole)}) m² × ${f2(g.slabThickness)} m × ${F} stropy`)
  add('Stropná doska nadstavby schodiska', 'm³', headM3, 182, 'O')
  add('Debnenie stropov vr. podopretia', 'm²', slabArea * F + g.staircaseArea + 4, 27, 'V')
  add('Vence, prievlaky a preklady pod doskou, betón C25/30', 'm³', beamsM3, 205, 'O',
    'prierez pod doskou uvažovaný 25/25 cm')
  add('Debnenie vencov, prievlakov a prekladov', 'm²', (g.extPerimeter + g.bearingWallLen) * 0.55 * F, 31, 'O')
  add('Dvojramenné ŽB schodisko, doska hr. 15 cm', 'm³', stairsM3, 260, 'O', `${F} výšky podlažia vrátane výstupu na strechu`)
  add('Debnenie schodiska', 'm²', F * 16, 58, 'O')
  add('Výstuž stropov, vencov a schodiska B500B', 't',
    ((slabsM3 + headM3) * 95 + beamsM3 * 140 + stairsM3 * 110) / 1000, 1480, 'O', 'smerné stupne vystuženia 95–140 kg/m³')
  add('Prerušenie tepelných mostov konzol terás (izolačné nosníky)', 'm', apartments * 4.5, 95, 'O')

  // ───────────── 05 Strecha a hydroizolácie ─────────────
  section('05', 'Strecha, terasy a hydroizolácie', 'building', 'roof')
  add('Spádový betón strechy hr. 6–13 cm', 'm²', g.grossFootprint, 21, 'V')
  add('Parozábrana plochej strechy', 'm²', g.roofInsulatedArea, 8.5, 'P',
    `strecha nad vykurovaným priestorom ${f2(g.roofInsulatedArea)} m²`)
  add('Tepelná izolácia strechy XPS hr. 12 cm', 'm²', g.roofInsulatedArea, 27, 'P')
  add('Hydroizolácia strechy – fólia TPO/FPO vr. geotextílií a vytiahnutia na atiky', 'm²',
    g.grossFootprint + g.parapetLen * 0.4, 36, 'V')
  add('Dlažba strešných terás na terčoch / mrazuvzdorná keramika', 'm²', g.roofTerraceArea, 72, 'P',
    'plochy strešných terás podľa výkresov; skladbu overiť (v tepelnej technike je časť strechy so štrkom)')
  add('Vegetačná strecha – drenáž, substrát, extenzívna zeleň', 'm²', g.greenRoofArea, 62, 'P',
    'plocha podľa tepelnej techniky; polohu overiť v architektonickom projekte')
  add('Hydroizolácia a spádová vrstva krytých terás a lodžií', 'm²', g.coveredTerraceArea, 34, 'V')
  add('Oplechovanie atík a parapetov', 'm', g.parapetLen, 39, 'O')
  add('Strešné vpusty a bezpečnostné prepady', 'ks', Math.max(4, Math.round(g.grossFootprint / 35)), 190, 'O')
  add('Dažďové zvody', 'm', 6 * F * g.floorHeight, 34, 'O')
  add('Pergoly na strešných terasách', 'm²', g.pergolaArea, 290, 'P', 'plochy pergol podľa výkresov')

  // ───────────── 06 Výplne otvorov ─────────────
  section('06', 'Výplne otvorov', 'building', 'windows')
  let typedArea = 0
  let shadeArea = 0
  let sillLen = 0
  for (const w of g.windowTypes) {
    const a = (w.w / 100) * (w.h / 100)
    typedArea += a * w.count
    shadeArea += a * w.count
    sillLen += (w.w / 100) * w.count
    add(`${w.name} ${w.w}×${w.h} cm, PVC, izolačné dvojsklo (Uw ≤ 1,4 W/m²K)`, 'ks', w.count,
      Math.round((a * (w.kind === 'sliding' ? 495 : 390)) / 10) * 10, 'P', `${f2(a)} m²/ks, spolu ${f2(a * w.count)} m²`)
  }
  const restArea = Math.max(0, g.windowArea - typedArea)
  add('Ostatné okná a presklenia (kúpeľne, schodisko, bočné fasády)', 'm²', restArea, 390, 'V',
    `otvory spolu ${f2(g.windowArea)} m² − typové prvky ${f2(typedArea)} m²`)
  add('Vonkajšie a vnútorné parapety', 'm', sillLen + restArea / 1.4, 42, 'V')
  add('Vstupné bezpečnostné protipožiarne dvere do bytov', 'ks', apartments, 980, 'P')
  add('Vchodové dvere do domu – hliníkové, presklené', 'ks', 1, 3400, 'O')
  add('Dvere / výlezy na strešné terasy', 'ks', 3, 1250, 'O')
  add('Tienenie – vonkajšie rolety alebo žalúzie (v projekte nešpecifikované)', 'm²', shadeArea, 165, 'O',
    'bežný štandard na pobreží; možno vypustiť alebo ponúknuť ako nadštandard')

  // ───────────── 07 Priečky a omietky ─────────────
  section('07', 'Priečky a omietky', 'building', 'plaster')
  const partitions = g.partitionLen * clear * F * 0.9
  const plasterWalls = g.facadeWallArea * 0.95 + intBearing * 2 + partitions * 2 + roofHead
  const ceilings = g.netArea + g.coveredTerraceArea
  add('Priečky murované hr. 11,5 cm', 'm²', partitions, 39, 'O',
    `≈ ${f1(g.partitionLen)} m na podlažie × ${f2(clear)} m × ${F} podl. − otvory`)
  add('Vnútorné vápenno-cementové omietky stien', 'm²', plasterWalls, 16, 'V')
  add('Stierka a omietka stropov', 'm²', ceilings, 12, 'V', `úžitková plocha ${f2(g.netArea)} m² + podhľady terás`)
  add('Sadrokartónové podhľady a opláštenia (kúpeľne, inštalačné kastlíky)', 'm²',
    (g.bathrooms * 5.2 + g.wcs * 2.5) * 1.1, 38, 'O')

  // ───────────── 08 Podlahy ─────────────
  section('08', 'Podlahy – izolácie a potery', 'building', 'plaster')
  add('Tepelná izolácia podlahy na teréne XPS 6 cm + EPS 2 cm, PE fólia', 'm²', g.netArea / F, 19, 'P',
    'skladba podlahy na teréne podľa tepelnej techniky')
  add('Kročajová izolácia na poschodiach EPS-T 3 cm', 'm²', (g.netArea * (F - 1)) / F, 9, 'O')
  add('Cementový poter hr. 5–6 cm, strojne hladený', 'm²', g.netArea, 16, 'P', `úžitková plocha ${f2(g.netArea)} m²`)
  add('Hydroizolačná stierka v kúpeľniach a WC', 'm²', g.bathrooms * 9 + g.wcs * 4, 19, 'O')

  // ───────────── 09 Fasáda ─────────────
  section('09', 'Fasáda a zateplenie', 'building', 'facade')
  add('Kontaktný zatepľovací systém – minerálna vlna hr. 10 cm, akrylátová omietka', 'm²',
    g.facadeWallArea * 1.08, 82, 'P', `${f2(g.facadeWallArea)} m² + 8 % ostenia`)
  add('Fasádne lešenie – montáž, prenájom, demontáž', 'm²', (g.facadeWallArea + g.windowArea) * 1.15, 12, 'V')
  add('Omietka a náter podhľadov terás a vnútorných strán atík', 'm²',
    g.coveredTerraceArea + g.parapetLen * 1.05, 30, 'O')
  add('Soklová omietka', 'm²', g.extPerimeter * 0.5, 34, 'O')

  // ───────────── 10 Obklady a dlažby ─────────────
  section('10', 'Obklady a dlažby', 'building', 'finishes')
  add('Dlažba gres v bytoch a na schodisku vr. soklov', 'm²', g.netArea, 60, 'P',
    'vo výkresoch sú všetky miestnosti s keramickou dlažbou')
  add('Keramický obklad kúpeľní, WC a kuchynských zásten', 'm²', g.wallTileArea, 64, 'O')
  add('Dlažba krytých terás a lodžií, mrazuvzdorná', 'm²', g.coveredTerraceArea, 66, 'P')
  add('Obklad schodiskových stupňov', 'm', F * g.stairSteps * 1.2, 68, 'V', `${g.stairSteps} stupňov na podlažie × 1,2 m`)

  // ───────────── 11 Maľby, dvere, zámočnícke práce ─────────────
  section('11', 'Maľby, dvere a zámočnícke práce', 'building', 'finishes')
  add('Maľba stien a stropov 2× vr. penetrácie', 'm²', Math.max(0, plasterWalls - g.wallTileArea) + ceilings, 7.5, 'V')
  add('Interiérové dvere vr. zárubne a kovania', 'ks', g.interiorDoors, 395, 'V')
  add('Zábradlie schodiska s madlom', 'm', F * 7.5, 165, 'O')
  add('Zábradlia terás a lodžií – sklo / nerez', 'm', g.railingLen, 310, 'O', 'typ zábradlia overiť v architektonickom projekte')
  add('Poštové schránky, orientačné a bezpečnostné značenie', 'kpl', 1, 650, 'O')

  // ───────────── 12 Zdravotechnika ─────────────
  section('12', 'Zdravotechnika', 'building', 'mep')
  add('Vnútorný vodovod a kanalizácia – veľký byt (kúpeľňa, WC, kuchyňa)', 'ks', g.apartmentsLarge, 5200, 'O')
  add('Vnútorný vodovod a kanalizácia – malý byt (kúpeľňa, kuchyňa)', 'ks', g.apartmentsSmall, 3900, 'O')
  add('Stúpačky, ležaté rozvody, splašková a dažďová kanalizácia domu', 'kpl', 1, 11500, 'O',
    'projekt vodovodu a kanalizácie sa nepodarilo načítať – spresniť')
  add('Zariaďovacie predmety – kúpeľňa (sprcha, umývadlo, WC, batérie)', 'ks', g.bathrooms, 2650, 'P')
  add('Zariaďovacie predmety – samostatné WC', 'ks', g.wcs, 820, 'P')
  add('Elektrický zásobníkový ohrievač vody 80–100 l', 'ks', apartments, 440, 'P',
    'príprava teplej vody elektrickým zásobníkom podľa tepelnej techniky')
  add('Bytové vodomery a uzávery', 'ks', apartments + 1, 165, 'V')

  // ───────────── 13 Elektroinštalácie ─────────────
  section('13', 'Elektroinštalácie', 'building', 'mep')
  add('Bytová elektroinštalácia vr. rozvádzača – veľký byt', 'ks', g.apartmentsLarge, 5400, 'P')
  add('Bytová elektroinštalácia vr. rozvádzača – malý byt', 'ks', g.apartmentsSmall, 4200, 'P')
  add('Hlavný rozvod, prípojková a meracia skriňa, rozvádzač spoločnej spotreby', 'kpl', 1, 8600, 'P',
    `${apartments + 1} odberných miest`)
  add('Bleskozvod, uzemnenie a ochranné pospájanie', 'kpl', 1, 5200, 'P')
  add('Domový telefón / videovrátnik', 'kpl', 1, 3600, 'P', `${apartments} účastníkov`)
  add('Slaboprúdové rozvody – dátové a TV rozvody, bytové rozvádzače', 'kpl', 1, 4400, 'P')
  add('Odvod dymu a tepla zo schodiska, núdzové osvetlenie', 'kpl', 1, 4300, 'P')
  add('Osvetlenie spoločných priestorov a terás', 'kpl', 1, 3900, 'O')
  add('Príprava pre nabíjanie elektromobilov (rezervné vývody na parkovisko)', 'ks', apartments, 240, 'P')

  // ───────────── 14 Klimatizácia, kúrenie, vetranie ─────────────
  section('14', 'Klimatizácia, kúrenie a vetranie', 'building', 'mep')
  add('Multi-split klimatizácia (tepelné čerpadlo vzduch–vzduch) – vonkajšia + 3 vnútorné jednotky', 'ks',
    g.acLarge, 5900, 'P', 'vr. chladivového potrubia, odvodu kondenzátu a montáže')
  add('Multi-split klimatizácia – vonkajšia + 2 vnútorné jednotky', 'ks', g.acSmall, 4100, 'P')
  add('Elektrické podlahové vykurovanie kúpeľní 150 W/m² vr. termostatov', 'm²', g.floorHeatingArea, 115, 'V')
  add('Odťahové ventilátory a vývody pre digestory', 'ks', g.fans + apartments, 185, 'O')
  add('Základy a konzoly vonkajších jednotiek', 'kpl', 1, 1900, 'P')

  // ───────────── 15 Bazén ─────────────
  if (g.pool) {
    const p = g.pool
    section('15', 'Bazén', 'building', 'pool')
    const shellH = p.depth + 0.3
    const shellM3 = p.outerL * p.outerW * 0.2 + 2 * (p.outerL + p.outerW - 0.4) * shellH * 0.2
    const plantM3 = 5.5
    add('Výkop bazéna a strojovne vr. odvozu', 'm³', (p.outerL + 1.2) * (p.outerW + 1.2) * (shellH + 0.4) + 12, 42, 'V')
    add('Štrkový podsyp a podkladový betón', 'm²', (p.outerL + 0.6) * (p.outerW + 0.6), 26, 'V')
    add('ŽB škrupina bazéna – dno a steny hr. 20 cm, vodostavebný betón C30/37', 'm³', shellM3, 265, 'V',
      `vonkajší rozmer ${f1(p.outerL)} × ${f1(p.outerW)} m, hĺbka vody ${f1(p.depth)} m`)
    add('ŽB podzemná strojovňa bazéna', 'm³', plantM3, 265, 'O')
    add('Debnenie stien bazéna a strojovne', 'm²', 4 * (p.outerL + p.outerW) * shellH + 40, 36, 'V')
    add('Výstuž bazéna – siete Q335 obojstranne, tyče B500B', 't', ((shellM3 + plantM3) * 125) / 1000, 1520, 'V')
    add('Hydroizolácia a povrchová úprava bazéna (mozaika / keramika)', 'm²',
      p.innerL * p.innerW + 2 * (p.innerL + p.innerW) * p.depth, 135, 'V',
      `vodná plocha ${f2(p.innerL * p.innerW)} m² + steny`)
    add('Lemovacie platne – koruna bazéna', 'm', 2 * (p.innerL + p.innerW), 92, 'V')
    add('Bazénová technológia – čerpadlo, pieskový filter, soľná elektrolýza, dávkovanie pH, skimmery, trysky, osvetlenie', 'kpl',
      1, 15800, 'P')
    add('Spevnená plocha okolo bazéna', 'm²', p.deckArea, 78, 'O')
    add('Vonkajšia sprcha, schodíky a príslušenstvo', 'kpl', 1, 1650, 'P')
    add('Vsakovacia studňa pre prepad bazéna a kondenzát', 'ks', 1, 1400, 'P')
  }

  // ───────────── Areál ─────────────
  const nB = site.buildings
  section('20', 'Zariadenie staveniska', 'site', null)
  add('Zariadenie staveniska – oplotenie, bunky, žeriav, čerpadlá, stráženie', 'kpl', nB, 18000, 'O', 'uvažované na 1 dom')
  add('Odvoz a likvidácia stavebného odpadu', 'kpl', nB, 4500, 'O')
  add('Dočasné prípojky staveniska (elektrina, voda)', 'kpl', 1, 4500, 'O')

  section('21', 'Oporné múry a oplotenie', 'site', 'site')
  const wallM3 = site.retainingLen * 0.42
  add('Oporné a ohradové ŽB múry tvaru L, betón C30/37', 'm³', wallM3, 285, 'O',
    `≈ ${f1(site.retainingLen)} m × 0,42 m³/m; dĺžky a výšky podľa situácie`)
  add('Debnenie múrov obojstranné', 'm²', site.retainingLen * 2 * 1.1, 34, 'O')
  add('Výstuž múrov – siete Q385 / Q257', 't', (wallM3 * 85) / 1000, 1520, 'O')
  add('Oplotenie – výplne na múriku', 'm', site.fenceLen, 78, 'O')
  add('Vjazdové posuvné brány s pohonom', 'ks', nB, 4200, 'O')
  add('Vstupné bránky', 'ks', nB, 950, 'O')

  section('22', 'Spevnené plochy a komunikácie', 'site', 'site')
  add('Parkovacie státia a vjazdy – dlažba vr. podkladových vrstiev', 'm²', site.parkingSpaces * 12.5 * 1.45, 68, 'O',
    `${site.parkingSpaces} státí × 12,5 m² + 45 % manipulačné plochy`)
  add('Chodníky a spevnené plochy pri domoch', 'm²', nB * 45, 62, 'O')
  add('Obrubníky', 'm', site.parkingSpaces * 6, 28, 'O')
  add('Úprava prístupovej komunikácie', 'm²', site.roadArea, 55, 'O', 'rozsah a povrch overiť podľa situácie')
  add('Odvodnenie spevnených plôch – žľaby, vsakovanie', 'kpl', nB, 3200, 'O')

  section('23', 'Prípojky a areálové siete', 'site', 'site')
  add('Vodovodná prípojka vr. vodomernej šachty', 'ks', nB, 3400, 'O')
  add('Kanalizačná prípojka / čistenie odpadových vôd', 'ks', nB, 4800, 'O',
    'spôsob odkanalizovania overiť v projekte vodovodu a kanalizácie')
  add('Elektrická prípojka – výkopy, chráničky, uloženie kábla', 'ks', nB, 2600, 'O')
  add('Telekomunikačná prípojka – káblová šachta, chráničky', 'ks', nB, 1500, 'P')
  add('Vonkajšie osvetlenie areálu', 'ks', nB * 6, 420, 'O')

  section('24', 'Sadové úpravy a vybavenie areálu', 'site', 'site')
  add('Terénne úpravy, ornica a trávnik', 'm²', site.greenArea, 14, 'O')
  add('Výsadba – stredomorské dreviny a živé ploty', 'kpl', nB, 4500, 'O')
  add('Automatická závlaha', 'm²', site.greenArea, 9, 'O')
  add('Stojisko na odpad, stojany na bicykle, mobiliár', 'kpl', nB, 2800, 'O')

  return { sections, items }
}
