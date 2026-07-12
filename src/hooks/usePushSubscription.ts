import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { pushApi } from '@/services/api/push'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Activar/desactivar el widget push de "clase en curso" (módulo 18 —
 * Notificaciones, toggle de Web Push). Requiere que el service worker
 * (src/sw.ts, estrategia injectManifest) ya esté registrado.
 */
export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window

  useEffect(() => {
    if (!isSupported) return
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setIsSubscribed(!!subscription))
  }, [isSupported])

  const subscribe = async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Debes conceder permiso de notificaciones en el navegador.')
        return
      }

      const { publicKey } = await pushApi.vapidPublicKey()
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      await pushApi.subscribe(subscription.toJSON() as PushSubscriptionJSON)
      setIsSubscribed(true)
      toast.success('Notificaciones push activadas.')
    } catch {
      toast.error('No pudimos activar las notificaciones push.')
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await pushApi.unsubscribe(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setIsSubscribed(false)
      toast.success('Notificaciones push desactivadas.')
    } finally {
      setLoading(false)
    }
  }

  return { isSupported, isSubscribed, loading, subscribe, unsubscribe }
}
