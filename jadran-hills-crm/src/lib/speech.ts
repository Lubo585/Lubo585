// Hlas asistenta.
//
// Na stránke u hostiteľa číta text jeho hlasová služba (schopnosť `tts`). Kde ju
// zobrazenie neponúka, použije sa hlas zabudovaný v zariadení, ak má slovenčinu
// alebo angličtinu. Bez hlasu sa pozdrav ukáže ako titulky v rovnakom tempe.

import type { BriefLine, SpeechLang } from './briefing'
import { capability, errorCode } from './platform'
import type { GreetLang, VoiceName } from './prefs'

interface TtsLine {
  text: string
  id?: string
}

interface HostTts {
  speak(what: TtsLine[], options?: { voice?: string; rate?: number; language?: string }): Promise<unknown>
  stop(): Promise<void>
  languages?(): Promise<string[]>
  onLine(handler: (e: { line: number; id?: string }) => void): () => void
}

export type SpeechMode = 'host' | 'device' | 'text'

export interface SpeakOptions {
  lang: SpeechLang
  voice: VoiceName
  rate: number
  /** false = bez hlasu, len titulky. */
  aloud: boolean
  /** Oneskorenie titulkov bez hlasu, aby nezačali skôr než zvučka (ms). */
  leadMs?: number
}

export interface SpeakHandlers {
  onLine(index: number): void
  /** done = true: dopovedané do konca; false: prerušené. */
  onEnd(done: boolean): void
}

const PREFERRED_EN = ['daniel', 'arthur', 'oliver', 'george', 'hazel', 'serena', 'kate']

export class Speaker {
  private tts: HostTts | null = null
  private ttsLangs: string[] | undefined
  /** Používateľ čítanie nahlas pre túto stránku vypol – nehovoríme ani iným hlasom. */
  private denied = false
  private token = 0
  private timers: number[] = []
  private voices: SpeechSynthesisVoice[] = []
  /** Odkazy držia vety pri živote, kým ich prehliadač nedočíta. */
  private queue: SpeechSynthesisUtterance[] = []
  readonly ready: Promise<void>

  constructor() {
    this.ready = this.init()
  }

  private async init(): Promise<void> {
    const synth = this.synth()
    if (synth) {
      const load = () => {
        this.voices = synth.getVoices()
      }
      load()
      synth.addEventListener?.('voiceschanged', load)
    }
    this.tts = await capability<HostTts>('tts')
    if (this.tts?.languages) this.ttsLangs = await this.tts.languages().catch(() => undefined)
  }

