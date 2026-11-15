// Pozdrav asistenta: krátke uvítanie menom a stav projektu v pár vetách.
// Čistá funkcia nad dátami projektu – dá sa testovať bez prehliadača.

import type { Results } from './calc'
import { addMonths, addYears, daysUntil, fmtDate } from './format'
import type { ProjectData } from '../types'

export type SpeechLang = 'sk' | 'en'

export interface BriefLine {
  id: string
  text: string
}

export interface BriefInput {
  data: ProjectData
  r: Results
  /** Oslovenie (krstné meno); prázdne = pozdrav bez mena. */
  name: string
  assistant: string
  lang: SpeechLang
  today: string
  hour: number
}

const MONTH_SK = ['januári', 'februári', 'marci', 'apríli', 'máji', 'júni', 'júli', 'auguste', 'septembri', 'októbri', 'novembri', 'decembri']
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Slovenské skloňovanie podľa počtu: 1 úloha, 2–4 úlohy, 5 a viac úloh. */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n)
  return a === 1 ? one : a >= 2 && a <= 4 ? few : many
}

/** Krstné meno z celého mena z prihlásenia; e-mail či prezývku s číslicami nepoužije. */
export function firstName(full: string): string {
  const t = full.trim().split(/\s+/)[0] ?? ''
  if (!t || /[@\d_]/.test(t) || t.length > 24) return ''
  return t.charAt(0).toLocaleUpperCase('sk') + t.slice(1)
}

export function greetingWord(hour: number, lang: SpeechLang): string {
  if (lang === 'en') return hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening'
  return hour >= 5 && hour < 9 ? 'Dobré ráno' : hour >= 9 && hour < 18 ? 'Dobrý deň' : 'Dobrý večer'
}

/** Sumu vysloví slovom, aby ju hlas neprečítal ako skratku. */
function spokenEur(v: number, lang: SpeechLang): string {
  const a = Math.abs(v)
  if (a >= 1_000_000) {
    const m = (Math.round(a / 100_000) / 10).toString()
    return lang === 'en' ? `${m} million euros` : `${m.replace('.', ',')} milióna eur`
  }
  const k = Math.round(a / 1000)
  return lang === 'en' ? `${k} thousand euros` : `${k} tisíc eur`
}

function monthSpoken(startMonth: string, offset: number, lang: SpeechLang): string {
  const { y, m } = addMonths(startMonth, offset)
  return lang === 'en' ? `${MONTH_EN[m - 1]} ${y}` : `${MONTH_SK[m - 1]} ${y}`
}

export function buildBriefing({ data, r, name, assistant, lang, today, hour }: BriefInput): BriefLine[] {
  const sk = lang === 'sk'
  const lines: BriefLine[] = []
  const say = (id: string, text: string) => lines.push({ id, text })
  const who = assistant.trim() || 'Jarvis'
  const project = data.project.name

  say('hello', `${greetingWord(hour, lang)}${name ? `, ${name}` : ''}.`)
  say('loaded', sk ? `Vitajte späť. Projekt ${project} je načítaný.` : `Welcome back. ${project} is loaded.`)

  // Predaj
  const total = data.units.length
  const sold = r.revenue.soldCount
  if (total > 0) {
    if (sold === 0) say('sales', sk ? `Všetkých ${total} jednotiek je zatiaľ voľných.` : `All ${total} units are still available.`)
    else
      say(
        'sales',
        sk
          ? `Z ${total} jednotiek ${plural(sold, 'je', 'sú', 'je')} ${sold} ${plural(sold, 'predaná alebo rezervovaná', 'predané alebo rezervované', 'predaných alebo rezervovaných')}.`
          : `${sold} of ${total} units ${sold === 1 ? 'is' : 'are'} sold or reserved.`,
      )
  }

  // Najbližší míľnik
  const completion = r.phases.find((p) => p.tag === 'completion')
  const steps: [number | null, string, string][] = [
    [r.ms.constructionStart, 'začiatok výstavby', 'the start of construction'],
    [r.ms.shell, 'dokončenie hrubej stavby', 'completion of the structure'],
    [completion ? completion.start + completion.duration - 1 : null, 'kolaudácia', 'final approval'],
    [r.ms.handover, 'odovzdávanie bytov', 'the handover of apartments'],
  ]
  const next = steps.find(([i]) => i !== null && i >= r.nowIdx)
  if (next) {
    const when = monthSpoken(data.settings.startMonth, next[0] as number, lang)
    say('milestone', sk ? `Najbližší míľnik je ${next[1]} v ${when}.` : `The next milestone is ${next[2]} in ${when}.`)
  }

  // Úlohy
  const open = data.tasks.filter((t) => t.status !== 'done' && t.due)
  const overdue = open.filter((t) => (daysUntil(t.due, today) ?? 0) < 0).length
  const week = open.filter((t) => {
    const d = daysUntil(t.due, today) ?? 99
    return d >= 0 && d <= 7
  }).length
  if (overdue > 0)
    say('overdue', sk ? `Po termíne ${plural(overdue, 'je', 'sú', 'je')} ${overdue} ${plural(overdue, 'úloha', 'úlohy', 'úloh')}.` : `${overdue} ${overdue === 1 ? 'task is' : 'tasks are'} overdue.`)
  if (week > 0)
    say('week', sk ? `Do siedmich dní treba dokončiť ${week} ${plural(week, 'úlohu', 'úlohy', 'úloh')}.` : `${week} ${week === 1 ? 'task is' : 'tasks are'} due within seven days.`)
  if (overdue === 0 && week === 0) say('week', sk ? 'Na najbližší týždeň nemáte žiadnu úlohu s termínom.' : 'No tasks are due in the coming week.')

  // Lehota zo stavebného povolenia
  const deadline = data.project.permitFinalDate ? addYears(data.project.permitFinalDate, data.project.permitValidYears) : null
  const left = daysUntil(deadline, today)
  if (deadline && left !== null) {
    if (left < 0) say('permit', sk ? 'Pozor, lehota na začatie stavby podľa povolenia už uplynula.' : 'Warning: the deadline to start construction under the permit has passed.')
    else if (left <= 540)
      say('permit', sk ? `Stavbu treba začať do ${fmtDate(deadline)}, ${plural(left, 'zostáva', 'zostávajú', 'zostáva')} ${left} ${plural(left, 'deň', 'dni', 'dní')}.` : `Construction must start by ${fmtDate(deadline)}; ${left} ${left === 1 ? 'day remains' : 'days remain'}.`)
  }

  // Ekonomika
  if (r.kpi.profit < 0)
    say('economy', sk ? `Upozorňujem, že pri súčasných predpokladoch projekt končí stratou ${spokenEur(r.kpi.profit, lang)}.` : `Note that under the current assumptions the project ends with a loss of ${spokenEur(r.kpi.profit, lang)}.`)
  else if (r.kpi.profit > 0)
    say('economy', sk ? `Model ukazuje zisk pred zdanením približne ${spokenEur(r.kpi.profit, lang)}.` : `The model shows a pre-tax profit of about ${spokenEur(r.kpi.profit, lang)}.`)

  say('ready', sk ? `${who} je vám k dispozícii.` : `${who} is at your service.`)
  return lines
}
