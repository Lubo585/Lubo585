// Drží hlas, zvučku a osobné nastavenia asistenta. Stojí nad dátami projektu,
// aby ho uvítacia obrazovka mohla spustiť priamo z kliknutia.

import { Square } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AssistantContext, type Assistant } from './assistantContext'
import { buildBriefing, firstName, type BriefLine } from './lib/briefing'
import { compute } from './lib/calc'
import { playChime } from './lib/chime'
import { currentHour, todayIso } from './lib/format'
import { capability } from './lib/platform'
import { loadPrefs, savePrefs, type AssistantPrefs } from './lib/prefs'
import { Speaker, type SpeechMode } from './lib/speech'
import type { ProjectData } from './types'
import { useMountTransition } from './ui/motion'

interface Caption {
  lines: BriefLine[]
  index: number
}

interface HostViewer {
  me(): Promise<{ name: string }>
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<AssistantPrefs>(loadPrefs)
  const [viewerName, setViewerName] = useState('')
  const [caption, setCaption] = useState<Caption | null>(null)
  const [speaker] = useState(() => new Speaker())
  const [, setReady] = useState(false)
  const hide = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    void speaker.ready.then(() => alive && setReady(true))
    void capability<HostViewer>('user').then(async (user) => {
      const me = user ? await user.me().catch(() => null) : null
      if (alive && me?.name) setViewerName(me.name)
    })
    return () => {
      alive = false
      speaker.stop()
    }
  }, [speaker])

  const setPrefs = useCallback((patch: Partial<AssistantPrefs>) => {
    setPrefsState((p) => {
      const next = { ...p, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  const name = prefs.salutation.trim() || firstName(viewerName)

  const stop = useCallback(() => {
    speaker.stop()
    if (hide.current) window.clearTimeout(hide.current)
    setCaption(null)
  }, [speaker])

  const greet = useCallback(
    (data: ProjectData, opts?: { chime?: boolean }) => {
      if (hide.current) window.clearTimeout(hide.current)
      const lang = speaker.language(prefs.lang)
      const lines = buildBriefing({ data, r: compute(data), name, assistant: prefs.assistant, lang, today: todayIso(), hour: currentHour() })
      const chime = (opts?.chime ?? true) && prefs.sound
      if (chime) playChime()
      setCaption({ lines, index: -1 })
      speaker.speak(
        lines,
        { lang, voice: prefs.voiceName, rate: prefs.rate, aloud: prefs.voice, leadMs: chime ? 1100 : 250 },
        {
          onLine: (index) => setCaption((c) => (c ? { ...c, index } : c)),
          onEnd: (done) => {
            hide.current = window.setTimeout(() => setCaption(null), done ? 1400 : 0)
          },
        },
      )
    },
    [speaker, prefs, name],
  )

  const voice = useCallback(() => {
    const lang = speaker.language(prefs.lang)
    return { mode: prefs.voice ? speaker.mode(lang) : ('text' as SpeechMode), lang, device: speaker.deviceVoiceName(lang) }
  }, [speaker, prefs.lang, prefs.voice])

  const api = useMemo<Assistant>(
    () => ({ prefs, setPrefs, viewerName, name, speaking: caption !== null, greet, stop, voice }),
    [prefs, setPrefs, viewerName, name, caption, greet, stop, voice],
  )

  return (
    <AssistantContext.Provider value={api}>
      {children}
      <CaptionBar caption={caption} name={prefs.assistant.trim() || 'Jarvis'} onStop={stop} />
    </AssistantContext.Provider>
  )
}

/** Titulky k hlasu: čo asistent práve hovorí a tlačidlo na zastavenie. */
function CaptionBar({ caption, name, onStop }: { caption: Caption | null; name: string; onStop: () => void }) {
  const { mounted, phase } = useMountTransition(caption !== null, 320)
  // Posledné titulky ostávajú na obrazovke, kým pruh dohrá animáciu odchodu.
  const [shown, setShown] = useState(caption)
  if (caption && caption !== shown) setShown(caption)
  if (!mounted || !shown) return null
  const text = shown.index >= 0 ? shown.lines[shown.index]?.text : ''
  return (
    <div className="caption-wrap no-print" data-phase={phase}>
      <div className="caption" role="status" aria-live="polite">
        <span className="eq" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] opacity-60">{name}</span>
          <span key={shown.index} className="caption-text block text-[14.5px] leading-snug">
            {text || 'Pripravujem prehľad…'}
          </span>
        </span>
        <button type="button" onClick={onStop} className="caption-stop" aria-label="Zastaviť hlas" title="Zastaviť">
          <Square size={12} fill="currentColor" />
        </button>
      </div>
    </div>
  )
}