  private synth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
  }

  /** Hlas zariadenia pre daný jazyk; len miestne hlasy, text tak neopúšťa zariadenie. */
  private deviceVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
    const local = this.voices.filter((v) => v.localService && v.lang.toLowerCase().startsWith(lang))
    if (local.length === 0) return null
    if (lang === 'sk') return local[0]
    const rank = (v: SpeechSynthesisVoice) => {
      const name = v.name.toLowerCase()
      const i = PREFERRED_EN.findIndex((p) => name.includes(p))
      return (i >= 0 ? i : 50) + (v.lang.toLowerCase().startsWith('en-gb') ? 0 : 100)
    }
    return [...local].sort((a, b) => rank(a) - rank(b))[0]
  }

  mode(lang?: SpeechLang): SpeechMode {
    if (this.tts) return this.denied ? 'text' : 'host'
    if (!this.synth()) return 'text'
    if (lang) return this.deviceVoice(lang) ? 'device' : 'text'
    return this.deviceVoice('sk') || this.deviceVoice('en') ? 'device' : 'text'
  }

  /** Jazyk pozdravu: zvolený, inak slovenčina tam, kde ju hlas vie prečítať. */
  language(pref: GreetLang): SpeechLang {
    if (pref !== 'auto') return pref
    if (this.tts && !this.denied) return this.ttsLangs?.some((l) => l.toLowerCase().startsWith('sk')) ? 'sk' : 'en'
    if (this.tts) return 'sk'
    if (this.deviceVoice('sk')) return 'sk'
    return this.deviceVoice('en') ? 'en' : 'sk'
  }

  /** Meno hlasu zariadenia na zobrazenie v nastaveniach. */
  deviceVoiceName(lang: SpeechLang): string {
    return this.deviceVoice(lang)?.name ?? ''
  }

  /** Odomkne hlas zariadenia z kliknutia, aby mohol prehovoriť aj o chvíľu neskôr. */
  prime(): void {
    const synth = this.synth()
    if (!synth || this.tts) return
    try {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      synth.speak(u)
    } catch {
      // bez hlasu dobehne pozdrav v titulkoch
    }
  }

  /** Prečíta vety. Volať priamo z kliknutia – prehliadače inak zvuk nespustia. */
  speak(lines: BriefLine[], opts: SpeakOptions, handlers: SpeakHandlers): SpeechMode {
    this.halt()
    const my = ++this.token
    const alive = () => my === this.token
    const mode = opts.aloud ? this.mode(opts.lang) : 'text'
    let at = -1
    const onLine = (i: number) => {
      if (!alive() || i <= at) return
      at = i
      handlers.onLine(i)
    }
    const captions = (from: number, lead: number) => this.captions(lines, from, lead, alive, onLine, handlers)

    if (mode === 'host' && this.tts) {
      const tts = this.tts
      const ids = lines.map((l) => l.id)
      const off = tts.onLine((e) => onLine(e.id ? ids.indexOf(e.id) : e.line))
      tts
        .speak(lines.map((l) => ({ text: l.text, id: l.id })), { voice: opts.voice, rate: opts.rate, language: opts.lang })
        .then(() => {
          off()
          if (alive()) handlers.onEnd(true)
        })
        .catch((e: unknown) => {
          off()
          if (!alive()) return
          const code = errorCode(e)
          if (code === 'not_granted') this.denied = true
          if (code === 'stopped') handlers.onEnd(false)
          else captions(at + 1, 0) // hlas zlyhal: zvyšok ukážeme aspoň ako text
        })
      return mode
    }

    const voice = mode === 'device' ? this.deviceVoice(opts.lang) : null
    const synth = this.synth()
    if (voice && synth) {
      let started = false
      synth.cancel()
      this.queue = lines.map((l, i) => {
        const u = new SpeechSynthesisUtterance(l.text)
        u.voice = voice
        u.lang = voice.lang
        u.rate = opts.rate
        u.onstart = () => {
          started = true
          onLine(i)
        }
        u.onerror = (ev) => {
          if (!alive() || ev.error === 'interrupted' || ev.error === 'canceled') return
          synth.cancel()
          captions(at + 1, 0)
        }
        if (i === lines.length - 1) u.onend = () => alive() && handlers.onEnd(true)
        return u
      })
      for (const u of this.queue) synth.speak(u)
      // Niektoré prehliadače hlas potichu odmietnu; vtedy pozdrav dobehne v titulkoch.
      this.timers.push(
        window.setTimeout(() => {
          if (alive() && !started) {
            synth.cancel()
            captions(0, 0)
          }
        }, 2600),
      )
      return 'device'
    }

    captions(0, opts.leadMs ?? 0)
    return 'text'
  }

  private captions(lines: BriefLine[], from: number, lead: number, alive: () => boolean, onLine: (i: number) => void, handlers: SpeakHandlers): void {
    let t = lead
    for (let i = Math.max(0, from); i < lines.length; i++) {
      const at = t
      this.timers.push(window.setTimeout(() => onLine(i), at))
      t += Math.max(1700, lines[i].text.length * 58)
    }
    this.timers.push(window.setTimeout(() => alive() && handlers.onEnd(true), t))
  }

  private halt(): void {
    for (const t of this.timers) window.clearTimeout(t)
    this.timers = []
    this.queue = []
  }

  stop(): void {
    this.token += 1
    this.halt()
    void this.tts?.stop().catch(() => {})
    this.synth()?.cancel()
  }
}
