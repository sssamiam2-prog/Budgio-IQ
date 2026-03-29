/* global self */
self.addEventListener('push', (event) => {
  let data = { title: 'Budgio IQ', body: 'Reminder' }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { title: parsed.title ?? data.title, body: parsed.body ?? data.body }
    }
  } catch {
    if (event.data) data.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/branding/Budgio_IQ_Icon-removebg-preview.png',
      badge: '/branding/Budgio_IQ_Icon-removebg-preview.png',
      data: { url: '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length) {
        clientList[0].focus()
        return
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    }),
  )
})
