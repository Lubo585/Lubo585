import { company, footer, nav } from '../content/de'
import { Container } from '../lib/Section'
import { scrollTo } from '../lib/scroll'

export default function Footer() {
  return (
    <footer className="relative border-t border-line bg-ink-2/40 pt-16">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber text-ink">
                <svg viewBox="0 0 64 64" className="h-6 w-6" fill="currentColor">
                  <path d="M12 44h8V30l10-6v20h8V18l10-6v32h4v6H12z" />
                </svg>
              </span>
              <span className="font-display text-lg font-bold">{company.legalName}</span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-mist">{footer.note}</p>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mist">Navigation</h4>
            <ul className="mt-4 space-y-2">
              {nav.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault()
                      scrollTo(l.href)
                    }}
                    className="text-sm text-paper/80 transition-colors hover:text-amber"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div id="impressum" className="lg:col-span-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mist">{footer.legalTitle}</h4>
            <address className="mt-4 space-y-1 text-sm not-italic leading-relaxed text-paper/80">
              <p>{company.legalName}</p>
              <p>
                {company.address.street}, {company.address.city}, {company.address.country}
              </p>
              <p>Geschäftsführer: {company.managingDirector}</p>
              <p>Gegründet {company.founded} · Stammkapital {company.shareCapital}</p>
              <p>IČO (Reg.-Nr.): {company.ico}</p>
              <p>DIČ (Steuernr.): {company.dic}</p>
              <p>USt-IdNr.: {company.vat}</p>
              <p>{company.register}</p>
              <p>
                Web:{' '}
                <a href={company.website} className="hover:text-amber">
                  www.pspsk.de
                </a>
              </p>
              <p>
                E-Mail:{' '}
                <a href={`mailto:${company.email}`} className="hover:text-amber">
                  {company.email}
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-line py-6 text-xs text-mist sm:flex-row sm:items-center">
          <p>{footer.copyright}</p>
          <ul className="flex gap-6">
            {footer.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="transition-colors hover:text-amber">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  )
}
