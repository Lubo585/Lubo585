import { FolderOpen, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { DEMO_PARAMS } from '../data/demo'
import { createProject } from '../data/templates'
import { todayIso } from '../lib/format'
import { normalize } from '../lib/storage'
import type { ProjectData } from '../types'
import { Button, Note } from '../ui/kit'

/** Úvodná obrazovka, keď v prehliadači ešte nie sú žiadne dáta projektu. */
export default function Onboarding({ onStart }: { onStart: (d: ProjectData) => void }) {
  const file = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const onFile = async (f: File | undefined) => {
    if (!f) return
    try {
      const parsed = normalize(JSON.parse(await f.text()))
      if (!parsed) {
        setError('Súbor nevyzerá ako export z tejto aplikácie.')
        return
      }
      onStart(parsed)
    } catch {
      setError('Súbor sa nepodarilo prečítať.')
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-4 py-10">
      <h1 className="text-[26px] font-semibold tracking-tight">CRM developerského projektu</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
        Ekonomika, výkaz výmer, cenník a predaj, harmonogram, tendre, povolenia a riziká na jednom mieste. V tomto prehliadači
        zatiaľ nie sú uložené žiadne dáta projektu.
      </p>

      <div className="mt-6 grid gap-3">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <div className="text-[14.5px] font-semibold">Nahrať dáta projektu</div>
          <p className="mt-1 text-[13px] text-muted">Súbor JSON, ktorý ste dostali k projektu alebo si ho exportovali zo zálohy.</p>
          <div className="mt-3">
            <Button variant="primary" icon={<FolderOpen size={16} />} onClick={() => file.current?.click()}>
              Vybrať súbor
            </Button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {error && <p className="mt-2 text-[13px] text-crit-ink">{error}</p>}
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <div className="text-[14.5px] font-semibold">Vyskúšať na ukážkovom projekte</div>
          <p className="mt-1 text-[13px] text-muted">Vymyslené dáta dvoch malých bytových domov – na zoznámenie sa s aplikáciou.</p>
          <div className="mt-3">
            <Button icon={<Sparkles size={16} />} onClick={() => onStart(createProject(DEMO_PARAMS, todayIso()))}>
              Otvoriť ukážku
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Note>
          Dáta zostávajú len vo vašom prehliadači – nikam sa neodosielajú. Pravidelne si ich zálohujte exportom v časti
          Nastavenia a dáta.
        </Note>
      </div>
    </main>
  )
}
