// Talk2Me Service Worker Self-Purge & Unregister
// This script purges all obsolete caches and cleanly unregisters itself
// to ensure users always receive fresh Next.js builds directly from Vercel.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[Service Worker] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Service Worker] Unregistering service worker to restore native networking...');
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        });
      });
    })
  );
});

// NOTE: No fetch listener is registered.
// All requests (Next.js chunks, RSC, APIs, navigation) are handled natively by the browser.
