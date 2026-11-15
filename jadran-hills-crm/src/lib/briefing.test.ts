import { describe, expect, it } from 'vitest'
import { DEMO_PARAMS } from '../data/demo'
import { createProject } from '../data/templates'
import { buildBriefing, firstName, greetingWord, plural } from './briefing'
import { compute } from './calc'

const TODAY = '2026-11-15'
const project = () => createProject({ ...DEMO_PARAMS, startMonth: '2026-11' }, TODAY)
const brief = (over: Partial<Parameters<typeof buildBriefing>[0]> = {}) => {
  const data = over.data ?? project()
  return buildBriefing({ data, r: compute(data, undefined, { today: TODAY }), name: 'Peter', assistant: 'Jarvis', lang: 'sk', today: TODAY, hour: 19, ...over })
}
const text = (lines: { text: string }[]) => lines.map((l) => l.text).join(' ')

describe('pozdrav asistenta', () => {
  it('pozdraví menom podľa dennej doby a skončí ponukou pomoci', () => {
    const lines = brief()
    expect(lines[0].text).toBe('Dobrý večer, Peter.')
    expect(lines.at(-1)?.text).toBe('Jarvis je vám k dispozícii.')
    expect(brief({ hour: 7 })[0].text).toBe('Dobré ráno, Peter.')
    expect(brief({ hour: 11, name: '' })[0].text).toBe('Dobrý deň.')
  })

  it('každá veta má vlastné označenie pre titulky', () => {
    const ids = brief().map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('hovorí o predaji, najbližšom míľniku a úlohách', () => {
    const data = project()
    const t = text(brief({ data }))
    expect(t).toContain(`Všetkých ${data.units.length} jednotiek je zatiaľ voľných.`)
    expect(t).toMatch(/Najbližší míľnik je .+ v [a-zíáúé]+ \d{4}\./)
    expect(t).toMatch(/úloh|úlohu|úlohy|žiadnu úlohu/)
  })

  it('počty skloňuje po slovensky', () => {
    const data = project()
    data.units[0].status = 'sold'
    expect(text(brief({ data }))).toContain(`Z ${data.units.length} jednotiek je 1 predaná alebo rezervovaná.`)
    data.units[1].status = 'reserved'
    data.units[2].status = 'sold'
    expect(text(brief({ data }))).toContain('sú 3 predané alebo rezervované.')
    expect(plural(1, 'deň', 'dni', 'dní')).toBe('deň')
    expect(plural(3, 'deň', 'dni', 'dní')).toBe('dni')
    expect(plural(12, 'deň', 'dni', 'dní')).toBe('dní')
  })

  it('upozorní na lehotu zo stavebného povolenia', () => {
    const data = project()
    data.project.permitFinalDate = '2025-01-10'
    data.project.permitValidYears = 3
    expect(text(brief({ data }))).toMatch(/Stavbu treba začať do 10\. 1\. 2028, zostáva \d+ dní\./)
    data.project.permitFinalDate = '2022-01-10'
    expect(text(brief({ data }))).toContain('lehota na začatie stavby podľa povolenia už uplynula')
  })

  it('po anglicky povie to isté', () => {
    const lines = brief({ lang: 'en', hour: 9 })
    expect(lines[0].text).toBe('Good morning, Peter.')
    expect(lines.at(-1)?.text).toBe('Jarvis is at your service.')
    expect(text(lines)).toContain('units are still available')
  })

  it('z prihlasovacieho mena vyberie krstné meno, e-mail nepoužije', () => {
    expect(firstName('Peter Horváth')).toBe('Peter')
    expect(firstName('jana nováková')).toBe('Jana')
    expect(firstName('meno.priezvisko@example.com')).toBe('')
    expect(firstName('user_4821')).toBe('')
    expect(firstName('')).toBe('')
    expect(greetingWord(23, 'sk')).toBe('Dobrý večer')
    expect(greetingWord(14, 'en')).toBe('Good afternoon')
  })
})
