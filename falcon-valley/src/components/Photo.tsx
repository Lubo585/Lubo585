import { useEffect, useState, type ImgHTMLAttributes } from 'react'

const cache = new Map<string, Promise<boolean>>()

/** Overí, či sa obrázok dá načítať. Výsledok sa cache-uje na celú stránku. */
export function usePhotoAvailable(src: string | undefined) {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    if (!src) return
    let p = cache.get(src)
    if (!p) {
      p = new Promise<boolean>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img.naturalWidth > 1)
        img.onerror = () => resolve(false)
        img.src = src
      })
      cache.set(src, p)
    }
    let alive = true
    p.then((v) => alive && setOk(v))
    return () => {
      alive = false
    }
  }, [src])
  return src ? ok : false
}

/** Obrázok, ktorý sa pri chybe načítania sám skryje (fotka ešte nie je stiahnutá). */
export function Photo({ src, alt, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
  const ok = usePhotoAvailable(src)
  if (!ok) return null
  return <img src={src} alt={alt} {...rest} />
}
