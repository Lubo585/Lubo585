// Prihlasovacie obrazovky: prihlásenie, prvé prihlásenie s prístupovým kódom,
// zabudnuté heslo, nové heslo po obnove a stav „účet nemá prístup“.

import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { CoverArt } from '../ui/CoverArt'
import { formatCode, MIN_PASSWORD, readInvite } from './access'
import { supabase, SUPABASE_KEY, SUPABASE_URL } from './supabase'

/** Tmavé pozadie so žiarou, odkaz späť na stránku projektu a karta v strede. */
export function AuthFrame({ children, siteHref }: { children: ReactNode; siteHref?: string }) {
  return (
    <div className="auth">
      <div className="auth-art" aria-hidden>
        <CoverArt item={null} />
      </div>
      <div className="auth-top gutter">
        {siteHref ? (
          <a className="auth-back" href={siteHref}>
            <ArrowLeft size={15} aria-hidden /> Jadran Hills
          </a>
        ) : (
          <span />
        )}
      </div>
      <main className="auth-main gutter">{children}</main>
    </div>
  )
}

/** Krátke čakanie medzi prihlásením a otvorením projektu. */
export function AuthWait({ text }: { text: string }) {
  return (
    <AuthFrame>
      <div className="auth-wait" role="status">
        <span className="welcome-wait" aria-hidden />
        {text}
      </div>
    </AuthFrame>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  code,
  autoFocus,
  hint,
}: {
  label: string
  value: string
  onChange(v: string): void
  type?: 'text' | 'email'
  autoComplete?: string
  placeholder?: string
  code?: boolean
  autoFocus?: boolean
  hint?: string
}) {
  const id = useId()
  return (
    <div>
      <label className="auth-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className={code ? 'auth-input auth-code' : 'auth-input'}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoCapitalize={type === 'email' || code ? 'none' : undefined}
        spellCheck={false}
        required
      />
      {hint && <p className="auth-note" style={{ marginTop: 6 }}>{hint}</p>}
    </div>
  )
}

function Password({ label, value, onChange, autoComplete, hint }: { label: string; value: string; onChange(v: string): void; autoComplete: string; hint?: string }) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div>
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className="auth-input"
          style={{ paddingRight: 46 }}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <button type="button" className="auth-eye" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Skryť heslo' : 'Zobraziť heslo'} title={shown ? 'Skryť heslo' : 'Zobraziť heslo'}>
          {shown ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {hint && <p className="auth-note" style={{ marginTop: 6 }}>{hint}</p>}
    </div>
  )
}

function Submit({ busy, children, busyText }: { busy: boolean; children: ReactNode; busyText: string }) {
  return (
    <button type="submit" className="welcome-cta auth-submit" disabled={busy}>
      {busy ? busyText : children}
      {!busy && <ArrowRight size={18} aria-hidden />}
    </button>
  )
}

const OFFLINE = 'Nepodarilo sa spojiť so serverom. Skontrolujte pripojenie a skúste to znova.'

interface AuthFailure {
  code?: string
  status?: number
  message?: string
}

function signInError(e: AuthFailure): string {
  if (e.code === 'invalid_credentials') return 'Nesprávny e-mail alebo heslo.'
  if (e.code === 'email_not_confirmed') return 'Účet ešte nie je aktívny. Použite prístupový kód cez „Mám prístupový kód“.'
  if (e.code === 'user_banned') return 'Účet je zablokovaný. Obráťte sa na vlastníka projektu.'
  if (e.status === 429 || e.code === 'over_request_rate_limit') return 'Príliš veľa pokusov. Chvíľu počkajte a skúste to znova.'
  return e.status && e.status >= 400 && e.status < 500 ? 'Prihlásenie sa nepodarilo. Skontrolujte e-mail a heslo.' : OFFLINE
}

const JOIN_ERROR: Record<string, string> = {
  bad_code: 'Kód nie je platný pre tento e-mail, vypršal, alebo už bol použitý.',
  bad_email: 'Skontrolujte e-mailovú adresu.',
  weak_password: `Heslo musí mať aspoň ${MIN_PASSWORD} znakov (najviac 72).`,
  rate_limited: 'Príliš veľa pokusov. Skúste to znova o štvrť hodiny.',
  last_owner: 'Tento účet je jediným vlastníkom projektu; jeho oprávnenie sa pozvánkou znížiť nedá.',
}

type Mode = 'signin' | 'join' | 'forgot'

interface AuthProps {
  siteHref?: string
  /** Volá sa priamo z kliknutia na prihlásenie – odomkne zvuk pre pozdrav. */
  onAttempt(): void
  /** Prihlásenie formulárom sa podarilo. */
  onSignedIn(): void
}

