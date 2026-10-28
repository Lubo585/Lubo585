import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'sk' | 'en' | 'ar'
export type Localized = { sk: string; en: string; ar: string }

export const LANGS: Lang[] = ['sk', 'en', 'ar']

type LangCtx = {
  lang: Lang
  rtl: boolean
  setLang: (l: Lang) => void
  t: (v: Localized) => string
}

const Ctx = createContext<LangCtx>({ lang: 'sk', rtl: false, setLang: () => {}, t: (v) => v.sk })

function initial(): Lang {
  try {
    const saved = localStorage.getItem('fv-lang')
    if (saved === 'sk' || saved === 'en' || saved === 'ar') return saved
  } catch {
    /* ignore */
  }
  const nav = navigator.language?.toLowerCase() ?? ''
  if (nav.startsWith('sk') || nav.startsWith('cs')) return 'sk'
  if (nav.startsWith('ar')) return 'ar'
  return 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('fv-lang', l)
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])
  const value = useMemo<LangCtx>(() => ({ lang, rtl: lang === 'ar', setLang, t: (v) => v[lang] }), [lang, setLang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLang() {
  return useContext(Ctx)
}
