import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api':  { target: 'http://localhost:8000', changeOrigin: true },
      '/mock': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws':   { target: 'ws://localhost:8000', ws: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 2048,
    target: 'esnext',
  },
  esbuild: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
})
