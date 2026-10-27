// Service worker de Vencito: la app y sus datos se guardan en el dispositivo para funcionar sin conexión.
const VERSION = 'vencito-pwa-34';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'i18n.js', 'icons.js', 'dateparser.js', 'scan.js', 'receipt.js', 'recipes.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', '../assets/img/icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero la red (para recibir versiones nuevas) y, sin conexión, lo guardado.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
