/* Keeps St. John's on the device: pages open at once on the next visit and still open
   without a connection. Pages are always fetched fresh when there is a network; scripts,
   styles and images with a ?v= version never change, so the kept copy is used straight away. */
const KEEP = "sjs-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("sjs-") && k !== KEEP).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));

// One copy per file: a new ?v= replaces the old one.
async function keep(req, res) {
  if (!res || !res.ok || res.type !== "basic") return;
  const c = await caches.open(KEEP), u = new URL(req.url);
  if (u.searchParams.has("v")) (await c.keys()).forEach((k) => { const o = new URL(k.url); if (o.pathname === u.pathname && o.search !== u.search) c.delete(k); });
  await c.put(req, res);
}

// The page sends what it has just loaded; a page is kept under its address without ?id= or ?kid=.
self.addEventListener("message", (e) => {
  const urls = (e.data && e.data.keep) || [];
  e.waitUntil(Promise.all(urls.map(async (u) => {
    const url = new URL(u), page = !/\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.endsWith(".html"), key = page ? new Request(url.origin + url.pathname) : new Request(u);
    if (await caches.match(key)) return;
    try { await keep(key, await fetch(u)); } catch (err) {}
  })));
});

self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  // Pages: the network first, the kept copy when there is none (any ?id= or ?kid= opens the same page).
  if (r.mode === "navigate") {
    const key = new Request(u.origin + u.pathname);
    e.respondWith(fetch(r).then((res) => { e.waitUntil(keep(key, res.clone())); return res; }).catch(async () => (await caches.match(key)) || caches.match(new Request(u.origin + u.pathname.replace(/[^/]*$/, "login.html")))));
    return;
  }
  // Versioned files: the kept copy first.
  if (u.searchParams.has("v")) {
    e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => { e.waitUntil(keep(r, res.clone())); return res; })));
    return;
  }
  // Small images and icons: the network, falling back to the kept copy. Large files (the prospectus PDF) are left alone.
  if (!/\.(webp|svg|png|jpe?g|ico|webmanifest)$/.test(u.pathname)) return;
  e.respondWith(fetch(r).then((res) => { e.waitUntil(keep(r, res.clone())); return res; }).catch(() => caches.match(r)));
});
