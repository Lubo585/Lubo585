// Rozšírenia podľa prostredia, v ktorom aplikácia beží.
//
// Moduly aplikácie nevedia, kde bežia. Čo je špecifické pre web s vlastným
// prihlásením – účet používateľa, správa prístupov, dopyty z verejnej stránky –
// dostanú cez tento kontext; v ostatných režimoch ostáva prázdny.

import type { LucideIcon } from 'lucide-react'
import { createContext, useContext, type ReactNode } from 'react'

export type Role = 'owner' | 'editor' | 'viewer'

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Vlastník',
  editor: 'Môže upravovať',
  viewer: 'Len na čítanie',
}

export interface Account {
  name: string
  email: string
  role: Role
  signOut(): void
}

export interface ExtraPage {
  id: string
  label: string
  icon: LucideIcon
  group: string
  page: ReactNode
  /** Počet položiek, ktoré čakajú na pozornosť (zobrazí sa pri názve v menu). */
  badge?: number
}

export interface Extensions {
  account?: Account
  pages?: ExtraPage[]
  /** Karty v Nastaveniach namiesto všeobecnej informácie o prihlásení. */
  settings?: ReactNode
  /** Adresa verejnej stránky projektu. */
  siteHref?: string
}

export const ExtensionsContext = createContext<Extensions>({})

export function useExtensions(): Extensions {
  return useContext(ExtensionsContext)
}
