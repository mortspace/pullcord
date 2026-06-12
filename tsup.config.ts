import { copyFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', 'motion'],
  // the stylesheet ships alongside, imported by consumers via 'pullcord/pullcord.css'
  onSuccess: async () => {
    copyFileSync('pullcord.css', 'dist/pullcord.css')
  },
})
