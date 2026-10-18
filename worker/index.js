/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals -- Workbox custom worker runs in the service worker global scope. */
// Remove caches created by the previous worker before accounts held private data.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all(
      ['apis', 'others', 'next-data', 'cross-origin'].map((name) => self.caches.delete(name)),
    ),
  );
});
