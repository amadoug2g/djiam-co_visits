/* Service worker : rend l'application utilisable sans réseau (rendez-vous sans connexion).
   Généré au build par vite.config.ts, qui y insère la version et la liste des fichiers. */
const CACHE = 'villa-' + 'd0707c12af0d';
const FILES = ["./","apple-touch-icon.png","assets/engine-BOFp4Q4w.js","assets/index-CphQ7efc.css","assets/index-CsRlPI3v.js","assets/instrument-serif-latin-400-normal-BVbkICAY.woff","assets/instrument-serif-latin-400-normal-DnYpCC2O.woff2","assets/inter-latin-400-normal-C38fXH4l.woff2","assets/inter-latin-400-normal-CyCys3Eg.woff","assets/inter-latin-500-normal-BL9OpVg8.woff","assets/inter-latin-500-normal-Cerq10X2.woff2","assets/inter-latin-600-normal-CiBQ2DWP.woff","assets/inter-latin-600-normal-LgqL8muc.woff2","bake/m3.bin","bake/m3.json","favicon-32.png","icon-192.png","icon-512.png","icon.svg","manifest.webmanifest","og.jpg"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('villa-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  /* page : réseau d'abord (dernière version), cache si hors ligne */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./', copy)); return res; })
      .catch(() => caches.match('./', { ignoreVary: true })));
    return;
  }
  /* fichiers versionnés : cache d'abord */
  e.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then(hit => hit || fetch(req)));
});
