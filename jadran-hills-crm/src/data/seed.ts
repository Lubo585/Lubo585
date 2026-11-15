// Súkromné východiskové dáta projektu.
//
// Ak pri zostavení existuje súbor `private/*.params.json` (priečinok je v .gitignore
// a do verejného repozitára sa nikdy nedostane), aplikácia sa po prvom otvorení
// naplní týmito dátami. Bez neho ponúkne import JSON alebo ukážkový projekt.

import type { ProjectParams } from './templates'

const found = import.meta.glob<ProjectParams>('../../private/*.params.json', { eager: true, import: 'default' })

// Stránka zostavená na zverejnenie (režim „artifact“) si dáta berie z databázy
// hostiteľa, preto sa do nej súkromné parametre nesmú dostať ani omylom.
export const PRIVATE_PARAMS: ProjectParams | null =
  import.meta.env.MODE === 'artifact' ? null : (Object.values(found)[0] ?? null)
