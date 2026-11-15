// Súkromné východiskové dáta projektu.
//
// Ak pri zostavení existuje súbor `private/*.params.json` (priečinok je v .gitignore
// a do verejného repozitára sa nikdy nedostane), aplikácia sa po prvom otvorení
// naplní týmito dátami. Bez neho ponúkne import JSON alebo ukážkový projekt.

import type { ProjectParams } from './templates'

const found = import.meta.glob<ProjectParams>('../../private/*.params.json', { eager: true, import: 'default' })

export const PRIVATE_PARAMS: ProjectParams | null = Object.values(found)[0] ?? null
