import type { Localized } from '../lib/lang'
import { asset } from '../lib/asset'

/**
 * Fotografie Vysokých Tatier (priečinok public/tatry/).
 *
 * Všetky sú voľne licencované (CC BY, CC BY-SA alebo CC0) z Flickru – autori sú
 * uvedení pri každej fotke a zobrazujú sa v pätičke. Fotky môžete kedykoľvek
 * nahradiť vlastnými: zachovajte názov súboru alebo upravte cestu nižšie.
 * Ak súbor chýba, stránka ho preskočí a použije ilustráciu.
 */
export type Season = 'summer' | 'autumn' | 'winter' | 'evening'

export type Photo = {
  src: string
  alt: Localized
  caption: Localized
  season: Season
  /** autor a licencia (povinné pri CC BY / CC BY-SA) */
  credit: string
  /** odkaz na pôvodnú fotku */
  source: string
}

export const seasonLabel: Record<Season, Localized> = {
  summer: { sk: 'Leto', en: 'Summer', ar: 'الصيف' },
  autumn: { sk: 'Jeseň', en: 'Autumn', ar: 'الخريف' },
  winter: { sk: 'Zima', en: 'Winter', ar: 'الشتاء' },
  evening: { sk: 'Večer', en: 'Evening', ar: 'المساء' },
}

const GOVISITY = 'Govisity / Tip na Trip, CC BY 2.0'
const JUHELE = 'Juhele_CZ, CC0'

