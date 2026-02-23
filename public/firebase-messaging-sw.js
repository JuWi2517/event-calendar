importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCazl5U3d3dQcpdjisxb6e6IEX-lWWwl-Q",
  authDomain: "culture-calendar-4747b.firebaseapp.com",
  projectId: "culture-calendar-4747b",
  storageBucket: "culture-calendar-4747b.firebasestorage.app",
  messagingSenderId: "429183091950",
  appId: "1:429183091950:web:3bccdde2029247bb63dfff"
});

const messaging = firebase.messaging();

// PRIMARY handler — raw push event is the most reliable on mobile
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    return;
  }

  // FCM wraps data-only messages under payload.data
  const data = payload.data || {};
  const title = data.title || 'Nová notifikace';
  const body = data.body || '';
  const url = data.url || '/admin/dashboard';

  const options = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'admin-notification-' + Date.now(), // unique tag = no silent replacing
    renotify: true,
    requireInteraction: true, // keeps it visible until dismissed on mobile
    data: { url }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes('planujlouny.cz') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});