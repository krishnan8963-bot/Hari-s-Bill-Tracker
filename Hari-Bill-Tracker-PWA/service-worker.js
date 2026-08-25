/*
  Hari's Bill Tracker - Service Worker
  Provides offline support by caching the app shell (HTML, manifest, icons).
  All bill/payment data still lives in the browser's localStorage on the
  device - this file only makes the app itself load without internet.
*/

const CACHE_NAME = "hari-bill-tracker-cache-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png"
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches from previous versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, falling back to network,
// and caching same-origin GET responses as they come in.
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((networkResponse) => {
          // Only cache successful, same-origin responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            new URL(req.url).origin === self.location.origin
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached - if it's a navigation request,
          // fall back to the cached app shell page.
          if (req.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