export const photos = {
  hero: {
    src: asset('tatry/hero.jpg'),
    alt: { sk: 'Popradské pleso a štíty Vysokých Tatier v lete', en: 'Popradské pleso and High Tatras peaks in summer', ar: 'بحيرة بوبرادسكي وقمم تاترا العليا في الصيف' },
    caption: { sk: 'Popradské pleso', en: 'Popradské pleso', ar: 'بحيرة بوبرادسكي' },
    season: 'summer',
    credit: 'Sjaak Kempe, CC BY 2.0',
    source: 'https://www.flickr.com/photos/sjaakkempe/48537981191/',
  },
  valley: {
    src: asset('tatry/valley.jpg'),
    alt: { sk: 'Zasnežené štíty z Kriváňa', en: 'Snow-covered peaks from Kriváň', ar: 'قمم مكسوة بالثلج من كريفان' },
    caption: { sk: 'Pohľad z Kriváňa v zime', en: 'View from Kriváň in winter', ar: 'إطلالة من كريفان في الشتاء' },
    season: 'winter',
    credit: GOVISITY,
    source: 'https://www.flickr.com/photos/53113704@N03/50527158783/',
  },
  story: [
    {
      src: asset('tatry/story-leto.jpg'),
      alt: { sk: 'Letná dolina vo Vysokých Tatrách', en: 'Summer valley in the High Tatras', ar: 'وادٍ صيفي في جبال تاترا العليا' },
      caption: { sk: 'Dolina v lete', en: 'The valley in summer', ar: 'الوادي في الصيف' },
      season: 'summer',
      credit: 'young shanahan, CC BY 2.0',
      source: 'https://www.flickr.com/photos/youngshanahan/50087442817/',
    },
    {
      src: asset('tatry/story-jesen.jpg'),
      alt: { sk: 'Skalnaté pleso s prvým snehom na jeseň', en: 'Skalnaté pleso with the first autumn snow', ar: 'بحيرة سكالناتي مع أول ثلوج الخريف' },
      caption: { sk: 'Skalnaté pleso, prvý sneh', en: 'Skalnaté pleso, first snow', ar: 'بحيرة سكالناتي، أول الثلج' },
      season: 'autumn',
      credit: JUHELE,
      source: 'https://www.flickr.com/photos/96541566@N06/52425709601/',
    },
    {
      src: asset('tatry/story-zima.jpg'),
      alt: { sk: 'Zasnežený hrebeň Kriváňa', en: 'Snow-covered ridge of Kriváň', ar: 'سلسلة كريفان المكسوة بالثلج' },
      caption: { sk: 'Kriváň v zime', en: 'Kriváň in winter', ar: 'كريفان في الشتاء' },
      season: 'winter',
      credit: GOVISITY,
      source: 'https://www.flickr.com/photos/53113704@N03/50527144098/',
    },
    {
      src: asset('tatry/story-vecer.jpg'),
      alt: { sk: 'Popradské pleso za súmraku', en: 'Popradské pleso at dusk', ar: 'بحيرة بوبرادسكي عند الغسق' },
      caption: { sk: 'Popradské pleso za súmraku', en: 'Popradské pleso at dusk', ar: 'بحيرة بوبرادسكي عند الغسق' },
      season: 'evening',
      credit: 'rhysbter33, CC BY-SA 2.0',
      source: 'https://www.flickr.com/photos/190185145@N06/50348073318/',
    },
  ],
  gallery: [
    {
      src: asset('tatry/g-vychodna-vysoka.jpg'),
      alt: { sk: 'Panoráma z Východnej Vysokej', en: 'Panorama from Východná Vysoká', ar: 'بانوراما من قمة فيخودنا فيسوكا' },
      caption: { sk: 'Východná Vysoká, 2 428 m', en: 'Východná Vysoká, 2,428 m', ar: 'فيخودنا فيسوكا، 2428 م' },
      season: 'summer',
      credit: GOVISITY,
      source: 'https://www.flickr.com/photos/53113704@N03/50384413863/',
    },
    {
      src: asset('tatry/g-zima-panorama.jpg'),
      alt: { sk: 'Zimná panoráma Tatier so zasneženým lesom', en: 'Winter panorama of the Tatras with snowy forest', ar: 'بانوراما شتوية لجبال تاترا مع غابة مثلجة' },
      caption: { sk: 'Zimná panoráma Tatier', en: 'Winter panorama of the Tatras', ar: 'بانوراما تاترا الشتوية' },
      season: 'winter',
      credit: 'WDnet Studio Creation, CC BY 4.0',
      source: 'https://www.flickr.com/photos/andrewsiwiec/55032519201/',
    },
    {
      src: asset('tatry/g-jesen-les.jpg'),
      alt: { sk: 'Jesenné podhorie Tatier', en: 'Autumn foothills of the Tatras', ar: 'سفوح تاترا في الخريف' },
      caption: { sk: 'Jesenné podhorie', en: 'Autumn foothills', ar: 'السفوح في الخريف' },
      season: 'autumn',
      credit: JUHELE,
      source: 'https://www.flickr.com/photos/96541566@N06/52407174041/',
    },
    {
      src: asset('tatry/g-popradske-zima.jpg'),
      alt: { sk: 'Zamrznuté Popradské pleso', en: 'Frozen Popradské pleso', ar: 'بحيرة بوبرادسكي المتجمدة' },
      caption: { sk: 'Popradské pleso v zime', en: 'Popradské pleso in winter', ar: 'بحيرة بوبرادسكي في الشتاء' },
      season: 'winter',
      credit: 'VicunaR, CC BY-SA 2.0',
      source: 'https://www.flickr.com/photos/144510328@N03/54279941021/',
    },
    {
      src: asset('tatry/g-popradske-leto.jpg'),
      alt: { sk: 'Popradské pleso v lete', en: 'Popradské pleso in summer', ar: 'بحيرة بوبرادسكي في الصيف' },
      caption: { sk: 'Popradské pleso, 1 494 m', en: 'Popradské pleso, 1,494 m', ar: 'بحيرة بوبرادسكي، 1494 م' },
      season: 'summer',
      credit: GOVISITY,
      source: 'https://www.flickr.com/photos/53113704@N03/33438367106/',
    },
    {
      src: asset('tatry/g-luka-jesen.jpg'),
      alt: { sk: 'Lúka pod Tatrami na jeseň', en: 'Meadow below the Tatras in autumn', ar: 'مرج أسفل تاترا في الخريف' },
      caption: { sk: 'Lúky pod Tatrami', en: 'Meadows below the Tatras', ar: 'مروج أسفل تاترا' },
      season: 'autumn',
      credit: JUHELE,
      source: 'https://www.flickr.com/photos/96541566@N06/52402274504/',
    },
    {
      src: asset('tatry/g-krivan-oblaky.jpg'),
      alt: { sk: 'Zasnežený hrebeň nad morom oblakov', en: 'Snowy ridge above a sea of clouds', ar: 'سلسلة مثلجة فوق بحر من الغيوم' },
      caption: { sk: 'Kriváň nad oblakmi', en: 'Kriváň above the clouds', ar: 'كريفان فوق الغيوم' },
      season: 'winter',
      credit: GOVISITY,
      source: 'https://www.flickr.com/photos/53113704@N03/50528040077/',
    },
    {
      src: asset('tatry/story-jesen.jpg'),
      alt: { sk: 'Skalnaté pleso s prvým snehom', en: 'Skalnaté pleso with first snow', ar: 'بحيرة سكالناتي مع أول الثلج' },
      caption: { sk: 'Skalnaté pleso, 1 751 m', en: 'Skalnaté pleso, 1,751 m', ar: 'بحيرة سكالناتي، 1751 م' },
      season: 'autumn',
      credit: JUHELE,
      source: 'https://www.flickr.com/photos/96541566@N06/52425709601/',
    },
  ],
} satisfies { hero: Photo; valley: Photo; story: Photo[]; gallery: Photo[] }

export const allPhotos: Photo[] = [photos.hero, photos.valley, ...photos.story, ...photos.gallery]
