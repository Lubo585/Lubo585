import type { Localized } from '../lib/lang'

/**
 * Fotografie Vysokých Tatier.
 *
 * Súbory patria do priečinka public/tatry/. Stiahnete ich príkazom `npm run photos`
 * (skript scripts/download-tatry-photos.sh) alebo nahradíte vlastnými fotkami
 * s rovnakými názvami. Ak súbor chýba, stránka ho ticho preskočí a použije ilustráciu.
 */
export type Photo = {
  src: string
  alt: Localized
  caption: Localized
  /** autor a licencia – pri fotkách z Wikimedia Commons povinné (CC BY-SA) */
  credit?: string
}

export const photos = {
  hero: {
    src: '/tatry/hero.jpg',
    alt: { sk: 'Štíty Vysokých Tatier nad Štrbským plesom', en: 'High Tatras peaks above Štrbské pleso' },
    caption: { sk: 'Štrbské pleso', en: 'Štrbské pleso' },
    credit: 'Ingo Mehling, CC BY-SA 4.0, Wikimedia Commons',
  },
  valley: {
    src: '/tatry/strbske-pleso-sunset.jpg',
    alt: { sk: 'Štrbské pleso pri západe slnka', en: 'Štrbské pleso at sunset' },
    caption: { sk: 'Štrbské pleso pri západe slnka', en: 'Štrbské pleso at sunset' },
    credit: 'Timothy Langer, CC BY-SA 4.0, Wikimedia Commons',
  },
  story: [
    {
      src: '/tatry/zabia-dolina.jpg',
      alt: { sk: 'Žabia dolina Mengusovská', en: 'Žabia dolina valley' },
      caption: { sk: 'Žabia dolina Mengusovská', en: 'Žabia dolina' },
      credit: 'Adam Opioła, CC BY-SA 4.0, Wikimedia Commons',
    },
    {
      src: '/tatry/popradske-pleso.jpg',
      alt: { sk: 'Popradské pleso', en: 'Popradské pleso lake' },
      caption: { sk: 'Popradské pleso', en: 'Popradské pleso' },
      credit: 'Michal Klajban, CC BY-SA 3.0, Wikimedia Commons',
    },
    {
      src: '/tatry/velka-studena-dolina.jpg',
      alt: { sk: 'Veľká Studená dolina', en: 'Veľká Studená dolina valley' },
      caption: { sk: 'Veľká Studená dolina', en: 'Veľká Studená dolina' },
      credit: 'Marcin Białek, CC BY-SA 4.0, Wikimedia Commons',
    },
    {
      src: '/tatry/gerlach.jpg',
      alt: { sk: 'Gerlachovský štít od Tatranskej Polianky', en: 'Gerlachovský štít from Tatranská Polianka' },
      caption: { sk: 'Gerlachovský štít, 2 655 m', en: 'Gerlachovský štít, 2,655 m' },
      credit: 'Pavol Svetoň, CC BY-SA 4.0, Wikimedia Commons',
    },
  ],
  gallery: [
    {
      src: '/tatry/krivan.jpg',
      alt: { sk: 'Kriváň', en: 'Kriváň peak' },
      caption: { sk: 'Kriváň, 2 494 m', en: 'Kriváň, 2,494 m' },
      credit: 'Jozef Kotulič, CC BY-SA 4.0, Wikimedia Commons',
    },
    {
      src: '/tatry/strbske-pleso-aerial.jpg',
      alt: { sk: 'Štrbské pleso z výšky', en: 'Štrbské pleso from above' },
      caption: { sk: 'Štrbské pleso', en: 'Štrbské pleso' },
      credit: 'VargaA, CC BY-SA 4.0, Wikimedia Commons',
    },
    {
      src: '/tatry/mengusovska-dolina.jpg',
      alt: { sk: 'Mengusovská dolina', en: 'Mengusovská dolina valley' },
      caption: { sk: 'Mengusovská dolina', en: 'Mengusovská dolina' },
      credit: 'Michal Klajban, CC BY-SA 3.0, Wikimedia Commons',
    },
    {
      src: '/tatry/gerlach-panorama.jpg',
      alt: { sk: 'Panoráma Gerlachovského štítu', en: 'Gerlachovský štít panorama' },
      caption: { sk: 'Gerlachovský štít', en: 'Gerlachovský štít' },
      credit: 'Paweł Opioła, CC BY-SA 4.0, Wikimedia Commons',
    },
    {
      src: '/tatry/velka-studena-dolina.jpg',
      alt: { sk: 'Veľká Studená dolina', en: 'Veľká Studená dolina valley' },
      caption: { sk: 'Veľká Studená dolina', en: 'Veľká Studená dolina' },
      credit: 'Marcin Białek, CC BY-SA 4.0, Wikimedia Commons',
    },
    {
      src: '/tatry/zabia-dolina.jpg',
      alt: { sk: 'Žabia dolina Mengusovská', en: 'Žabia dolina valley' },
      caption: { sk: 'Žabia dolina', en: 'Žabia dolina' },
      credit: 'Adam Opioła, CC BY-SA 4.0, Wikimedia Commons',
    },
  ],
} satisfies { hero: Photo; valley: Photo; story: Photo[]; gallery: Photo[] }

export const allPhotos: Photo[] = [photos.hero, photos.valley, ...photos.story, ...photos.gallery]
