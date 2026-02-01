// Self-destroying service worker
// Replaces old React app SW, clears caches, then unregisters itself
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.registration.unregister();
  caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
});
