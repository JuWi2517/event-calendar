importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCazl5U3d3dQcpdjisxb6e6IEX-lWWwl-Q",
    authDomain: "culture-calendar-4747b.firebaseapp.com",
    projectId: "culture-calendar-4747b",
    storageBucket: "culture-calendar-4747b.firebasestorage.app",
    messagingSenderId: "429183091950",
    appId: "1:429183091950:web:"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

    const { title, body, url } = payload.data;

    const notificationOptions = {
        body: body,
        icon: '/favicon.svg',
        tag: 'admin-notification-tag',
        renotify: true,
        data: { url: url || '/admin/dashboard' }
    };

    self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});