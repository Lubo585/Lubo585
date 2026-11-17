import { useCallback, useState } from 'react'
import { Shell, SharedApp, Stage, type Connection } from './AppShell'
import { AssistantProvider } from './AssistantProvider'
import { PRIVATE_PARAMS } from './data/seed'
import { createProject } from './data/templates'
import { todayIso } from './lib/format'
import { capability, hosted } from './lib/platform'
import type { Db } from './lib/remote'
import { localStore } from './lib/storage'
import Onboarding from './modules/Onboarding'
import { StoreProvider } from './StoreProvider'
import type { ProjectData } from './types'
import { useWelcomeGate } from './welcomeGate'

/** Samostatná aplikácia: dáta v úložisku prehliadača. */
function LocalApp() {
  const [initial, setInitial] = useState<ProjectData | null>(
    () => localStore.load() ?? (PRIVATE_PARAMS ? createProject(PRIVATE_PARAMS, todayIso()) : null),
  )
  const [generation, setGeneration] = useState(0)

  const replace = useCallback((d: ProjectData | null) => {
    if (d) localStore.save(d)
    else localStore.clear()
    setInitial(d)
    setGeneration((g) => g + 1)
    window.location.hash = 'prehlad'
  }, [])

  const gate = useWelcomeGate()

  if (!initial) return <Onboarding onStart={replace} />
  return (
    <Stage gate={gate} data={initial}>
      <StoreProvider key={generation} initial={initial}>
        <Shell onReplace={replace} />
      </StoreProvider>
    </Stage>
  )
}

interface HostUser {
  can(name: string): Promise<boolean | null>
}

/** Hostovaná stránka: dáta v databáze hostiteľa, prístup riadi jeho prihlásenie. */
async function connectHost(): Promise<Connection | null> {
  const db = await capability<Db>('db')
  if (!db) return null
  const user = await capability<HostUser>('user')
  const canWrite = user ? await user.can('data.write').catch(() => null) : null
  return { db, readOnly: canWrite === false }
}

export default function App() {
  return <AssistantProvider>{hosted ? <SharedApp connect={connectHost} fallback={<LocalApp />} /> : <LocalApp />}</AssistantProvider>
}
