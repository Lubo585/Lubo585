// Slovenské popisky číselníkov a ich farebné tóny.

import type {
  ActivityKind,
  CheckStatus,
  CostTiming,
  ParcelUse,
  PhaseGroup,
  PipelineStage,
  RiskStatus,
  TaskStatus,
  TenderStatus,
  UnitStatus,
} from '../types'

type Tone = 'neutral' | 'good' | 'warn' | 'crit' | 'accent'

export const UNIT_STATUS: Record<UnitStatus, { label: string; tone: Tone; color: string }> = {
  free: { label: 'Voľný', tone: 'neutral', color: 'var(--deemph)' },
  reserved: { label: 'Rezervovaný', tone: 'warn', color: 'var(--s4)' },
  precontract: { label: 'Predzmluva', tone: 'accent', color: 'var(--s3)' },
  sold: { label: 'Predaný', tone: 'good', color: 'var(--s1)' },
  handed: { label: 'Odovzdaný', tone: 'good', color: 'var(--s7)' },
}

export const UNIT_STATUS_ORDER: UnitStatus[] = ['free', 'reserved', 'precontract', 'sold', 'handed']

export const PIPELINE: { id: PipelineStage; label: string }[] = [
  { id: 'new', label: 'Nový záujemca' },
  { id: 'contacted', label: 'Kontaktovaný' },
  { id: 'viewing', label: 'Obhliadka' },
  { id: 'offer', label: 'Ponuka' },
  { id: 'reservation', label: 'Rezervácia' },
  { id: 'precontract', label: 'Predzmluva' },
  { id: 'contract', label: 'Kúpna zmluva' },
  { id: 'lost', label: 'Stratený' },
]

export const pipelineLabel = (s: PipelineStage) => PIPELINE.find((p) => p.id === s)?.label ?? s

export const ACTIVITY: Record<ActivityKind, string> = {
  call: 'Telefonát',
  email: 'E-mail',
  meeting: 'Stretnutie',
  viewing: 'Obhliadka',
  offer: 'Ponuka',
  note: 'Poznámka',
}

export const CHECK: Record<CheckStatus, { label: string; tone: Tone }> = {
  done: { label: 'Hotovo', tone: 'good' },
  progress: { label: 'Prebieha', tone: 'accent' },
  todo: { label: 'Čaká', tone: 'warn' },
  na: { label: 'Netýka sa', tone: 'neutral' },
}

export const RISK_STATUS: Record<RiskStatus, string> = { open: 'Otvorené', watch: 'Sledované', closed: 'Uzavreté' }

export const TASK_STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  todo: { label: 'Na rade', tone: 'neutral' },
  doing: { label: 'Rozpracované', tone: 'accent' },
  done: { label: 'Hotovo', tone: 'good' },
}

export const TENDER_STATUS: Record<TenderStatus, string> = {
  prep: 'Príprava podkladov',
  sent: 'Dopyt odoslaný',
  bids: 'Ponuky prijaté',
  evaluation: 'Vyhodnotenie',
  contract: 'Zmluva podpísaná',
}

export const PHASE_GROUP: Record<PhaseGroup, { label: string; color: string }> = {
  prep: { label: 'Príprava', color: 'var(--s7)' },
  build: { label: 'Výstavba', color: 'var(--s1)' },
  finish: { label: 'Dokončenie', color: 'var(--s3)' },
  sales: { label: 'Predaj', color: 'var(--s2)' },
}

export const PARCEL_USE: Record<ParcelUse, string> = { building: 'Stavebná', road: 'Cesta', other: 'Ostatné' }

export const TIMING_LABEL: Record<CostTiming['mode'], string> = {
  month: 'Jednorazovo',
  range: 'Obdobie',
  phase: 'Podľa fázy',
  construction: 'Podľa výstavby',
  project: 'Celý projekt',
  sales: 'Podľa inkasa',
}

export const floorLabel = (f: number) => (f === 0 ? 'Prízemie' : `${f}. poschodie`)

/** Skóre rizika 1–25 → tón. */
export function riskTone(score: number): Tone {
  if (score >= 15) return 'crit'
  if (score >= 8) return 'warn'
  return 'good'
}
