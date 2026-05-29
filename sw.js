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
// app.js — silently breaking the home search/picker. Atomicity matters more
// than shaving one reload off an unchanged-hash refresh.

const BUILD_HASH = "dev-0003";
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
