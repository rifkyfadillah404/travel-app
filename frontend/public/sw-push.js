// Service Worker for Push Notifications

self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push received:', event);

    let notificationData = {
        title: 'ITJ Travel',
        body: 'Anda memiliki notifikasi baru',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: { url: '/' }
    };

    if (event.data) {
        try {
            notificationData = { ...notificationData, ...event.data.json() };
        } catch (e) {
            notificationData.body = event.data.text();
        }
    }

    const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        vibrate: [100, 50, 100, 50, 100], // Vibration pattern
        data: notificationData.data,
        tag: notificationData.tag || 'default',
        requireInteraction: notificationData.requireInteraction || false,
        actions: notificationData.type === 'panic' ? [
            { action: 'view', title: 'Lihat Lokasi' },
            { action: 'dismiss', title: 'Tutup' }
        ] : []
    };

    event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification click:', event);

    event.notification.close();

    let url = '/';
    if (event.notification.data && event.notification.data.url) {
        url = event.notification.data.url;
    }

    if (event.action === 'view' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(function (clientList) {
                    // Check if there's already a window open
                    for (let i = 0; i < clientList.length; i++) {
                        const client = clientList[i];
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            client.navigate(url);
                            return client.focus();
                        }
                    }
                    // Open a new window if none exists
                    if (clients.openWindow) {
                        return clients.openWindow(url);
                    }
                })
        );
    }
});

// Handle service worker installation
self.addEventListener('install', function (event) {
    console.log('[Service Worker] Installing...');
    self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', function (event) {
    console.log('[Service Worker] Activating...');
    event.waitUntil(clients.claim());
});
