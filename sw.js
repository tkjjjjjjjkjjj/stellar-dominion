const CACHE = "stellar-dominion-v9";
const ASSETS = [
  "./", "./index.html", "./styles.css", "./manifest.webmanifest",
  "./js/app.js", "./js/game-core.js", "./js/art.js", "./js/audio.js", "./js/fx.js",
  "./assets/icon.svg", "./assets/icon-180.png", "./assets/icon-192.png", "./assets/icon-512.png",
  "./assets/fonts/chakra-petch-600.woff2", "./assets/fonts/chakra-petch-700.woff2", "./assets/fonts/mplus1-800-subset.woff2",
];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => caches.match("./index.html"))));
});
