/* Service worker: cachea assets pesados (modelos GLB, texturas, draco) para
   que el juego cargue UNA vez y quede guardado — visitas siguientes al toque
   y sin trabas por red lenta. El código JS/HTML NO se cachea (siempre fresco). */
const CACHE = 'patrulla-assets-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = e.request.url;
  const cacheable = /\.(glb|gltf|png|jpg|jpeg|webp|wasm)(\?|$)/i.test(u) || u.includes('/draco/');
  if (!cacheable) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res && res.ok) c.put(e.request, res.clone());
      return res;
    })
  );
});
