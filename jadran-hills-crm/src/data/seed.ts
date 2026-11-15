// Súkromné východiskové dáta projektu.
//
// Ak pri zostavení existuje súbor `private/*.params.json` (priečinok je v .gitignore
// a do verejného repozitára sa nikdy nedostane), aplikácia sa po prvom otvorení
// naplní týmito dátami. Bez neho ponúkne import JSON alebo ukážkový projekt.
// Rovnako sa pribalia obrázky z `private/media/`.

import type { ProjectParams } from './templates'

const found = import.meta.glob<ProjectParams>('../../private/*.params.json', { eager: true, import: 'default' })
const images = import.meta.glob<string>('../../private/media/*.{png,webp,jpg,jpeg}', { eager: true, query: '?url', import: 'default' })

// Stránka zostavená na zverejnenie (režim „artifact“) si dáta aj obrázky berie
// z databázy a úložiska hostiteľa, preto sa do nej nič súkromné nesmie dostať.
const bundled = import.meta.env.MODE !== 'artifact'

export const PRIVATE_PARAMS: ProjectParams | null = bundled ? (Object.values(found)[0] ?? null) : null

/** Pribalené obrázky: názov súboru → adresa. */
export const PRIVATE_MEDIA: Record<string, string> = bundled
  ? Object.fromEntries(Object.entries(images).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1), url]))
  : {}
