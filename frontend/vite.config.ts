import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
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
