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

const BUILD_HASH = "dev-0004";
const SHELL_CACHE = "roughlogic-shell-" + BUILD_HASH;
const DATA_CACHE = "roughlogic-data-" + BUILD_HASH;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./tool-modules.js",
  "./tools-lead.js",
  "./desc-bucket.js",
  "./pure-math.js",
  "./routing.js",
  "./text-lead.js",
  "./shell-meta.js",
  "./key-labels.js",
  "./hash-state.js",
  "./data-stamp.js",
  "./clipboard.js",
  "./ui-fields.js",
  "./field-units.js",
  "./field-bucket.js",
  "./query-fill.js",
  "./pick-card.js",
  "./tile-prefill.js",
  "./report-feedback.js",
  "./ui-validity.js",
  "./integrity.js",
  "./calc-electrical.js",
  "./calc-electricalfield.js",
  "./calc-motor.js",
  "./calc-solar.js",
  "./calc-solarfield.js",
  "./calc-powerquality.js",
  "./calc-feeder.js",
  "./calc-lowvoltage.js",
  "./calc-instrumentation.js",
  "./calc-metalair.js",
  "./calc-gas.js",
  "./calc-pipefit.js",
  "./calc-steampressure.js",
  "./calc-plumbing.js",
  "./calc-plumbingtakeoff.js",
  "./calc-plumbingcode.js",
  "./calc-septic.js",
  "./calc-service.js",
  "./calc-drainage.js",
  "./calc-hvac.js",
  "./calc-hvacairside.js",
  "./calc-refrigerant.js",
  "./calc-hvacsystems.js",
  "./calc-hvacacoustics.js",
  "./calc-velocity.js",
  "./calc-restoration.js",
  "./calc-demo.js",
  "./calc-construction.js",
  "./calc-specialtytrades.js",
  "./calc-finish.js",
  "./calc-elecdesign.js",
  "./calc-hvacservice.js",
  "./calc-disinfect.js",
  "./calc-rail.js",
  "./calc-elevator.js",
  "./calc-doorhardware.js",
  "./calc-outage.js",
  "./calc-relief.js",
  "./calc-debris.js",
  "./calc-floodfight.js",
  "./calc-usar.js",
  "./calc-reliefpower.js",
  "./calc-reliefwater.js",
  "./calc-mining.js",
  "./calc-trenchless.js",
  "./calc-sawmill.js",
  "./calc-wind.js",
  "./calc-diving.js",
  "./calc-steamplant.js",
  "./calc-lineworker.js",
  "./calc-millwright.js",
  "./calc-civil.js",
  "./calc-steel.js",
  "./calc-steelpanelzone.js",
  "./calc-concrete.js",
  "./calc-concreteplacement.js",
  "./calc-geotech.js",
  "./calc-soilsettlement.js",
  "./calc-masonry.js",
  "./calc-lateral.js",
  "./calc-earthwork.js",
  "./calc-soilproperties.js",
  "./calc-fire.js",
  "./calc-firewater.js",
  "./calc-rescue.js",
  "./calc-firesprinkler.js",
  "./calc-cross.js",
  "./calc-fab.js",
  "./calc-layout.js",
  "./calc-shop.js",
  "./calc-references.js",
  "./calc-electricalreferences.js",
  "./calc-trucking.js",
  "./calc-truckingfield.js",
  "./calc-mechanic.js",
  "./calc-marineaviation.js",
  "./calc-machining.js",
  "./calc-agriculture.js",
  "./calc-farmproduction.js",
  "./calc-airquality.js",
  "./calc-buildingperf.js",
  "./calc-process.js",
  "./calc-inspection.js",
  "./calc-hygiene.js",
  "./calc-pool.js",
  "./calc-containment.js",
  "./calc-finishing.js",
  "./calc-winterops.js",
  "./calc-controls.js",
  "./calc-telecom.js",
  "./calc-datacenter.js",
  "./calc-warehouse.js",
  "./calc-marine.js",
  "./calc-waste.js",
  "./calc-greenhouse.js",
  "./calc-corrosion.js",
  "./calc-brewing.js",
  "./calc-oilgas.js",
  "./calc-refrigeration.js",
  "./calc-arborist.js",
  "./calc-arboriculture.js",
  "./calc-water.js",
  "./calc-treatment.js",
  "./calc-openchannel.js",
  "./calc-stage.js",
  "./calc-stageproduction.js",
  "./calc-kitchen.js",
  "./calc-field.js",
  "./calc-survey.js",
  "./calc-historical.js",
  "./calc-lab.js",
  "./calc-labmolecular.js",
  "./calc-accounting.js",
  "./calc-contractorfinance.js",
  "./calc-operations-finance.js",
  "./calc-safety.js",
  "./calc-realestate.js",
  "./calc-edu.js",
  "./calc-educationassessment.js",
  "./calc-rigging.js",
  "./calc-riggingfield.js",
  "./v5-platform.js",
  "./citation-block.js",
  "./citation-bucket.js",
  "./steam-tables.js",
  "./constant-notes.js",
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
  // Per-group alias shards (spec-v590 split remediation; generated by
  // scripts/build-alias-shards.mjs -- the aliases.json master is the
  // authoring source and is intentionally NOT precached).
  "./data/search/aliases-a.json",
  "./data/search/aliases-b.json",
  "./data/search/aliases-c.json",
  "./data/search/aliases-d.json",
  "./data/search/aliases-e.json",
  "./data/search/aliases-f.json",
  "./data/search/aliases-g.json",
  "./data/search/aliases-h.json",
  "./data/search/aliases-j.json",
  "./data/search/aliases-k.json",
  "./data/search/aliases-l.json",
  "./data/search/aliases-m.json",
  "./data/search/aliases-n.json",
  "./data/search/aliases-o.json",
  "./data/search/aliases-p.json",
  "./data/search/aliases-q.json",
  "./data/search/aliases-r.json",
  "./data/search/aliases-t.json",
  "./data/search/aliases-x.json",
  "./data/search/aliases-y.json",
  "./data/search/aliases-z.json",
  "./data/search/slots.json",
  "./data/search/preview-map.json",
  "./data/desc/manifest.json",
  // Tile descriptions after the opening sentence, one shard per first letter
  // of the tile id (see desc-bucket.js). Generated by
  // scripts/build-catalog-lead.mjs from tools-data.js; precached so search and
  // every Details section work offline.
  "./data/desc/a.json",
  "./data/desc/b.json",
  "./data/desc/c.json",
  "./data/desc/d.json",
  "./data/desc/e.json",
  "./data/desc/f.json",
  "./data/desc/g.json",
  "./data/desc/h.json",
  "./data/desc/i.json",
  "./data/desc/j.json",
  "./data/desc/k.json",
  "./data/desc/l.json",
  "./data/desc/m.json",
  "./data/desc/n.json",
  "./data/desc/o.json",
  "./data/desc/p.json",
  "./data/desc/q.json",
  "./data/desc/r.json",
  "./data/desc/s.json",
  "./data/desc/t.json",
  "./data/desc/u.json",
  "./data/desc/v.json",
  "./data/desc/w.json",
  "./data/desc/y.json",
  "./data/desc/z.json",
  "./data/citations/manifest.json",
  // Per-tile structured citations, 64 shards by a hash of the tile id (see
  // citation-bucket.js). Generated by scripts/build-citation-shards.mjs from
  // citations.js; precached so every reference block works offline.
  "./data/citations/00.json",
  "./data/citations/01.json",
  "./data/citations/02.json",
  "./data/citations/03.json",
  "./data/citations/04.json",
  "./data/citations/05.json",
  "./data/citations/06.json",
  "./data/citations/07.json",
  "./data/citations/08.json",
  "./data/citations/09.json",
  "./data/citations/10.json",
  "./data/citations/11.json",
  "./data/citations/12.json",
  "./data/citations/13.json",
  "./data/citations/14.json",
  "./data/citations/15.json",
  "./data/citations/16.json",
  "./data/citations/17.json",
  "./data/citations/18.json",
  "./data/citations/19.json",
  "./data/citations/20.json",
  "./data/citations/21.json",
  "./data/citations/22.json",
  "./data/citations/23.json",
  "./data/citations/24.json",
  "./data/citations/25.json",
  "./data/citations/26.json",
  "./data/citations/27.json",
  "./data/citations/28.json",
  "./data/citations/29.json",
  "./data/citations/30.json",
  "./data/citations/31.json",
  "./data/citations/32.json",
  "./data/citations/33.json",
  "./data/citations/34.json",
  "./data/citations/35.json",
  "./data/citations/36.json",
  "./data/citations/37.json",
  "./data/citations/38.json",
  "./data/citations/39.json",
  "./data/citations/40.json",
  "./data/citations/41.json",
  "./data/citations/42.json",
  "./data/citations/43.json",
  "./data/citations/44.json",
  "./data/citations/45.json",
  "./data/citations/46.json",
  "./data/citations/47.json",
  "./data/citations/48.json",
  "./data/citations/49.json",
  "./data/citations/50.json",
  "./data/citations/51.json",
  "./data/citations/52.json",
  "./data/citations/53.json",
  "./data/citations/54.json",
  "./data/citations/55.json",
  "./data/citations/56.json",
  "./data/citations/57.json",
  "./data/citations/58.json",
  "./data/citations/59.json",
  "./data/citations/60.json",
  "./data/citations/61.json",
  "./data/citations/62.json",
  "./data/citations/63.json",
  "./data/fields/manifest.json",
  // spec-v1339 field descriptors, one shard per tile group (group E is split
  // in two; see SPLIT_GROUPS in field-bucket.js). Generated by
  // scripts/build-field-index.mjs from the renderers' own schemas.
  "./data/fields/a.json",
  "./data/fields/b.json",
  "./data/fields/c.json",
  "./data/fields/d.json",
  "./data/fields/e-1.json",
  "./data/fields/e-2.json",
  "./data/fields/e-3.json",
  "./data/fields/e-4.json",
  "./data/fields/f.json",
  "./data/fields/g.json",
  "./data/fields/h.json",
  "./data/fields/j.json",
  "./data/fields/k.json",
  "./data/fields/l.json",
  "./data/fields/m.json",
  "./data/fields/n.json",
  "./data/fields/o.json",
  "./data/fields/p.json",
  "./data/fields/q.json",
  "./data/fields/r.json",
  "./data/fields/t.json",
  "./data/fields/x.json",
  "./data/fields/y.json",
  "./data/fields/z.json",
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
    // Fail the install if any required asset is unavailable. The current
    // worker remains active, and this partial cache can never reach activate
    // or delete the known-good offline snapshot.
    await Promise.all(SHELL_ASSETS.map((url) => shell.add(reload(url))));
    const data = await caches.open(DATA_CACHE);
    await Promise.all(DATA_MANIFESTS.map((url) => data.add(reload(url))));
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
  // The service worker owns only this origin. Turnstile's reviewed external
  // script/frame exception never enters this fetch handler.
  if (url.origin !== self.location.origin) return;

  // Reporting configuration is a live kill-switch surface. Never cache API
  // responses in the versioned offline shell or an old public sitekey could
  // make a disabled report path look available until the next site build.
  if (url.pathname.startsWith("/api/")) return;

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
      // No static shell is precached -- 1,826 pages is not a precache -- so a
      // reader who bookmarks /tools/ohms-law/ and opens it offline lands here.
      // Handing them index.html AT THAT URL was worse than it looked: every
      // asset in that document is a RELATIVE path, so styles.css and app.js
      // resolved to /tools/ohms-law/styles.css and 504'd. Measured
      // 2026-08-31: an unstyled page showing the home view's "Field math,
      // answered.", not the calculator that was asked for.
      //
      // Redirect to the root instead, carrying the tile as the hash the SPA
      // already routes on. The root document IS precached, its relative paths
      // resolve, and the reader gets the calculator they navigated to. Never
      // redirect the root itself: that is the one navigation that must fall
      // through to the cached document, and redirecting it would loop.
      const url = new URL(request.url);
      const scope = new URL(self.registration.scope);
      const rest = url.pathname.slice(scope.pathname.length);
      if (rest && rest !== "index.html") {
        const tile = rest.match(/^tools\/([a-z0-9-]+)\/?$/);
        const target = new URL(scope.pathname + (tile ? "#" + tile[1] : ""), url.origin);
        return Response.redirect(target.href, 302);
      }
      const fallback = await shell.match("./index.html");
      if (fallback) return fallback;
    }
    return new Response("", { status: 504, statusText: "offline" });
  }
}
