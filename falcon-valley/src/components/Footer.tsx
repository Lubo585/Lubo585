import { nav, company, footer } from '../content/site'

const YEAR = new Date().getFullYear()
import { useLang } from '../lib/lang'
import { scrollTo } from '../lib/scroll'
import { Container } from '../lib/Section'
import { Logo, LAYERS } from './Art'

export default function Footer() {
  const { t } = useLang()
  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-night">
      <svg viewBox="0 0 1440 600" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-x-0 bottom-0 h-64 w-full opacity-40" aria-hidden="true">
        <path d={LAYERS.far} fill="#141a23" />
        <path d={LAYERS.mid} fill="#0c1016" />
      </svg>
      <Container className="relative py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-mist">{t(footer.tagline)}</p>
            <p className="mt-2 text-sm text-mist/70">{t(company.location)}</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
            {nav.items.map((i) => (
              <a key={i.id} href={`#${i.id}`} onClick={(e) => { e.preventDefault(); scrollTo(`#${i.id}`) }} className="text-mist transition hover:text-snow">
                {t(i.label)}
              </a>
            ))}
            <a href={`mailto:${company.email}`} className="text-mist transition hover:text-snow">{company.email}</a>
            <a href={company.phoneHref} className="text-mist transition hover:text-snow">{company.phone}</a>
          </nav>
        </div>
        <p className="mt-12 max-w-3xl text-xs leading-relaxed text-mist/60">{t(footer.legal)}</p>
        <p className="mt-4 text-xs text-mist/50">
          © {YEAR} {company.name}. {t(footer.rights)}
        </p>
      </Container>
    </footer>
  )
}
