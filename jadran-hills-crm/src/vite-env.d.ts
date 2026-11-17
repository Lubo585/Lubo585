/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresa projektu Supabase (len web s vlastným prihlásením). */
  readonly VITE_SUPABASE_URL?: string
  /** Verejný kľúč projektu Supabase – smie byť v kóde stránky, dáta chránia pravidlá databázy. */
  readonly VITE_SUPABASE_KEY?: string
}
