// Service Worker — SOS Venezuela
// Objetivo en emergencia: que la app abra aunque no haya red.
//  - Navegaciones: network-first con fallback al shell cacheado (offline.html).
//  - Assets propios (JS/CSS/_next, iconos): stale-while-revalidate.
//  - Teselas del mapa (OpenStreetMap): cache-first con tope, para que el
//    último mapa visto siga disponible sin red.
// No cacheamos peticiones a Supabase (datos en vivo); esas usan la cola offline.

const VERSION = 'sosv-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const TILE_CACHE = `${VERSION}-tiles`;
const TILE_MAX = 300; // teselas máximas guardadas

const SHELL_URLS = ['/', '/sos', '/mapa', '/buscar', '/estoy-bien', '/offline.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll falla entero si una sola URL falla; usamos add individual tolerante.
      Promise.all(SHELL_URLS.map((u) => cache.add(u).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isTile(url) {
  return /tile\.openstreetmap\.org/.test(url.hostname) || /\.tile\./.test(url.hostname);
}

function isSupabase(url) {
  return url.hostname.endsWith('.supabase.co');
}

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  // borra las más viejas (orden de inserción)
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Datos en vivo de Supabase: siempre red, nunca cache (la cola maneja offline).
  if (isSupabase(url)) return;

  // Teselas del mapa: cache-first con tope.
  if (isTile(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) {
            cache.put(request, res.clone());
            trimCache(TILE_CACHE, TILE_MAX);
          }
          return res;
        } catch {
          return hit ?? Response.error();
        }
      })
    );
    return;
  }

  // Navegaciones (HTML): network-first, fallback al shell cacheado.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, res.clone());
          return res;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match(request)) || (await cache.match('/offline.html')) || Response.error();
        }
      })()
    );
    return;
  }

  // Assets propios (_next, iconos, css/js): stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        const fetching = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fetching;
      })
    );
  }
});
