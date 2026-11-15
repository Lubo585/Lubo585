// Obrázky projektu: odkiaľ sa načítajú a ako sa nahrávajú do úložiska stránky.

import { PRIVATE_MEDIA } from '../data/seed'
import type { MediaItem, MediaKind } from '../types'
import { capability, errorCode, hosted } from './platform'

export const MEDIA_KIND: Record<MediaKind, string> = {
  visual: 'Vizualizácie',
  photo: 'Fotografie',
  elevation: 'Pohľady',
  plan: 'Pôdorysy',
  section: 'Rezy',
  site: 'Situácia',
  tech: 'Technika',
  detail: 'Detaily',
  other: 'Ostatné',
}

export const MEDIA_KIND_ORDER: MediaKind[] = ['visual', 'photo', 'elevation', 'plan', 'section', 'site', 'tech', 'detail', 'other']

/** Adresa obrázka pre toto zobrazenie, alebo null, ak ho tu nie je odkiaľ načítať. */
export function mediaSrc(m: MediaItem): string | null {
  if (m.assetId && hosted) return `/_blob/${m.assetId}`
  if (m.file && PRIVATE_MEDIA[m.file]) return PRIVATE_MEDIA[m.file]
  return m.src
}

/** Titulný obrázok: označený, inak vizualizácia či fotka, inak čiarová kresba, inak prvý dostupný. */
export function coverOf(media: MediaItem[]): MediaItem | null {
  const shown = media.filter((m) => mediaSrc(m))
  return (
    shown.find((m) => m.cover) ??
    shown.find((m) => m.kind === 'visual' || m.kind === 'photo') ??
    shown.find((m) => m.line) ??
    shown[0] ??
    null
  )
}

// ───────────────────────── Nahrávanie ─────────────────────────

interface HostAssets {
  upload(blob: Blob, options?: { type?: string }): Promise<{ id: string; url: string; sizeBytes: number; contentType: string }>
  delete(ref: string): Promise<{ deleted: boolean }>
}

/** Úložisko súborov hostiteľa; null, ak tento používateľ nahrávať nesmie alebo aplikácia beží samostatne. */
export function hostAssets(): Promise<HostAssets | null> {
  return capability<HostAssets>('assets')
}

const MAX_SIDE = 2400
const KEEP_BYTES = 3_500_000

function decode(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.src = url
  })
}

/** Pripraví obrázok na nahratie: veľké fotky zmenší, aby sa rýchlo načítali a nezabrali úložisko. */
export async function prepareImage(file: File): Promise<{ blob: Blob; type: string; w: number; h: number }> {
  const img = await decode(file)
  const w = img.naturalWidth || 1600
  const h = img.naturalHeight || 1000
  const passthrough = file.type === 'image/svg+xml' || file.type === 'image/gif'
  if (passthrough || (Math.max(w, h) <= MAX_SIDE && file.size <= KEEP_BYTES)) return { blob: file, type: file.type, w, h }

  const k = Math.min(1, MAX_SIDE / Math.max(w, h))
  const cw = Math.round(w * k)
  const ch = Math.round(h * k)
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) return { blob: file, type: file.type, w, h }
  // Priehľadné PNG ostáva PNG, všetko ostatné sa uloží ako JPEG na bielom podklade.
  const keepAlpha = file.type === 'image/png' && file.size <= 12_000_000
  if (!keepAlpha) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cw, ch)
  }
  ctx.drawImage(img, 0, 0, cw, ch)
  const type = keepAlpha ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.88))
  return blob ? { blob, type, w: cw, h: ch } : { blob: file, type: file.type, w, h }
}

/** Zrozumiteľné vysvetlenie chyby nahrávania podľa stabilného kódu hostiteľa. */
export function uploadErrorText(e: unknown): string {
  switch (errorCode(e)) {
    case 'too_large':
      return 'Súbor je príliš veľký (najviac 20 MB). Zmenšite ho a skúste znova.'
    case 'unsupported_type':
      return 'Tento typ súboru sa nedá nahrať. Použite JPG, PNG, WebP, GIF alebo SVG.'
    case 'quota_or_state':
      return 'Úložisko stránky je plné alebo dočasne neprijíma súbory. Odstráňte nepotrebné obrázky a skúste znova.'
    case 'rate_limited':
      return 'Nahráva sa príliš rýchlo za sebou. Chvíľu počkajte a skúste znova.'
    case 'not_granted':
    case 'capability_disabled':
    case 'capability_removed':
      return 'V tomto zobrazení nemáte oprávnenie nahrávať súbory.'
    case 'upstream_auth':
      return 'Prihlásenie vypršalo. Obnovte stránku a skúste znova.'
    default:
      return 'Obrázok sa nepodarilo nahrať. Skúste to znova.'
  }
}
