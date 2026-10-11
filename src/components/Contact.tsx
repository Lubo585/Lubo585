import { motion, useReducedMotion } from 'motion/react'
import { Clock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { company, contact } from '../content/de'
import { Container, SectionHeader } from '../lib/Section'
import { Reveal } from '../lib/Reveal'
import { fadeUp, stagger } from '../lib/variants'
import { Magnetic } from '../lib/Magnetic'

const field =
  'w-full rounded-2xl border border-line bg-ink px-4 py-3.5 text-paper placeholder:text-mist/60 outline-none transition-all focus:border-amber focus:ring-4 focus:ring-amber/15'

export default function Contact() {
  const reduced = useReducedMotion()
  const [sent, setSent] = useState(false)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const lines = [
      `Name: ${fd.get('name')}`,
      `Unternehmen: ${fd.get('company')}`,
      `E-Mail: ${fd.get('email')}`,
      `Telefon: ${fd.get('phone')}`,
      `Gewerk / Anzahl: ${fd.get('trade')}`,
      '',
      `${fd.get('message')}`,
    ]
    const url = `mailto:${company.email}?subject=${encodeURIComponent(contact.form.subject)}&body=${encodeURIComponent(
      lines.join('\n'),
    )}`
    window.location.href = url
    setSent(true)
  }

  return (
    <section id="kontakt" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
      <Container>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow={contact.eyebrow} title={contact.title} subtitle={contact.subtitle} />
            <motion.ul
              className="mt-10 space-y-5"
              initial={reduced ? undefined : 'hidden'}
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.li variants={fadeUp} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber/10 text-amber">
                  <Phone size={18} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist">Telefon</p>
                  <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="font-medium hover:text-amber">
                    {company.phoneDisplay}
                  </a>
                </div>
              </motion.li>
              <motion.li variants={fadeUp} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber/10 text-amber">
                  <Mail size={18} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist">E-Mail</p>
                  <a href={`mailto:${company.email}`} className="font-medium hover:text-amber">
                    {company.email}
                  </a>
                </div>
              </motion.li>
              <motion.li variants={fadeUp} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber/10 text-amber">
                  <MapPin size={18} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist">Adresse</p>
                  <p className="font-medium">
                    {company.legalName}
                    <br />
                    {company.address.street}, {company.address.city}
                    <br />
                    {company.address.country}
                  </p>
                </div>
              </motion.li>
              <motion.li variants={fadeUp} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber/10 text-amber">
                  <Clock size={18} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist">{contact.direct.title}</p>
                  <p className="font-medium">{contact.direct.hours}</p>
                </div>
              </motion.li>
            </motion.ul>
          </div>

          <Reveal className="lg:col-span-7" delay={2}>
            <form
              onSubmit={onSubmit}
              className="rounded-[2rem] border border-line bg-ink-2/60 p-6 sm:p-10"
              noValidate={false}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <input name="name" required placeholder={contact.form.name} className={field} autoComplete="name" />
                <input name="company" placeholder={contact.form.companyName} className={field} autoComplete="organization" />
                <input name="email" type="email" required placeholder={contact.form.email} className={field} autoComplete="email" />
                <input name="phone" type="tel" placeholder={contact.form.phone} className={field} autoComplete="tel" />
                <input name="trade" placeholder={contact.form.trade} className={`${field} sm:col-span-2`} />
                <textarea
                  name="message"
                  rows={5}
                  required
                  placeholder={contact.form.message}
                  className={`${field} resize-y sm:col-span-2`}
                />
              </div>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-sm text-xs leading-relaxed text-mist">{contact.form.privacy}</p>
                <Magnetic>
                  <button
                    type="submit"
                    className="group inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3.5 font-semibold text-ink transition-colors hover:bg-amber-2"
                  >
                    {sent ? 'E-Mail-Programm geöffnet' : contact.form.submit}
                    <Send size={16} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                  </button>
                </Magnetic>
              </div>
            </form>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
