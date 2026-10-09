// Lets the installed app open offline. Pages are fetched fresh when online (falling back to the
// saved copy offline); pictures and fonts are saved the first time they're seen.
const CACHE = "cookbook-v1";
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "manifest.webmanifest", "icons/icon-192.png"])).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./", copy)); return res; }).catch(() => caches.match("./")));
    return;
  }
  const keep = url.origin === location.origin ? /\/(images|photos|icons)\//.test(url.pathname) : /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!keep) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
});
