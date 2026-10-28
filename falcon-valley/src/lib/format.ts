import type { Lang } from './lang'

export function formatPrice(value: number, lang: Lang, currency = 'EUR') {
  return new Intl.NumberFormat(lang === 'sk' ? 'sk-SK' : 'en-IE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(iso: string, lang: Lang) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(lang === 'sk' ? 'sk-SK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export function formatWeight(grams: number, lang: Lang) {
  const g = new Intl.NumberFormat(lang === 'sk' ? 'sk-SK' : 'en-GB').format(grams)
  return `${g} g`
}

export function youtubeId(src: string): string | null {
  const m = src.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,})/)
  if (m) return m[1]
  if (/^[A-Za-z0-9_-]{6,}$/.test(src)) return src
  return null
}
