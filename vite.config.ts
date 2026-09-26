import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// `npm run build` is the production build and ships no sourcemaps;
// `npm run build:debug` produces the same bundle with .map files.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', sourcemap: mode === 'debug' },
}))
