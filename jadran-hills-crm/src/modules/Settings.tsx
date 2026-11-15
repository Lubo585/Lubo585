import { Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { PRIVATE_PARAMS } from '../data/seed'
import { createProject } from '../data/templates'
import { exportJson } from '../lib/export'
import { fmtDate, todayIso } from '../lib/format'
import { normalize } from '../lib/storage'
import { useStore } from '../store'
import type { ProjectData } from '../types'
import { Button, Card, Dl, Modal, Note, PageHead } from '../ui/kit'

type Confirm = { title: string; text: string; action: () => void; label: string } | null

export default function SettingsPage({ onReplace }: { onReplace: (d: ProjectData | null) => void }) {
  const { data, sync } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const readOnly = sync.state === 'readonly'

  const onFile = async (f: File | undefined) => {
    setError('')
    if (!f) return
    try {
      const parsed = normalize(JSON.parse(await f.text()))
      if (!parsed) {
        setError('Súbor nevyzerá ako export z tejto aplikácie.')
        return
      }
      setConfirm({
        title: 'Nahradiť dáta projektu?',
        text: sync.shared
          ? `Dáta v databáze tejto stránky sa nahradia obsahom súboru „${f.name}“ (projekt ${parsed.project.name}) – pre všetkých, ktorí stránku používajú. Ak ich nemáte zálohované, najprv ich exportujte.`
          : `Aktuálne dáta v tomto prehliadači sa nahradia obsahom súboru „${f.name}“ (projekt ${parsed.project.name}). Ak ste si ich nezálohovali, najprv ich exportujte.`,
        label: 'Nahradiť',
        action: () => onReplace(parsed),
      })
    } catch {
      setError('Súbor sa nepodarilo prečítať.')
    } finally {
      if (file.current) file.current.value = ''
    }
  }

  return (
    <>
      <PageHead title="Nastavenia a dáta" sub="Záloha, obnova a prenos dát projektu." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Záloha a prenos dát">
          <p className="m-0 text-[13.5px] text-ink-2">
            {sync.shared
              ? 'Údaje projektu sú uložené v databáze tejto stránky a sú rovnaké pre všetkých, ktorí k nej majú prístup. Exportom získate jeden súbor JSON ako zálohu.'
              : 'Všetky údaje projektu sú uložené v tomto prehliadači. Exportom získate jeden súbor JSON, ktorý môžete zálohovať, poslať kolegovi alebo nahrať na inom zariadení.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" icon={<Download size={15} />} onClick={() => exportJson(data)}>Exportovať dáta (JSON)</Button>
            {!readOnly && <Button icon={<Upload size={15} />} onClick={() => file.current?.click()}>Importovať dáta</Button>}
            <input id="settings-file" ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {error && <p className="mb-0 mt-3 text-[13px] text-crit-ink">{error}</p>}
          <div className="mt-4">
            {sync.state === 'error' ? (
              <Note tone="warn">Posledné zmeny sa nepodarilo uložiť. Exportujte si dáta, aby ste o ne neprišli.</Note>
            ) : readOnly ? (
              <Note>Projekt máte sprístupnený len na čítanie; export funguje, zmeny sa neukladajú.</Note>
            ) : sync.shared ? (
              <Note>Zmeny sa ukladajú automaticky po každej úprave. Pred väčšími zásahmi si urobte export – slúži ako bod návratu.</Note>
            ) : (
              <Note>Zmeny sa ukladajú automaticky. Odporúčame export po každej väčšej úprave – vymazanie údajov prehliadača by dáta odstránilo.</Note>
            )}
          </div>
        </Card>

        {!sync.shared && (
          <Card title="Obnova">
            <div className="grid gap-3">
              {PRIVATE_PARAMS && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0 text-[13.5px] text-ink-2">Vrátiť všetko na východiskové dáta projektu {PRIVATE_PARAMS.project.name}.</span>
                  <Button
                    icon={<RotateCcw size={15} />}
                    onClick={() =>
                      setConfirm({
                        title: 'Obnoviť východiskové dáta?',
                        text: 'Všetky vaše úpravy – ceny, klienti, ponuky, úlohy – sa nahradia východiskovým stavom projektu. Krok sa nedá vrátiť.',
                        label: 'Obnoviť',
                        action: () => onReplace(createProject(PRIVATE_PARAMS!, todayIso())),
                      })
                    }
                  >
                    Obnoviť
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0 text-[13.5px] text-ink-2">Odstrániť dáta z tohto prehliadača a začať odznova.</span>
                <Button
                  variant="danger"
                  icon={<Trash2 size={15} />}
                  onClick={() =>
                    setConfirm({
                      title: 'Odstrániť dáta z prehliadača?',
                      text: 'Dáta projektu sa z tohto prehliadača vymažú. Ak nemáte export, nedajú sa obnoviť.',
                      label: 'Odstrániť',
                      action: () => onReplace(null),
                    })
                  }
                >
                  Odstrániť
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card title="Prihlásenie a viac používateľov">
          {sync.shared ? (
            <>
              <p className="m-0 text-[13.5px] text-ink-2">
                Stránka je súkromná: otvorí ju len prihlásený používateľ, ktorému ste ju sprístupnili. Ďalších ľudí
                pridáte tlačidlom Zdieľať pri tejto stránke a každému nastavíte, či smie dáta upravovať, alebo len čítať.
              </p>
              <div className="mt-3">
                <Note tone="accent">
                  Všetci pracujú nad tými istými dátami a zmeny vidia priebežne. Ak dvaja naraz upravia tú istú časť
                  (napríklad výkaz výmer), platí neskorší zápis.
                </Note>
              </div>
            </>
          ) : (
            <>
              <p className="m-0 text-[13.5px] text-ink-2">
                Táto kópia beží bez prihlásenia: dáta vidí len ten, kto má prístup k tomuto prehliadaču alebo k
                exportovanému súboru. Verzia s prihlásením a spoločnými dátami je dostupná ako súkromná stránka.
              </p>
              <div className="mt-3">
                <Note tone="accent">Dáta medzi oboma verziami prenesiete exportom a importom súboru JSON.</Note>
              </div>
            </>
          )}
        </Card>

        <Card title="O projekte v aplikácii">
          <Dl
            rows={[
              ['Projekt', data.project.name],
              ['Vytvorené', fmtDate(data.meta.createdAt.slice(0, 10))],
              ['Posledná zmena', new Date(data.meta.updatedAt).toLocaleString('sk-SK')],
              ['Jednotky', String(data.units.length)],
              ['Položky výkazu výmer', String(data.boq.length)],
              ['Položky rozpočtu', String(data.costs.length)],
              ['Klienti', String(data.clients.length)],
              ['Verzia formátu dát', String(data.schema)],
            ]}
          />
        </Card>
      </div>

      {confirm && (
        <Modal
          title={confirm.title}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button onClick={() => setConfirm(null)}>Zrušiť</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const a = confirm.action
                  setConfirm(null)
                  a()
                }}
              >
                {confirm.label}
              </Button>
            </>
          }
        >
          <p className="m-0 text-[13.5px] text-ink-2">{confirm.text}</p>
        </Modal>
      )}
    </>
  )
}
