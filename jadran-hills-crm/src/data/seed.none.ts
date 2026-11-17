// Náhrada za `seed.ts` vo verejnom webe: nič súkromné sa do stránky nepribalí.
// Dáta aj obrázky prichádzajú z databázy až po prihlásení.

import type { ProjectParams } from './templates'

export const PRIVATE_PARAMS: ProjectParams | null = null

export const PRIVATE_MEDIA: Record<string, string> = {}
