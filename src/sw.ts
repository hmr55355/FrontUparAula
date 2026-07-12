/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

// Mismo runtime caching que antes generaba automáticamente `workbox: {...}`
// en vite.config.ts — se registra a mano porque la estrategia `injectManifest`
// (necesaria para los listeners `push`/`notificationclick` de abajo) no lee
// esa opción.
registerRoute(
  /\/api\/dashboard/,
  new NetworkFirst({ cacheName: 'api-dashboard', plugins: [new ExpirationPlugin({ maxAgeSeconds: 300 })] })
)
registerRoute(
  /\/api\/grades/,
  new NetworkFirst({ cacheName: 'api-grades', plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 })] })
)
registerRoute(
  /\/api\/schedule\/current-class/,
  new NetworkFirst({ cacheName: 'api-current-class', plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 })] })
)

self.addEventListener('push', (event) => {
  if (!event.data) return

  const payload = event.data.json() as { title: string; body: string; data?: Record<string, unknown> }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      data: payload.data ?? {},
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => 'focus' in c)
      if (existing) return existing.focus()
      return self.clients.openWindow('/dashboard')
    })
  )
})
