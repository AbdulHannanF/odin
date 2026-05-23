import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api':  { target: 'http://62.84.187.126:4005', changeOrigin: true },
      '/mock': { target: 'http://62.84.187.126:4005', changeOrigin: true },
      '/ws':   { target: 'ws://62.84.187.126:4005', ws: true, changeOrigin: true },
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
