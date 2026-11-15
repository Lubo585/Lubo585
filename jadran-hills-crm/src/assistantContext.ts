// Asistent: uvítanie menom, hlasový prehľad stavu projektu a titulky k nemu.

import { createContext, useContext } from 'react'
import type { SpeechLang } from './lib/briefing'
import type { AssistantPrefs } from './lib/prefs'
import type { SpeechMode } from './lib/speech'
import type { ProjectData } from './types'

export interface Assistant {
  prefs: AssistantPrefs
  setPrefs(patch: Partial<AssistantPrefs>): void
  /** Meno z prihlásenia (prázdne, ak ho stránka nedostala). */
  viewerName: string
  /** Oslovenie použité v pozdrave. */
  name: string
  speaking: boolean
  /** Spustí pozdrav so zvučkou. Volať priamo z kliknutia. */
  greet(data: ProjectData, opts?: { chime?: boolean }): void
  stop(): void
  /** Ako a v akom jazyku asistent prehovorí pri aktuálnych nastaveniach. */
  voice(): { mode: SpeechMode; lang: SpeechLang; device: string }
}

export const AssistantContext = createContext<Assistant | null>(null)

export function useAssistant(): Assistant {
  const a = useContext(AssistantContext)
  if (!a) throw new Error('Asistent nie je inicializovaný')
  return a
}
