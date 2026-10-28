import { Camera, Mail, Phone, PlayCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { falcons, forSale } from '../content/falcons'
import { company, contact } from '../content/site'
import { useLang } from '../lib/lang'
import { Reveal } from '../lib/Reveal'
import { Container, SectionHeader } from '../lib/Section'

type State = 'idle' | 'sending' | 'sent' | 'error'

export default function Contact() {
  const { t, lang } = useLang()
  const [falconId, setFalconId] = useState('')
  const [state, setState] = useState<State>('idle')

  useEffect(() => {
    const on = (e: Event) => setFalconId((e as CustomEvent<string>).detail)
    window.addEventListener('fv:inquire', on)
    return () => window.removeEventListener('fv:inquire', on)
  }, [])

  const selected = falcons.find((f) => f.id === falconId)
  const subject = selected ? `Falcons Valley – ${selected.name} (${selected.ringNumber})` : 'Falcons Valley'

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    setState('sending')
    try {
      const res = await fetch(company.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, _subject: subject, _language: lang, falcon: selected ? `${selected.name} (${selected.ringNumber})` : '-' }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setState('sent')
      form.reset()
      setFalconId('')
    } catch {
      setState('error')
    }
  }

  const mailto = `mailto:${company.email}?subject=${encodeURIComponent(subject)}`
  const input = 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-snow placeholder:text-mist/60 outline-none transition focus:border-glacier/60 focus:bg-white/[0.07]'

  return (
    <section id="contact" className="relative bg-night">
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-brand/10 blur-[140px]" />
      <Container className="grid gap-14 py-24 sm:py-32 lg:grid-cols-2 lg:gap-24">
        <div>
          <SectionHeader eyebrow={t(contact.eyebrow)} title={t(contact.title)} subtitle={t(contact.subtitle)} />
          <Reveal delay={3} className="mt-10 space-y-3 text-mist">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mist/70">{t(contact.direct)}</p>
            <a href={mailto} className="flex items-center gap-3 text-lg text-snow transition hover:text-brand">
              <Mail size={18} className="text-brand" /> {company.email}
            </a>
            <a href={company.phoneHref} className="flex items-center gap-3 text-lg text-snow transition hover:text-brand">
              <Phone size={18} className="text-brand" /> {company.phone}
            </a>
            <div className="flex gap-3 pt-3">
              <a href={company.instagram} target="_blank" rel="noreferrer" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-snow transition hover:bg-white/5" aria-label="Instagram">
                <Camera size={18} />
              </a>
              <a href={company.youtube} target="_blank" rel="noreferrer" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-snow transition hover:bg-white/5" aria-label="YouTube">
                <PlayCircle size={18} />
              </a>
            </div>
            <p className="pt-4 text-sm">{t(company.location)}</p>
          </Reveal>
        </div>

        <Reveal delay={2}>
          <form onSubmit={onSubmit} className="rounded-[2rem] border border-white/10 bg-night-2 p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <input name="name" required placeholder={t(contact.form.name)} className={input} autoComplete="name" />
              <input name="email" type="email" required placeholder={t(contact.form.email)} className={input} autoComplete="email" />
              <input name="phone" placeholder={t(contact.form.phone)} className={`${input} sm:col-span-2`} autoComplete="tel" />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-mist/70">{t(contact.form.falcon)}</label>
                <select value={falconId} onChange={(e) => setFalconId(e.target.value)} className={`${input} appearance-none`}>
                  <option value="" className="bg-night-2">{t(contact.form.none)}</option>
                  {forSale
                    .filter((f) => f.status !== 'sold')
                    .map((f) => (
                      <option key={f.id} value={f.id} className="bg-night-2">
                        {f.name} · {f.ringNumber}
                      </option>
                    ))}
                </select>
              </div>
              <textarea name="message" required rows={5} placeholder={t(contact.form.message)} className={`${input} sm:col-span-2`} />
              <input type="text" name="_honey" className="hidden" tabIndex={-1} autoComplete="off" />
            </div>
            <button
              type="submit"
              disabled={state === 'sending'}
              className="mt-5 w-full rounded-full bg-snow px-6 py-3.5 text-base font-semibold text-night transition hover:bg-white disabled:opacity-60"
            >
              {state === 'sending' ? t(contact.form.sending) : t(contact.form.send)}
            </button>
            {state === 'sent' && <p className="mt-4 text-sm text-emerald-300">{t(contact.form.sent)}</p>}
            {state === 'error' && (
              <p className="mt-4 text-sm text-brand-2">
                {t(contact.form.error)}{' '}
                <a href={mailto} className="underline">{company.email}</a>
              </p>
            )}
            <p className="mt-4 text-xs text-mist/60">{t(contact.form.consent)}</p>
          </form>
        </Reveal>
      </Container>
    </section>
  )
}
