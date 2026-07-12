import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // El SW propio no usa el bloque `workbox: {...}` de abajo (ese solo
        // aplica a la estrategia generateSW) — el runtime caching se registra
        // a mano en src/sw.ts con las mismas rutas.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      },
      manifest: {
        name: 'UparAula',
        short_name: 'UparAula',
        description: 'Gestión educativa docente by UparTechnology',
        theme_color: '#1565C0',
        background_color: '#F5F5F5',
        display: 'standalone',
        start_url: '/dashboard',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
