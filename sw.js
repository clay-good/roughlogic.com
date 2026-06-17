// roughlogic service worker.
// Cache-first for the application shell; cache-on-first-fetch for data shards.
// The shell is an ATOMIC, version-consistent snapshot: every asset is
// precached together on install under a build-hash-keyed cache, and reads
// only ever come from that one cache. A new deploy bumps the build hash,
// which precaches a fresh snapshot and (via skipWaiting/clients.claim)
// serves it on the next reload. Old caches are deleted on activation.
//
// Do NOT switch the shell to stale-while-revalidate: SWR revalidates each
// asset with an independent background fetch into the shared cache, so the
// completions race and a reload can pair a fresh index.html with a stale
// app.js - silently breaking the home search/picker. Atomicity matters more
// than shaving one reload off an unchanged-hash refresh.

const BUILD_HASH = "dev-0003";
const SHELL_CACHE = "roughlogic-shell-" + BUILD_HASH;
const DATA_CACHE = "roughlogic-data-" + BUILD_HASH;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./changelog.html",
  "./changelog.js",
  // CHANGELOG.md is intentionally NOT eagerly precached. It is an
  // append-only document that grows every release (currently ~1.28 MB,
  // roughly 10x the rest of the entire shell combined), and the changelog
  // is the least safety-critical view to have offline. Eager-precaching it
  // would make every visitor pay a >1 MB download on SW install for a page
  // most never open. It is instead cached-on-access: the fetch handler
  // below `cache.put`s any successful same-origin GET, so the first
  // changelog visit (online) populates the cache and subsequent visits work
  // offline. changelog.js fails gracefully ("Could not load changelog") if
  // a never-visited install goes offline. The page chrome (changelog.html /
  // changelog.js) stays precached so the view itself always renders.
  "./styles.css",
  "./app.js",
  "./tools-data.js",
  "./pure-math.js",
  "./routing.js",
  "./hash-state.js",
  "./data-stamp.js",
  "./clipboard.js",
  "./ui-fields.js",
  "./ui-validity.js",
  "./integrity.js",
  "./calc-electrical.js",
  "./calc-solar.js",
  "./calc-powerquality.js",
  "./calc-feeder.js",
  "./calc-lowvoltage.js",
  "./calc-metalair.js",
  "./calc-gas.js",
  "./calc-pipefit.js",
  "./calc-plumbing.js",
  "./calc-septic.js",
  "./calc-service.js",
  "./calc-drainage.js",
  "./calc-hvac.js",
  "./calc-refrigerant.js",
  "./calc-hvacsystems.js",
  "./calc-velocity.js",
  "./calc-restoration.js",
  "./calc-demo.js",
  "./calc-construction.js",
  "./calc-civil.js",
  "./calc-earthwork.js",
  "./calc-fire.js",
  "./calc-rescue.js",
  "./calc-cross.js",
  "./calc-fab.js",
  "./calc-layout.js",
  "./calc-shop.js",
  "./calc-references.js",
  "./calc-trucking.js",
  "./calc-mechanic.js",
  "./calc-machining.js",
  "./calc-agriculture.js",
  "./calc-arborist.js",
  "./calc-water.js",
  "./calc-treatment.js",
  "./calc-stage.js",
  "./calc-kitchen.js",
  "./calc-field.js",
  "./calc-survey.js",
  "./calc-historical.js",
  "./calc-lab.js",
  "./calc-accounting.js",
  "./calc-legal.js",
  "./calc-vet.js",
  "./calc-ems.js",
  "./calc-aviation.js",
  "./calc-realestate.js",
  "./calc-edu.js",
  "./calc-rigging.js",
  "./v5-platform.js",
  "./citations.js",
  "./cost-output.js",
  "./context-band.js",
  "./standard-sizes.js",
  "./limitation-banner.js",
  "./tile-meta.js",
  "./search-discovery.js",
  "./manual-j-worker.js",
  "./theme.js",
  "./favicon.svg",
  "./site.webmanifest",
];

const DATA_MANIFESTS = [
  "./data/integrity.json",
  "./data/electrical/manifest.json",
  "./data/plumbing/manifest.json",
  "./data/hvac/manifest.json",
  "./data/restoration/manifest.json",
  "./data/construction/manifest.json",
  "./data/fire/manifest.json",
  "./data/physical-constants/manifest.json",
  "./data/crosswalks/manifest.json",
  "./data/summaries/manifest.json",
  "./data/trucking/manifest.json",
  "./data/historical/manifest.json",
  "./data/accounting/manifest.json",
  "./data/legal/manifest.json",
  "./data/lab/manifest.json",
  "./data/cross/manifest.json",
  "./data/field/manifest.json",
  "./data/realestate/manifest.json",
  "./data/search/manifest.json",
  "./data/search/aliases.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    // Precache with cache: "reload" so each fetch bypasses any HTTP-cache
    // entry and revalidates to the network. Defense in depth: it guarantees a
    // new-hash install builds its snapshot from current bytes rather than a
    // stale app.js still sitting in the browser cache, so the snapshot is
    // always version-consistent (a fresh index.html never pairs with a stale
    // app.js, which would silently break the home search/picker).
    const reload = (url) => new Request(url, { cache: "reload" });
    // Tolerate missing optional assets so installation does not fail in dev.
    await Promise.all(
      SHELL_ASSETS.map((url) => shell.add(reload(url)).catch(() => undefined))
    );
    const data = await caches.open(DATA_CACHE);
    await Promise.all(
      DATA_MANIFESTS.map((url) => data.add(reload(url)).catch(() => undefined))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Same origin only; the CSP forbids cross-origin connections at runtime.
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes("/data/")) {
    event.respondWith(cacheFirst(DATA_CACHE, req));
    return;
  }

  // Shell: cache-first, network fallback, with offline tolerance.
  event.respondWith(cacheFirst(SHELL_CACHE, req));
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // If the request is a navigation, serve the shell.
    if (request.mode === "navigate") {
      const shell = await caches.open(SHELL_CACHE);
      const fallback = await shell.match("./index.html");
      if (fallback) return fallback;
    }
    return new Response("", { status: 504, statusText: "offline" });
  }
}
