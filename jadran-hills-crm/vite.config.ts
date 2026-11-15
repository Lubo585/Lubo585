/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode single` zabalí celú aplikáciu do jedného HTML súboru
// (dist-single/index.html) – dá sa otvoriť priamo z disku alebo poslať e-mailom.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: mode === 'single' ? { outDir: 'dist-single' } : {},
  test: { environment: 'node', include: ['src/**/*.test.ts', 'private/**/*.test.ts'] },
}))
