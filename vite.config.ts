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
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/dashboard/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-dashboard', expiration: { maxAgeSeconds: 300 } },
          },
          {
            urlPattern: /\/api\/grades/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-grades', expiration: { maxAgeSeconds: 60 } },
          },
          {
            urlPattern: /\/api\/schedule\/current-class/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-current-class', expiration: { maxAgeSeconds: 60 } },
          },
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
