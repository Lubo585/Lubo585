// Spojenie s projektom Supabase: prihlásenie, databáza, obrázky.
//
// Kľúč v kóde je verejný („publishable“) – identifikuje projekt, nič neodomyká.
// K dátam pustia až pravidlá databázy, a to len prihláseného člena projektu.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DocHead, DocRow, DocsApi } from './docs'

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? ''

export const configured = SUPABASE_URL !== '' && SUPABASE_KEY !== ''

export const supabase: SupabaseClient = createClient(configured ? SUPABASE_URL : 'https://invalid.localhost', configured ? SUPABASE_KEY : 'none', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'jhcrm:session' },
})

interface ApiError {
  message?: string
  code?: string
  status?: number
  statusCode?: string | number
}

/** Chyba so stabilným kódom, akému rozumie zvyšok aplikácie. */
export function coded(error: ApiError | null | undefined, fallback = 'unavailable'): Error & { code: string } {
  const status = Number(error?.status ?? error?.statusCode ?? 0)
  const message = error?.message ?? ''
  let code = fallback
  if (error?.code === '42501' || status === 403 || /row-level security|permission denied/i.test(message)) code = 'not_granted'
  else if (status === 401 || error?.code === 'PGRST301' || /jwt/i.test(message)) code = 'upstream_auth'
  else if (status === 413 || /exceeded the maximum allowed size|too large/i.test(message)) code = 'too_large'
  else if (status === 415 || /mime type/i.test(message)) code = 'unsupported_type'
  else if (status === 429) code = 'rate_limited'
  return Object.assign(new Error(message || code), { code })
}

/** Časti projektu v tabuľke `crm_docs`. */
export function supabaseDocs(client: SupabaseClient): DocsApi {
  const table = () => client.from('crm_docs')
  return {
    async list() {
      const { data, error } = await table().select('part, body, updated_at')
      if (error) throw coded(error)
      return (data ?? []) as DocRow[]
    },
    async heads() {
      const { data, error } = await table().select('part, updated_at')
      if (error) throw coded(error)
      return (data ?? []) as DocHead[]
    },
    async get(part) {
      const { data, error } = await table().select('part, body, updated_at').eq('part', part).maybeSingle()
      if (error) throw coded(error)
      return (data as DocRow | null) ?? null
    },
    async put(part, body) {
      const { data, error } = await table().upsert({ part, body }, { onConflict: 'part' }).select('updated_at').single()
      if (error) throw coded(error)
      return (data as { updated_at: string }).updated_at
    },
    subscribe(onChange, onReady) {
      const channel = client
        .channel('crm-docs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_docs' }, (payload) => {
          const part = (payload.new as { part?: string } | null)?.part ?? (payload.old as { part?: string } | null)?.part
          if (part) onChange(part)
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') onReady()
        })
      // Po návrate na kartu alebo obnovení pripojenia sa zmeny dotiahnu hneď.
      const onVisible = () => {
        if (document.visibilityState === 'visible') onReady()
      }
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('online', onReady)
      return () => {
        document.removeEventListener('visibilitychange', onVisible)
        window.removeEventListener('online', onReady)
        void client.removeChannel(channel)
      }
    },
  }
}
