// Riadi uvítaciu obrazovku: zobrazí sa raz po otvorení a po vstupe plynulo odkryje aplikáciu.

import { useCallback, useState } from 'react'
import { useAssistant } from './assistantContext'
import { markWelcomed, welcomedThisSession } from './lib/prefs'
import type { ProjectData } from './types'

export type GatePhase = 'idle' | 'entering' | 'leaving' | 'done'

export interface WelcomeGate {
  phase: GatePhase
  enter(data: ProjectData, sound: boolean): void
}

export function useWelcomeGate(): WelcomeGate {
  const assistant = useAssistant()
  const [phase, setPhase] = useState<GatePhase>(() => (assistant.prefs.welcome && !welcomedThisSession() ? 'idle' : 'done'))
  const enter = useCallback(
    (data: ProjectData, sound: boolean) => {
      markWelcomed()
      // Zvuk a hlas sa musia spustiť priamo z kliknutia, inak ich prehliadač nepovolí.
      if (sound) assistant.greet(data)
      const hold = sound ? 1700 : 650
      setPhase('entering')
      window.setTimeout(() => setPhase('leaving'), hold)
      window.setTimeout(() => setPhase('done'), hold + 1000)
    },
    [assistant],
  )
  return { phase, enter }
}
