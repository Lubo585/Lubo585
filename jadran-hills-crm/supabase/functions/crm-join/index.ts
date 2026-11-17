// Vytvorenie prístupu do CRM pomocou jednorazového kódu.
//
// Účet nevzniká verejnou registráciou: kto chce prístup, musí mať kód – buď kód
// prvého vlastníka, alebo pozvánku, ktorú vlastník vystavil na jeho e-mail. Funkcia
// kód overí, založí účet (alebo mu nastaví nové heslo) a zapíše členstvo.
// Beží so servisným kľúčom, ktorý nikdy neopúšťa server.

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function serviceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, unknown>
    if (typeof keys.default === 'string' && keys.default) return keys.default
  } catch {
    // staršie projekty majú len pôvodný kľúč
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return reply(405, { error: 'method' })

  let input: Record<string, unknown>
  try {
    input = (await req.json()) as Record<string, unknown>
  } catch {
    return reply(400, { error: 'bad_request' })
  }
  const email = String(input?.email ?? '').trim().toLowerCase()
  const password = String(input?.password ?? '')
  const name = String(input?.name ?? '').trim().slice(0, 120)
  const code = String(input?.code ?? '').replace(/\s+/g, '').toUpperCase()

  if (!EMAIL.test(email) || email.length > 254) return reply(400, { error: 'bad_email' })
  if (password.length < 10 || password.length > 72) return reply(400, { error: 'weak_password' })
  if (code.length < 12 || code.length > 64) return reply(403, { error: 'bad_code' })

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = serviceKey()
  if (!url || !key) return reply(500, { error: 'server' })
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const allowed = await admin.rpc('crm_join_attempt')
  if (allowed.error) return reply(500, { error: 'server' })
  if (allowed.data !== true) return reply(429, { error: 'rate_limited' })

  const hash = await sha256Hex(code)
  const check = await admin.rpc('crm_join_check', { p_email: email, p_hash: hash })
  if (check.error) return reply(500, { error: 'server' })
  if (!check.data) return reply(403, { error: 'bad_code' })

  const found = await admin.rpc('crm_user_id', { p_email: email })
  if (found.error) return reply(500, { error: 'server' })
  let userId = (found.data as string | null) ?? null

  if (userId) {
    // Účet s týmto e-mailom už existuje: platný kód mu nastaví nové heslo.
    const updated = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      ban_duration: 'none',
      ...(name ? { user_metadata: { name } } : {}),
    })
    if (updated.error) return reply(updated.error.code === 'weak_password' ? 400 : 500, { error: updated.error.code === 'weak_password' ? 'weak_password' : 'server' })
  } else {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })
    if (created.error || !created.data.user) {
      const weak = created.error?.code === 'weak_password'
      return reply(weak ? 400 : 500, { error: weak ? 'weak_password' : 'server' })
    }
    userId = created.data.user.id
  }

  const commit = await admin.rpc('crm_join_commit', { p_user: userId, p_email: email, p_hash: hash, p_name: name })
  if (commit.error) return reply(commit.error.message.includes('last_owner') ? 409 : 500, { error: commit.error.message.includes('last_owner') ? 'last_owner' : 'server' })
  if (!commit.data) return reply(403, { error: 'bad_code' })
  return reply(200, { ok: true, role: commit.data })
})
