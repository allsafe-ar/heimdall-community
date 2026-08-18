import path from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// La versión sale del package.json: un solo lugar para bumpear, sin desfasaje
// entre lo que muestra la interfaz y lo que reporta el proceso.
const pkg = createRequire(import.meta.url)('./package.json')

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), tailwindcss()],
  base: '/heimdall/',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5180,
    proxy: {
      '/heimdall': 'http://localhost:3005',
      '/socket.io': { target: 'http://localhost:3005', ws: true },
    },
  },
})
