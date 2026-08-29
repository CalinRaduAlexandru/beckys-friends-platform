const CACHE = 'music-for-kids-v3';
const APP_SHELL = [
  '/music-for-kids/',
  '/music-for-kids/parent',
  '/music-for-kids/styles.css?v=1',
  '/music-for-kids/app.js?v=2',
  '/music-for-kids/parent.js?v=2',
  '/music-for-kids/data/tracks.js',
  '/music-for-kids/lib/store.js',
  '/music-for-kids/lib/provider.js',
  '/music-for-kids/lib/pwa.js',
  '/music-for-kids/manifest.webmanifest',
  '/music-for-kids/icons/icon.svg',
  '/music-for-kids/icons/icon-maskable.svg',
  '/music-for-kids/icons/icon-192.png',
  '/music-for-kids/icons/icon-512.png',
  '/music-for-kids/icons/icon-maskable-512.png',
];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('music-for-kids-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    const fallback = url.pathname === '/music-for-kids/parent' ? '/music-for-kids/parent' : '/music-for-kids/';
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(fallback,copy)); return response; }).catch(() => caches.match(fallback)));
    return;
  }
  if (!url.pathname.startsWith('/music-for-kids/')) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok) { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); } return response; })));
});
