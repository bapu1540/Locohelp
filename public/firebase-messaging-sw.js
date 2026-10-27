/* eslint-disable no-undef */
// Firebase Cloud Messaging Background Service Worker for LocoHelp Web Push Notifications

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

let fcmMessagingInitialized = false;

try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

  const swFirebaseConfig = self.__FIREBASE_CONFIG__ || {
    apiKey: "AIzaSyDummyKeyForLocoHelpAuthInit2026",
    authDomain: "locohelp-app.firebaseapp.com",
    projectId: "locohelp-app",
    storageBucket: "locohelp-app.appspot.com",
    messagingSenderId: "1029384756",
    appId: "1:1029384756:web:abc123def456"
  };

  if (
    typeof firebase !== 'undefined' &&
    swFirebaseConfig.apiKey &&
    swFirebaseConfig.apiKey !== 'AIzaSyDummyKeyForLocoHelpAuthInit2026'
  ) {
    firebase.initializeApp(swFirebaseConfig);
    const messaging = firebase.messaging();
    fcmMessagingInitialized = true;

    messaging.onBackgroundMessage((payload) => {
      const notificationTitle =
        (payload && payload.notification && payload.notification.title) ||
        (payload && payload.data && payload.data.title) ||
        '🔔 New Local Request on LocoHelp!';
      const notificationBody =
        (payload && payload.notification && payload.notification.body) ||
        (payload && payload.data && payload.data.body) ||
        'Tap to view and help on LocoHelp';
      const targetUrl =
        (payload && payload.fcmOptions && payload.fcmOptions.link) ||
        (payload && payload.data && (payload.data.url || payload.data.click_action)) ||
        '/';

      const notificationOptions = {
        body: notificationBody,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: (payload && payload.data && payload.data.postId) || 'locohelp-local-request',
        renotify: true,
        data: {
          url: targetUrl,
          postId: (payload && payload.data && payload.data.postId) || ''
        }
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (err) {
  // Fallback to standard Web Push event listener below if compat scripts are unreachable
}

// Fallback push listener for data-only or standard Web Push payloads when Firebase compat isn't active
self.addEventListener('push', (event) => {
  if (fcmMessagingInitialized) {
    return;
  }
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title =
      (payload.notification && payload.notification.title) ||
      (payload.data && payload.data.title) ||
      '🔔 New Local Request on LocoHelp!';
    const body =
      (payload.notification && payload.notification.body) ||
      (payload.data && payload.data.body) ||
      'Tap to view and help on LocoHelp';
    const targetUrl =
      (payload.fcmOptions && payload.fcmOptions.link) ||
      (payload.data && (payload.data.url || payload.data.click_action)) ||
      '/';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: (payload.data && payload.data.postId) || 'locohelp-local-request',
        renotify: true,
        data: {
          url: targetUrl,
          postId: (payload.data && payload.data.postId) || ''
        }
      })
    );
  } catch (e) {
    // Ignore non-JSON push events
  }
});

// Handle notification click events: focus existing window or open post URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawTargetUrl =
    (event.notification && event.notification.data && event.notification.data.url) || '/';
  const targetUrl = new URL(rawTargetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            if ('navigate' in client) {
              client.navigate(targetUrl).catch(() => {});
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
