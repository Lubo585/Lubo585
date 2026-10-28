import type { Lang } from './lang'

/** Locale pre Intl – arabčina s latinskými číslicami (ceny, hmotnosti). */
const locales: Record<Lang, string> = { sk: 'sk-SK', en: 'en-IE', ar: 'ar-AE-u-nu-latn' }

export function formatPrice(value: number, lang: Lang, currency = 'EUR') {
  return new Intl.NumberFormat(locales[lang], { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export function formatDate(iso: string, lang: Lang) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locales[lang], { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export function formatNumber(value: number, lang: Lang) {
  return new Intl.NumberFormat(locales[lang]).format(value)
}

export function formatWeight(grams: number, lang: Lang) {
  return `${formatNumber(grams, lang)} g`
}

export function youtubeId(src: string): string | null {
  const m = src.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,})/)
  if (m) return m[1]
  if (/^[A-Za-z0-9_-]{6,}$/.test(src)) return src
  return null
}
