// Repartidor SuVaZu 1.10: actualización coherente y uso sin conexión.
const CACHE = 'suvazu-shell-v110';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg',
  './suvazu_logo.png', './parrillon_logo.png', './socio_parrillon.webp', './socio_caramelo.webp', './apps_icon.png',
  './app_didi.webp', './app_uber.webp', './app_rappi.webp', './app_indrive.webp',
  './asociados_logo.png', './home_repartidor.webp', './home_asociados.webp', './home_apps.webp'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Recargar los recursos de la red, sin reutilizar copias HTTP obsoletas.
    await Promise.all(SHELL.map(async url => {
      const request = new Request(url, {cache:'reload'});
      const response = await fetch(request);
      if (!response.ok) throw new Error('No se pudo preparar recurso: ' + url);
      await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('suvazu-shell-') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // En línea, priorizar la red para no volver a mostrar la versión anterior.
      const response = await fetch(new Request(request, {cache:'no-store'}));
      if (response.ok && new URL(request.url).pathname.startsWith(new URL(self.registration.scope).pathname)) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
