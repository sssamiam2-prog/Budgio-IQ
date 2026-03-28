import { supabase } from './supabase'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

export async function subscribeAndSavePush(userId: string): Promise<string | null> {
  if (!supabase) return 'Not configured'
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!vapid?.trim()) {
    return 'VITE_VAPID_PUBLIC_KEY is missing. Generate keys (see .env.example) and redeploy.'
  }
  if (Notification.permission === 'denied') {
    return 'Notifications are blocked in the browser. Enable them in site settings.'
  }
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission()
    if (p !== 'granted') return 'Permission not granted.'
  }

  const reg = await registerServiceWorker()
  if (!reg) return 'Could not register service worker.'

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid.trim()) as BufferSource,
  })

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return 'Invalid push subscription.'
  }

  const row = {
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent.slice(0, 512),
  }

  const { error } = await supabase.from('push_subscriptions').upsert(row, {
    onConflict: 'user_id,endpoint',
  })

  if (error) return error.message
  return null
}

export async function removePushSubscriptions(userId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('push_subscriptions').delete().eq('user_id', userId)
}
