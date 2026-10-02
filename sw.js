// Network-first: online players always get the latest deploy (revalidated past the HTTP cache),
// the cache is only a fallback so the game still starts offline.
const CACHE = "stellar-dominion-v11";
const ASSETS = [
  "./", "./index.html", "./styles.css", "./manifest.webmanifest",
  "./js/app.js", "./js/game-core.js", "./js/art.js", "./js/audio.js", "./js/fx.js", "./js/view-cache.js",
  "./assets/icon.svg", "./assets/icon-180.png", "./assets/icon-192.png", "./assets/icon-512.png",
  "./assets/fonts/chakra-petch-600.woff2", "./assets/fonts/chakra-petch-700.woff2", "./assets/fonts/mplus1-800-subset.woff2",
];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(url => new Request(url, { cache: "reload" })))).then(() => self.skipWaiting())));
// When replacing an older version, reload open pages so they don't keep running stale code
// (older releases served everything cache-first, so their pages can't pick up updates themselves).
self.addEventListener("activate", e => e.waitUntil((async () => {
  const stale = (await caches.keys()).filter(k => k !== CACHE);
  await Promise.all(stale.map(k => caches.delete(k)));
  await self.clients.claim();
  if (!stale.length) return;
  const pages = await self.clients.matchAll({ type: "window" });
  // not awaited: the reload's own request is handled by this worker only once activation has finished
  pages.forEach(page => page.navigate(page.url).catch(() => {}));
})()));
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const fresh = req.mode === "navigate" ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req, { cache: "no-cache" });
  e.respondWith(fresh.then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))));
});
