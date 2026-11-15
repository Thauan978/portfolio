const CACHE = 'terminal-static-v1';
const FILES = ['./','index.html','style.css','player.css','app.js','player.js','player-position.js','music-catalog.json','assets/music/orbitas.mp3','assets/music/neon-noturno.mp3','assets/music/ondas-digitais.mp3'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('terminal-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let response;
    if (request.headers.has('range')) {
      response = await cache.match(url.href);
      if (!response) return fetch(request);
      const bytes = await response.arrayBuffer();
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range'));
      if (!match || (!match[1] && !match[2])) return fetch(request);
      const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.byteLength - 1) : bytes.byteLength - 1;
      if (start > end || start >= bytes.byteLength) return new Response(null, {status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
      return new Response(bytes.slice(start,end+1), {status:206,headers:{'Content-Type':response.headers.get('Content-Type') || 'audio/mpeg','Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
    }
    try {
      response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      response = await cache.match(request);
      if (!response && request.mode === 'navigate') response = await cache.match(new URL('index.html', self.registration.scope));
      return response || new Response('Conteúdo ainda não disponível offline.', {status:503});
    }
  })());
});
