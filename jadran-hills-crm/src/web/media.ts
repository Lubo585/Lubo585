// Obrázky projektu v súkromnom úložisku Supabase.
//
// Súbory nie sú verejné: adresu na čítanie vydáva úložisko prihlásenému členovi a
// platí obmedzený čas. Adresy sa preto zisťujú za behu, držia sa v pamäti a
// v prehliadači (aby sa obrázky pri ďalšej návšteve nesťahovali znova) a pred
// vypršaním sa obnovujú.

import type { SupabaseClient } from '@supabase/supabase-js'
import { mediaChanged, type AssetStore, type MediaBackend } from '../lib/media'
import { coded } from './supabase'

const BUCKET = 'crm-media'
const TTL_S = 7 * 24 * 3600
/** Adresa, ktorej ostáva menej, sa už nepoužije. */
const MIN_LEFT_MS = 3600_000
/** Adresa, ktorej ostáva menej, sa na pozadí obnoví. */
const RENEW_MS = 2 * 24 * 3600_000
const CACHE_KEY = 'jhcrm:media-urls:v1'
const RETRY_MS = 60_000

interface Entry {
  url: string
  exp: number
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

export class MediaStore implements MediaBackend {
  private readonly client: SupabaseClient
  private readonly canWrite: () => boolean
  private readonly urls = new Map<string, Entry>()
  private readonly failed = new Map<string, number>()
  private readonly queue = new Set<string>()
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(client: SupabaseClient, canWrite: () => boolean) {
    this.client = client
    this.canWrite = canWrite
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, Entry>
      for (const [path, e] of Object.entries(saved)) {
        if (typeof e?.url === 'string' && e.exp - Date.now() > MIN_LEFT_MS) this.urls.set(path, e)
      }
    } catch {
      // bez uložených adries sa vypýtajú nové
    }
  }

  url(path: string): string | null {
    const e = this.urls.get(path)
    const left = e ? e.exp - Date.now() : 0
    if (e && left > MIN_LEFT_MS) {
      if (left < RENEW_MS) this.request(path)
      return e.url
    }
    this.request(path)
    return null
  }

  private request(path: string): void {
    if ((this.failed.get(path) ?? 0) > Date.now()) return
    this.queue.add(path)
    this.timer ??= setTimeout(() => {
      this.timer = null
      const paths = [...this.queue]
      this.queue.clear()
      void this.sign(paths)
    }, 40)
  }

  /** Vypýta adresy pre dané súbory; hotové hneď ohlási obrazovkám. */
  async sign(paths: string[]): Promise<void> {
    if (paths.length === 0) return
    const { data, error } = await this.client.storage.from(BUCKET).createSignedUrls(paths, TTL_S)
    const until = Date.now() + RETRY_MS
    if (error || !data) {
      for (const p of paths) this.failed.set(p, until)
      return
    }
    const exp = Date.now() + TTL_S * 1000
    data.forEach((d, i) => {
      // Odpovede prichádzajú v poradí požiadavky; pri chybe úložisko cestu nemusí vrátiť.
      const path = d.path ?? paths[i]
      if (d.signedUrl && !d.error) {
        this.urls.set(path, { url: d.signedUrl, exp })
        this.failed.delete(path)
      } else this.failed.set(path, until)
    })
    this.persist()
    mediaChanged()
  }

  /** Pripraví adresy vopred, aby sa prvá obrazovka nevykreslila bez obrázkov. */
  async prime(paths: string[]): Promise<void> {
    const need = paths.filter((p) => {
      const e = this.urls.get(p)
      return !e || e.exp - Date.now() < RENEW_MS
    })
    await this.sign(need)
  }

  private persist(): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(this.urls)))
    } catch {
      // adresy vydržia do zatvorenia stránky
    }
  }

  async store(): Promise<AssetStore | null> {
    if (!this.canWrite()) return null
    return {
      upload: async (blob, options) => {
        const type = options?.type || blob.type
        const ext = EXT[type]
        if (!ext) throw coded({ message: 'mime type not supported', status: 415 })
        const path = `u/${crypto.randomUUID()}.${ext}`
        const { error } = await this.client.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false })
        if (error) throw coded(error as { message?: string; statusCode?: string })
        await this.sign([path])
        return { id: path }
      },
      delete: async (path) => {
        const { error } = await this.client.storage.from(BUCKET).remove([path])
        if (error) throw coded(error as { message?: string; statusCode?: string })
        this.urls.delete(path)
        this.persist()
      },
    }
  }
}

/** Po odhlásení v prehliadači nesmú ostať adresy súkromných obrázkov. */
export function forgetMediaUrls(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // nič na odstránenie
  }
}
