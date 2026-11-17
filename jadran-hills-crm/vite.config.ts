/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const root = fileURLToPath(new URL('.', import.meta.url))

// `vite build --mode single` zabalí celú aplikáciu do jedného HTML súboru
// (dist-single/index.html) – dá sa otvoriť priamo z disku alebo poslať e-mailom.
// `vite build --mode artifact` robí to isté bez súkromných dát; z výsledku potom
// scripts/build-artifact.mjs pripraví stránku na zverejnenie u hostiteľa.
// `vite build --mode web` zostaví verejný web (dist-web): prezentačnú stránku projektu
// a pod adresou /crm/ aplikáciu s vlastným prihlásením nad databázou Supabase.
export default defineConfig(({ mode }) => {
  const test = { environment: 'node' as const, include: ['src/**/*.test.ts', 'private/**/*.test.ts'] }

  if (mode === 'web') {
    return {
      root: resolve(root, 'web'),
      base: './',
      envDir: root,
      publicDir: resolve(root, 'web/public'),
      plugins: [react(), tailwindcss()],
      // Verejný web nesmie pribaliť nič zo súkromného priečinka – modul so súkromnými
      // východiskovými dátami sa nahrádza prázdnym.
      resolve: { alias: [{ find: /^(\.\.?\/)+data\/seed$/, replacement: resolve(root, 'src/data/seed.none.ts') }] },
      build: {
        outDir: resolve(root, 'dist-web'),
        emptyOutDir: true,
        chunkSizeWarningLimit: 900,
        rollupOptions: { input: { index: resolve(root, 'web/index.html'), crm: resolve(root, 'web/crm/index.html') } },
      },
      server: { fs: { allow: [root] } },
      test,
    }
  }

  const oneFile = mode === 'single' || mode === 'artifact'
  return {
    base: './',
    plugins: [react(), tailwindcss(), ...(oneFile ? [viteSingleFile()] : [])],
    build: oneFile ? { outDir: mode === 'artifact' ? 'dist-artifact' : 'dist-single' } : {},
    test,
  }
})
