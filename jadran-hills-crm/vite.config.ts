/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode single` zabalí celú aplikáciu do jedného HTML súboru
// (dist-single/index.html) – dá sa otvoriť priamo z disku alebo poslať e-mailom.
// `vite build --mode artifact` robí to isté bez súkromných dát; z výsledku potom
// scripts/build-artifact.mjs pripraví stránku na zverejnenie u hostiteľa.
export default defineConfig(({ mode }) => {
  const oneFile = mode === 'single' || mode === 'artifact'
  return {
    base: './',
    plugins: [react(), tailwindcss(), ...(oneFile ? [viteSingleFile()] : [])],
    build: oneFile ? { outDir: mode === 'artifact' ? 'dist-artifact' : 'dist-single' } : {},
    test: { environment: 'node', include: ['src/**/*.test.ts', 'private/**/*.test.ts'] },
  }
})