export function AuthScreen({ siteHref, onAttempt, onSignedIn }: AuthProps) {
  const [invite] = useState(readInvite)
  const [mode, setMode] = useState<Mode>(invite ? 'join' : 'signin')
  const [email, setEmail] = useState(invite?.email ?? '')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState(invite?.code ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Kód z odkazu nemá ostať v adresnom riadku ani v histórii prehliadača.
  useEffect(() => {
    if (invite) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [invite])

  const go = (m: Mode) => {
    setMode(m)
    setError('')
    setInfo('')
    setPassword('')
  }

  const signIn = async (): Promise<boolean> => {
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (e) {
      setError(signInError(e))
      return false
    }
    onSignedIn()
    return true
  }

  const onSignIn = async (ev: FormEvent) => {
    ev.preventDefault()
    onAttempt()
    setError('')
    setBusy(true)
    try {
      await signIn()
    } catch {
      setError(OFFLINE)
    } finally {
      setBusy(false)
    }
  }

  const onJoin = async (ev: FormEvent) => {
    ev.preventDefault()
    onAttempt()
    setError('')
    if (password.length < MIN_PASSWORD) {
      setError(JOIN_ERROR.weak_password)
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/crm-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim(), code: formatCode(code) }),
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !body.ok) {
        setError(JOIN_ERROR[body.error ?? ''] ?? 'Prístup sa nepodarilo vytvoriť. Skúste to znova.')
        return
      }
      if (!(await signIn())) go('signin')
    } catch {
      setError(OFFLINE)
    } finally {
      setBusy(false)
    }
  }

  const onForgot = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (e && (e.status === 429 || e.code === 'over_email_send_rate_limit')) setError('E-mail sa teraz nedá odoslať – skúste to o hodinu, alebo požiadajte o nový prístupový kód.')
      else setInfo('Ak je adresa registrovaná, odkaz na nastavenie nového hesla je na ceste. Skontrolujte aj priečinok s nevyžiadanou poštou.')
    } catch {
      setError(OFFLINE)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame siteHref={siteHref}>
      <div className="auth-card">
        <div key={mode} className="auth-pane">
          <p className="auth-eyebrow">Jadran Hills · CRM</p>
          {mode === 'signin' && (
            <>
              <h1 className="auth-title">Prihlásenie</h1>
              <p className="auth-sub">Interný systém projektu. Prístup majú len pozvaní členovia tímu.</p>
              <form className="auth-form" onSubmit={onSignIn}>
                <Input label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="username" autoFocus />
                <Password label="Heslo" value={password} onChange={setPassword} autoComplete="current-password" />
                {error && <p className="auth-error" role="alert">{error}</p>}
                <Submit busy={busy} busyText="Prihlasujem…">Prihlásiť sa</Submit>
              </form>
              <div className="auth-links">
                <button type="button" className="welcome-link" onClick={() => go('join')}>Mám prístupový kód</button>
                <button type="button" className="welcome-link" onClick={() => go('forgot')}>Zabudnuté heslo</button>
              </div>
            </>
          )}
          {mode === 'join' && (
            <>
              <h1 className="auth-title">Prvé prihlásenie</h1>
              <p className="auth-sub">Zadajte prístupový kód, ktorý ste dostali, a zvoľte si heslo. Kód platí len raz.</p>
              <form className="auth-form" onSubmit={onJoin}>
                <Input label="Meno a priezvisko" value={name} onChange={setName} autoComplete="name" autoFocus placeholder="Takto vás bude oslovovať asistent" />
                <Input label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="username" />
                <Password label="Heslo" value={password} onChange={setPassword} autoComplete="new-password" hint={`Aspoň ${MIN_PASSWORD} znakov. Použite heslo, ktoré nemáte nikde inde.`} />
                <Input label="Prístupový kód" value={code} onChange={(v) => setCode(formatCode(v))} autoComplete="one-time-code" code placeholder="JH-XXXXX-XXXXX-XXXXX-XXXXX" />
                {error && <p className="auth-error" role="alert">{error}</p>}
                <Submit busy={busy} busyText="Vytváram prístup…">Vytvoriť prístup</Submit>
              </form>
              <div className="auth-links">
                <button type="button" className="welcome-link" onClick={() => go('signin')}>Už mám účet – prihlásiť sa</button>
              </div>
            </>
          )}
          {mode === 'forgot' && (
            <>
              <h1 className="auth-title">Zabudnuté heslo</h1>
              <p className="auth-sub">
                Požiadajte vlastníka projektu o nový prístupový kód. Cez „Mám prístupový kód“ si s ním nastavíte nové heslo – e-mail ostáva rovnaký.
              </p>
              <form className="auth-form" onSubmit={onForgot}>
                <Input label="Alebo si nechajte poslať odkaz e-mailom" type="email" value={email} onChange={setEmail} autoComplete="username" placeholder="vas@email.sk" />
                {error && <p className="auth-error" role="alert">{error}</p>}
                {info && <p className="auth-info" role="status">{info}</p>}
                <Submit busy={busy} busyText="Odosielam…">Poslať odkaz</Submit>
              </form>
              <div className="auth-links">
                <button type="button" className="welcome-link" onClick={() => go('signin')}>Späť na prihlásenie</button>
                <button type="button" className="welcome-link" onClick={() => go('join')}>Mám prístupový kód</button>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthFrame>
  )
}

/** Nastavenie nového hesla po kliknutí na odkaz z e-mailu. */
export function NewPassword({ onDone, onCancel }: { onDone(): void; onCancel(): void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD) {
      setError(JOIN_ERROR.weak_password)
      return
    }
    setBusy(true)
    try {
      const { error: e } = await supabase.auth.updateUser({ password })
      if (e) setError(e.code === 'same_password' ? 'Nové heslo musí byť iné než doterajšie.' : e.code === 'weak_password' ? JOIN_ERROR.weak_password : 'Heslo sa nepodarilo uložiť. Skúste to znova.')
      else onDone()
    } catch {
      setError(OFFLINE)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame>
      <div className="auth-card">
        <div className="auth-pane">
          <p className="auth-eyebrow">Jadran Hills · CRM</p>
          <h1 className="auth-title">Nové heslo</h1>
          <p className="auth-sub">Zvoľte si nové heslo k svojmu účtu.</p>
          <form className="auth-form" onSubmit={onSubmit}>
            <Password label="Nové heslo" value={password} onChange={setPassword} autoComplete="new-password" hint={`Aspoň ${MIN_PASSWORD} znakov.`} />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <Submit busy={busy} busyText="Ukladám…">Uložiť heslo</Submit>
          </form>
          <div className="auth-links">
            <button type="button" className="welcome-link" onClick={onCancel}>Odhlásiť sa</button>
          </div>
        </div>
      </div>
    </AuthFrame>
  )
}

/** Prihlásený účet, ktorý nie je členom projektu: môže zadať kód alebo sa odhlásiť. */
export function NoAccess({ email, siteHref, onRedeemed, onSignOut }: { email: string; siteHref?: string; onRedeemed(): void; onSignOut(): void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error: e } = await supabase.rpc('crm_redeem', { code: formatCode(code) })
      if (e) setError(e.message.includes('bad_code') ? JOIN_ERROR.bad_code : e.message.includes('last_owner') ? JOIN_ERROR.last_owner : 'Kód sa nepodarilo overiť. Skúste to znova.')
      else onRedeemed()
    } catch {
      setError(OFFLINE)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame siteHref={siteHref}>
      <div className="auth-card">
        <div className="auth-pane">
          <p className="auth-eyebrow">Jadran Hills · CRM</p>
          <h1 className="auth-title">Účet nemá prístup</h1>
          <p className="auth-sub">
            Prihlásený účet <strong style={{ color: 'var(--w-ink)', fontWeight: 600 }}>{email}</strong> nie je medzi členmi projektu. Ak ste dostali prístupový kód na tento e-mail, zadajte ho.
          </p>
          <form className="auth-form" onSubmit={onSubmit}>
            <Input label="Prístupový kód" value={code} onChange={(v) => setCode(formatCode(v))} autoComplete="one-time-code" code placeholder="JH-XXXXX-XXXXX-XXXXX-XXXXX" autoFocus />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <Submit busy={busy} busyText="Overujem…">Použiť kód</Submit>
          </form>
          <div className="auth-links">
            <button type="button" className="welcome-link" onClick={onSignOut}>Odhlásiť sa</button>
          </div>
        </div>
      </div>
    </AuthFrame>
  )
}

/**
 * Stránka otvorená cez nechránené pripojenie (http). Heslo ani dáta projektu cez takú
 * stránku nejdú – namiesto prihlásenia ponúkne zabezpečenú adresu.
 */
export function Insecure({ siteHref }: { siteHref?: string }) {
  const secure = `https://${window.location.host}${window.location.pathname}${window.location.hash}`
  return (
    <AuthFrame siteHref={siteHref}>
      <div className="auth-card">
        <div className="auth-pane">
          <p className="auth-eyebrow">Jadran Hills · CRM</p>
          <h1 className="auth-title">Potrebné je zabezpečené pripojenie</h1>
          <p className="auth-sub">Prihlásenie funguje len na adrese, ktorá sa začína na https://. Heslo a dáta projektu tak neprechádzajú cez nechránenú stránku.</p>
          <a className="welcome-cta auth-submit" href={secure}>
            Otvoriť zabezpečenú adresu <ArrowRight size={18} aria-hidden />
          </a>
          <p className="auth-note">Ak sa zabezpečená adresa neotvorí, doména ešte nemá zapnutý certifikát SSL. Zapína sa v nastaveniach hostingu.</p>
        </div>
      </div>
    </AuthFrame>
  )
}
