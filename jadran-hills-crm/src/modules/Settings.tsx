import { Download, Play, RotateCcw, Square, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useAssistant } from '../assistantContext'
import { PRIVATE_PARAMS } from '../data/seed'
import { createProject } from '../data/templates'
import { firstName } from '../lib/briefing'
import { exportJson } from '../lib/export'
import { fmtDate, todayIso } from '../lib/format'
import { normalize } from '../lib/storage'
import { useStore } from '../store'
import type { ProjectData } from '../types'
import type { GreetLang, VoiceName } from '../lib/prefs'
import { Button, Card, Check, Dl, Field, Modal, Note, PageHead, Select, TextInput } from '../ui/kit'

type Confirm = { title: string; text: string; action: () => void; label: string } | null

export default function SettingsPage({ onReplace }: { onReplace: (d: ProjectData | null) => void }) {
  const { data, sync } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const readOnly = sync.state === 'readonly'
  const assistant = useAssistant()
  const { prefs, setPrefs } = assistant
  const voice = assistant.voice()
  const who = prefs.assistant.trim() || 'Jarvis'
  const langName = voice.lang === 'sk' ? 'po slovensky' : 'po anglicky'
  const voiceText =
    voice.mode === 'host'
      ? `Pozdrav prečíta hlas stránky ${langName}.${prefs.lang === 'auto' && voice.lang === 'en' ? ' Slovenčinu tu hlas neponúka; ak ju chcete skúsiť aj tak, zvoľte ju ako jazyk pozdravu.' : ''}`
      : voice.mode === 'device'
        ? `Pozdrav prečíta hlas vášho zariadenia${voice.device ? ` (${voice.device})` : ''} ${langName}.`
        : prefs.voice
          ? 'V tomto zobrazení nie je hlas dostupný; pozdrav sa ukáže ako titulky.'
          : 'Hlas je vypnutý; pozdrav sa ukáže ako titulky.'

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

        <Card title="Uvítanie a asistent" hint="Tieto voľby platia len pre vás v tomto prehliadači.">
          <div className="grid gap-4">
            <div className="grid gap-2.5">
              <Check checked={prefs.welcome} onChange={(v) => setPrefs({ welcome: v })} label="Uvítacia obrazovka pri otvorení" />
              <Check checked={prefs.sound} onChange={(v) => setPrefs({ sound: v })} label="Úvodná zvučka" />
              <Check checked={prefs.voice} onChange={(v) => setPrefs({ voice: v })} label="Hlasový pozdrav a stav projektu" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Meno asistenta">
                <TextInput value={prefs.assistant} onChange={(v) => setPrefs({ assistant: v })} placeholder="Jarvis" />
              </Field>
              <Field label="Oslovenie" hint={assistant.viewerName ? `Prázdne = meno z prihlásenia (${firstName(assistant.viewerName) || 'bez mena'}).` : 'Ako vás má asistent osloviť.'}>
                <TextInput value={prefs.salutation} onChange={(v) => setPrefs({ salutation: v })} placeholder={firstName(assistant.viewerName) || 'napr. Peter'} />
              </Field>
              <Field label="Jazyk pozdravu">
                <Select<GreetLang>
                  value={prefs.lang}
                  onChange={(v) => setPrefs({ lang: v })}
                  options={[
                    { value: 'auto', label: 'Automaticky' },
                    { value: 'sk', label: 'Slovenčina' },
                    { value: 'en', label: 'Angličtina' },
                  ]}
                />
              </Field>
              <Field label="Tempo reči">
                <Select
                  value={String(prefs.rate)}
                  onChange={(v) => setPrefs({ rate: Number(v) })}
                  options={[
                    { value: '0.9', label: 'Pomalšie' },
                    { value: '1', label: 'Normálne' },
                    { value: '1.1', label: 'Rýchlejšie' },
                  ]}
                />
              </Field>
              {voice.mode === 'host' && (
                <Field label="Hlas" hint="Štyri hlasy stránky; rozdiel je najlepšie počuť v angličtine.">
                  <Select<VoiceName>
                    value={prefs.voiceName}
                    onChange={(v) => setPrefs({ voiceName: v })}
                    options={[
                      { value: 'buttery', label: 'Hlas 1 (predvolený)' },
                      { value: 'airy', label: 'Hlas 2' },
                      { value: 'glassy', label: 'Hlas 3' },
                      { value: 'rounded', label: 'Hlas 4' },
                    ]}
                  />
                </Field>
              )}
            </div>
            <Note>{voiceText}</Note>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon={<Play size={14} />} onClick={() => assistant.greet(data)}>Prehrať uvítanie</Button>
              {assistant.speaking && <Button icon={<Square size={12} />} onClick={assistant.stop}>Zastaviť</Button>}
            </div>
            <p className="m-0 text-[12.5px] text-muted">
              Zvučka je pôvodný zvuk vytvorený priamo v prehliadači a {who} hovorí syntetickým hlasom – nejde o nahrávku ani hlas z filmu.
            </p>
          </div>
        </Card>

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
