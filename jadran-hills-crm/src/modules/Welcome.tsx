import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useAssistant } from '../assistantContext'
import { greetingWord } from '../lib/briefing'
import { currentHour } from '../lib/format'
import { coverOf, useMediaVersion } from '../lib/media'
import type { ProjectData } from '../types'
import { CoverArt } from '../ui/CoverArt'

export type WelcomePhase = 'idle' | 'entering' | 'leaving'

interface Props {
  /** Dáta projektu; null, kým sa načítavajú. */
  data: ProjectData | null
  phase: WelcomePhase
  /** Databáza dlho neodpovedá. */
  slow?: boolean
  /** Vstup nastane sám (po čerstvom prihlásení) – tlačidlo sa nezobrazuje. */
  auto?: boolean
  onEnter(sound: boolean): void
}

/** Uvítacia obrazovka po otvorení: pozdrav menom a vstup do projektu so zvučkou a hlasom. */
export default function Welcome({ data, phase, slow, auto, onEnter }: Props) {
  const { prefs, name } = useAssistant()
  const [hour] = useState(currentHour)
  const hello = `${greetingWord(hour, 'sk')}${name ? `, ${name}` : ''}.`
  const who = prefs.assistant.trim() || 'Jarvis'
  const audible = prefs.sound || prefs.voice
  useMediaVersion()
  const cover = data ? coverOf(data.media) : null
  const houses = data?.buildings.length ?? 0

  return (
    <div className="welcome" data-phase={phase} role="dialog" aria-modal="true" aria-label="Uvítanie">
      <div className="welcome-art" aria-hidden>
        <CoverArt item={cover} position="center bottom" />
      </div>

      {phase !== 'leaving' && (
        <div className="welcome-body gutter relative m-auto flex w-full max-w-3xl flex-col items-center py-10 text-center">
          <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--w-muted)]">{data ? data.project.name : 'CRM developerského projektu'}</p>
          <h1 className="welcome-title m-0 mt-4">{hello}</h1>
          <p className="m-0 mt-4 max-w-xl text-[17px] leading-snug text-[var(--w-muted)]" role="status">
            {data
              ? `${data.project.location}. ${data.project.stage}.`
              : slow
                ? 'Databáza stránky zatiaľ neodpovedá. Skúšam to ďalej – ak sa nič nezmení, skontrolujte pripojenie.'
                : 'Načítavam dáta projektu…'}
          </p>
          <div className="mt-6 flex min-h-[32px] flex-wrap items-center justify-center gap-2">
            {data ? (
              <>
                <span className="welcome-chip">{data.units.length} jednotiek</span>
                {houses > 0 && <span className="welcome-chip">{houses} {houses === 1 ? 'dom' : houses < 5 ? 'domy' : 'domov'}</span>}
                <span className="welcome-chip">{data.tasks.filter((t) => t.status !== 'done').length} otvorených úloh</span>
              </>
            ) : (
              <>
                <span className="skeleton h-[30px] w-28 rounded-full" />
                <span className="skeleton h-[30px] w-20 rounded-full" />
                <span className="skeleton h-[30px] w-36 rounded-full" />
              </>
            )}
          </div>
          {auto ? (
            <div className="mt-9 flex flex-col items-center gap-3">
              <span className="welcome-wait" aria-hidden />
              <p className="m-0 text-[13.5px] text-[var(--w-muted)]" role="status">
                {data ? `${who} sa pripája…` : 'Otváram projekt…'}
              </p>
            </div>
          ) : (
            <div className="mt-9 flex flex-col items-center gap-2">
              <button type="button" className="welcome-cta" disabled={!data} onClick={() => onEnter(true)} autoFocus>
                {data ? 'Vstúpiť' : 'Načítavam…'}
                {data && <ArrowRight size={18} aria-hidden />}
              </button>
              {data && audible && (
                <button type="button" className="welcome-link" onClick={() => onEnter(false)}>
                  Vstúpiť bez zvuku
                </button>
              )}
              <p className="m-0 mt-1 max-w-sm text-[12.5px] leading-snug text-[var(--w-muted)]">
                {audible ? `Po vstupe zaznie zvučka a ${who} vás pozdraví a zhrnie stav projektu.` : `${who} po vstupe zhrnie stav projektu v titulkoch.`}
              </p>
            </div>
          )}
        </div>
      )}
      {phase !== 'idle' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="orb-wrap">
              <div className="orb" />
            </div>
            <p className="orb-note m-0 text-[15px] text-[var(--w-muted)]" role="status">{who} sa pripája…</p>
          </div>
        </div>
      )}
    </div>
  )
}
