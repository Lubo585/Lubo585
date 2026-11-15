// Formátovanie čísel, mien a dátumov pre slovenské prostredie.

const nf0 = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 0 })
const nfCache = new Map<number, Intl.NumberFormat>()

function nf(decimals: number): Intl.NumberFormat {
  let f = nfCache.get(decimals)
  if (!f) {
    f = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    nfCache.set(decimals, f)
  }
  return f
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0)

/** Hodnota, ktorá sa po zaokrúhlení zobrazí ako nula, nesmie niesť znamienko (žiadne „-0 €“). */
function clean(n: number, decimals: number): number {
  const v = safe(n)
  return Math.round(v * 10 ** decimals) === 0 ? 0 : v
}

/** 1 234 567 € */
export function eur(n: number, decimals = 0): string {
  const v = clean(n, decimals)
  return `${decimals === 0 ? nf0.format(v) : nf(decimals).format(v)} €`
}

/** Skrátený zápis: 1,23 mil. € / 123 tis. € */
export function eurShort(n: number): string {
  const v = safe(n)
  const a = Math.abs(v)
  if (a >= 1_000_000) return `${nf(2).format(v / 1_000_000)} mil. €`
  if (a >= 10_000) return `${nf0.format(v / 1000)} tis. €`
  return eur(v)
}

/** Popisky osí: 0 / 500 tis. / 1,5 mil. */
export function axisShort(n: number): string {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${nf(a % 1_000_000 === 0 ? 0 : 1).format(n / 1_000_000)} mil.`
  if (a >= 1000) return `${nf0.format(n / 1000)} tis.`
  return nf0.format(n)
}

export function num(n: number, decimals = 2): string {
  return nf(decimals).format(clean(n, decimals))
}

export function pct(n: number, decimals = 1): string {
  return `${nf(decimals).format(clean(n, decimals))} %`
}

/** Prevedie text z formulára na číslo (akceptuje medzery aj desatinnú čiarku). */
export function parseNum(raw: string): number {
  const cleaned = raw.replace(/[\s  ]/g, '').replace(',', '.')
  const v = Number.parseFloat(cleaned)
  return Number.isFinite(v) ? v : 0
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec']

/** Posunie mesiac YYYY-MM o `offset` mesiacov. */
export function addMonths(startMonth: string, offset: number): { y: number; m: number } {
  const [y, m] = startMonth.split('-').map(Number)
  const total = (y || 2026) * 12 + ((m || 1) - 1) + Math.round(offset)
  return { y: Math.floor(total / 12), m: (total % 12) + 1 }
}

/** „mar 2027“ */
export function monthLabel(startMonth: string, offset: number): string {
  const { y, m } = addMonths(startMonth, offset)
  return `${MONTHS[m - 1]} ${y}`
}

/** „03/27“ – úzky popisok do grafov a tabuliek. */
export function monthShort(startMonth: string, offset: number): string {
  const { y, m } = addMonths(startMonth, offset)
  return `${String(m).padStart(2, '0')}/${String(y).slice(2)}`
}

/** Počet mesiacov medzi začiatkom modelu a dátumom (môže byť záporný). */
export function monthIndex(startMonth: string, isoDate: string): number {
  const [sy, sm] = startMonth.split('-').map(Number)
  const [y, m] = isoDate.split('-').map(Number)
  if (!sy || !sm || !y || !m) return 0
  return (y - sy) * 12 + (m - sm)
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 15. 11. 2026 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d}. ${m}. ${y}`
}

/** Počet dní od dneška do dátumu (záporné = po termíne). */
export function daysUntil(iso: string | null | undefined, today = todayIso()): number | null {
  if (!iso) return null
  const a = Date.parse(`${today}T00:00:00Z`)
  const b = Date.parse(`${iso}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86_400_000)
}

/** Pripočíta k dátumu roky (pre lehoty). */
export function addYears(iso: string, years: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y + years}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

let seq = 0
/** Krátke jednoznačné ID pre nové záznamy. */
export function uid(prefix = 'x'): string {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}
