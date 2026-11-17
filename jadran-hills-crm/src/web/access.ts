// Prístupové kódy a pozvánky – pomocné funkcie bez závislosti od prehliadača či servera.

export const MIN_PASSWORD = 10

/**
 * Kód v podobe, v akej bol vystavený (JH-XXXXX-XXXXX-XXXXX-XXXXX), nech ho človek
 * napíše akokoľvek: malými písmenami, s medzerami alebo bez pomlčiek.
 */
export function formatCode(raw: string): string {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!chars.startsWith('JH')) return raw.toUpperCase().replace(/\s+/g, '')
  const groups = chars.slice(2, 22).match(/.{1,5}/g) ?? []
  return ['JH', ...groups].join('-')
}

export interface Invite {
  email: string
  code: string
}

/** Pozvánka z adresy stránky (časť za #, ktorá sa neodosiela na server). */
export function parseInvite(hash: string): Invite | null {
  const text = hash.replace(/^#\/?/, '')
  if (!text.startsWith('pozvanka')) return null
  const params = new URLSearchParams(text.slice('pozvanka'.length).replace(/^[&?]/, ''))
  return { email: (params.get('e') ?? '').trim(), code: formatCode(params.get('k') ?? '') }
}

export function readInvite(): Invite | null {
  return parseInvite(window.location.hash)
}

/** Odkaz, ktorý pozvanému predvyplní e-mail aj kód. */
export function inviteLink(base: string, email: string, code: string): string {
  return `${base}#pozvanka&e=${encodeURIComponent(email)}&k=${encodeURIComponent(code)}`
}

/** Text pozvánky na odoslanie vlastným kanálom (e-mail, správa). */
export function inviteMessage(project: string, base: string, email: string, code: string): string {
  return [
    `Pozvánka do CRM projektu ${project}`,
    '',
    `1. Otvorte: ${inviteLink(base, email, code)}`,
    `2. Vyplňte meno a zvoľte si heslo (aspoň ${MIN_PASSWORD} znakov).`,
    '',
    `Prístupový kód: ${code}`,
    `Platí 14 dní, len raz a len pre e-mail ${email}.`,
  ].join('\n')
}
