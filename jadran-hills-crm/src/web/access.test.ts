import { describe, expect, it } from 'vitest'
import { formatCode, inviteLink, inviteMessage, parseInvite } from './access'

describe('formatCode', () => {
  it('nechá správne napísaný kód bez zmeny', () => {
    expect(formatCode('JH-ABCDE-FGHJK-MNPQR-STUVW')).toBe('JH-ABCDE-FGHJK-MNPQR-STUVW')
  })
  it('doplní pomlčky a veľké písmená', () => {
    expect(formatCode('jhabcdefghjkmnpqrstuvw')).toBe('JH-ABCDE-FGHJK-MNPQR-STUVW')
    expect(formatCode('  jh abcde fghjk mnpqr stuvw ')).toBe('JH-ABCDE-FGHJK-MNPQR-STUVW')
    expect(formatCode('JH_ABCDE.FGHJK/MNPQR STUVW')).toBe('JH-ABCDE-FGHJK-MNPQR-STUVW')
  })
  it('funguje priebežne počas písania', () => {
    expect(formatCode('j')).toBe('J')
    expect(formatCode('jh')).toBe('JH')
    expect(formatCode('JH-')).toBe('JH')
    expect(formatCode('jha')).toBe('JH-A')
    expect(formatCode('JH-ABCDE-F')).toBe('JH-ABCDE-F')
  })
  it('odreže znaky navyše', () => {
    expect(formatCode('JH-ABCDE-FGHJK-MNPQR-STUVW-XYZ')).toBe('JH-ABCDE-FGHJK-MNPQR-STUVW')
  })
  it('iný tvar kódu len zbaví medzier', () => {
    expect(formatCode(' ab 12 ')).toBe('AB12')
  })
})

describe('pozvánka v adrese', () => {
  it('odkaz sa dá prečítať späť', () => {
    const link = inviteLink('https://example.com/crm/', 'jana.nova+test@example.com', 'JH-ABCDE-FGHJK-MNPQR-STUVW')
    expect(link.startsWith('https://example.com/crm/#pozvanka&')).toBe(true)
    expect(parseInvite(new URL(link).hash)).toEqual({ email: 'jana.nova+test@example.com', code: 'JH-ABCDE-FGHJK-MNPQR-STUVW' })
  })
  it('iná kotva nie je pozvánka', () => {
    expect(parseInvite('#ekonomika')).toBeNull()
    expect(parseInvite('')).toBeNull()
  })
  it('pozvánka bez údajov otvorí prázdny formulár', () => {
    expect(parseInvite('#pozvanka')).toEqual({ email: '', code: '' })
  })
  it('správa obsahuje odkaz, kód aj e-mail', () => {
    const text = inviteMessage('Jadran Hills', 'https://example.com/crm/', 'a@example.com', 'JH-ABCDE-FGHJK-MNPQR-STUVW')
    expect(text).toContain('https://example.com/crm/#pozvanka&e=a%40example.com&k=JH-ABCDE-FGHJK-MNPQR-STUVW')
    expect(text).toContain('Prístupový kód: JH-ABCDE-FGHJK-MNPQR-STUVW')
    expect(text).toContain('a@example.com')
  })
})
