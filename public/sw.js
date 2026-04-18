// Simple Service Worker for PWA Installability
const CACHE_NAME = 'momentum-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now to satisfy Chrome's PWA requirements
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
