// roughlogic service worker.
// Stale-while-revalidate for the application shell (instant + offline, but
// refreshed in the background so a new deploy lands on the next reload);
// cache-on-first-fetch for data shards.
// Cache name includes a build hash. Old caches are deleted on activation.

const BUILD_HASH = "dev-0002";
const SHELL_CACHE = "roughlogic-shell-" + BUILD_HASH;
const DATA_CACHE = "roughlogic-data-" + BUILD_HASH;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./changelog.html",
  "./changelog.js",
  "./CHANGELOG.md",
  "./styles.css",
  "./app.js",
  "./pure-math.js",
  "./routing.js",
  "./hash-state.js",
  "./data-stamp.js",
  "./clipboard.js",
  "./ui-fields.js",
  "./ui-validity.js",
  "./integrity.js",
  "./calc-electrical.js",
  "./calc-plumbing.js",
  "./calc-hvac.js",
  "./calc-restoration.js",
  "./calc-construction.js",
  "./calc-fire.js",
  "./calc-cross.js",
  "./calc-references.js",
  "./calc-trucking.js",
  "./calc-mechanic.js",
  "./calc-agriculture.js",
  "./calc-water.js",
  "./calc-stage.js",
  "./calc-kitchen.js",
  "./calc-field.js",
  "./calc-historical.js",
  "./calc-lab.js",
  "./calc-accounting.js",
  "./calc-legal.js",
  "./calc-vet.js",
  "./calc-ems.js",
  "./calc-aviation.js",
  "./calc-realestate.js",
  "./calc-edu.js",
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
    // Tolerate missing optional assets so installation does not fail in dev.
    await Promise.all(
      SHELL_ASSETS.map((url) => shell.add(url).catch(() => undefined))
    );
    const data = await caches.open(DATA_CACHE);
    await Promise.all(
      DATA_MANIFESTS.map((url) => data.add(url).catch(() => undefined))
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

  // Shell: stale-while-revalidate. Serve the cached copy instantly (and
  // offline), but refresh it from the network in the background so a new
  // deploy is picked up on the very next reload. `event` is passed so the
  // background revalidation can outlive the response via waitUntil.
  event.respondWith(staleWhileRevalidate(SHELL_CACHE, req, event));
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

// Stale-while-revalidate: return the cached copy immediately when present,
// and kick off a background fetch that updates the cache for the next load.
// With no cache (or offline), fall back to the network, then to the shell.
async function staleWhileRevalidate(cacheName, request, event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    // Keep the revalidation alive after we return the cached response.
    event.waitUntil(networkFetch);
    return cached;
  }

  const network = await networkFetch;
  if (network) return network;
  // Offline with nothing cached: serve the shell for navigations.
  if (request.mode === "navigate") {
    const fallback = await cache.match("./index.html");
    if (fallback) return fallback;
  }
  return new Response("", { status: 504, statusText: "offline" });
}
