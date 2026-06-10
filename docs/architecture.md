# Architecture

roughlogic.com is a single-page static web application. There is no server, no account, no analytics, no telemetry, and no runtime dependency. Everything ships as same-origin static assets.

## Runtime overview

The user navigates to roughlogic.com. The browser receives index.html, styles.css, and app.js. The application boots, registers a service worker for offline use, and renders the home view with a tile grid organized into twenty-four group sections (A through H plus J through Y; the I letter is reserved per spec.md §5; v12 added Groups U Veterinary, V EMS / Pre-hospital, W Pilots / Aviation, X Real Estate, and Y Educators / K-12). The header search bar is the only filter; it live-filters all tile names and descriptions across every group section. (The original v1 trade-audience chip row was retired in favor of search-only navigation; the trade/group filter parameters in `routing.toolMatches` remain in the routing layer for programmatic / test use.) When non-empty, the user-curated Pinned region appears above the group sections. (The auto-tracked Recents region that previously sat above Pinned was retired in spec-v11.)

Selecting a tile loads only the data shards relevant to that utility. No data is loaded eagerly. The largest shard is kept under one megabyte after gzip.

Most computation runs in the main thread. The simplified Manual J cooling and heating load estimators (utilities 21 and 22) and the duct sizing calculator (utility 23) run inside a Web Worker so the UI remains responsive on multi-zone inputs.

The service worker caches the application shell on first load. Data shards are cached on first access. Cache version is keyed to the build hash.

## ASCII architecture diagram

```
+----------------------------------------------------------------+
|                          Browser                               |
|                                                                |
|  +-------------------+    +--------------------------------+   |
|  |    index.html     |    |          styles.css            |   |
|  +-------------------+    +--------------------------------+   |
|           |                              |                     |
|           v                              v                     |
|  +-----------------------------------------------------------+ |
|  |                          app.js                           | |
|  |  +------------+  +-----------+  +---------------------+   | |
|  |  | router     |  | filters   |  | hash state / pins   |   | |
|  |  +------------+  +-----------+  +---------------------+   | |
|  |  +------------+  +-----------+  +---------------------+   | |
|  |  | calculators|  | citations |  | copy / live region  |   | |
|  |  +------------+  +-----------+  +---------------------+   | |
|  |  +------------+  +-----------+  +---------------------+   | |
|  |  | pinned     |  | theme     |  | offline / print     |   | |
|  |  +------------+  +-----------+  +---------------------+   | |
|  |   dynamic-import: 27 calc-* modules (electrical, plumbing,| |
|  |   hvac, restoration, construction, fire, cross,           | |
|  |   references, trucking, mechanic, agriculture, water,     | |
|  |   stage, kitchen, field, historical, accounting, legal,   | |
|  |   lab, vet, ems, aviation, realestate, edu, lowvoltage,   | |
|  |   pipefit, metalair) plus citations / tile-meta /         | |
|  |   limitation-banner / search-discovery / hash-state /     | |
|  |   clipboard / cost-output / v5-platform                   | |
|  +-----------------------------------------------------------+ |
|           |                              |                     |
|           v                              v                     |
|  +-------------------+    +--------------------------------+   |
|  |  Web Worker       |    |   service worker (sw.js)       |   |
|  |  Manual J / ducts |    |   shell + shard cache          |   |
|  +-------------------+    +--------------------------------+   |
|           |                              |                     |
|           v                              v                     |
|  +-----------------------------------------------------------+ |
|  |                    data/ (same-origin)                    | |
|  |  electrical/ plumbing/ hvac/ restoration/ construction/   | |
|  |  fire/ cross/ trucking/ lab/ legal/ accounting/           | |
|  |  historical/ search/ crosswalks/ summaries/               | |
|  |  physical-constants/ field/ realestate/                   | |
|  +-----------------------------------------------------------+ |
+----------------------------------------------------------------+
            ^
            | build only (CI)
            |
   scripts/build-data.mjs    (NIST, NOAA, NCEI WMM, FHFA, HUD,
                              manufacturer bulletins)
```

## File layout

The on-disk layout matches spec.md section 6 exactly. The key structural rules are:

- A single index.html, styles.css, app.js, and sw.js at the repository root.
- Per-trade data folders under data/, each with a manifest.json and one or more shard JSON files.
- Build-time scripts in scripts/ never run in production.
- Test fixtures and suites under test/.
- Documentation under docs/.

## Data pipeline (build time only)

scripts/build-data.mjs runs in CI on a tiered schedule per spec-v12 Phase H. The monthly lane ([.github/workflows/data-refresh.yml](../.github/workflows/data-refresh.yml), `0 12 1 * *`) refreshes shards whose manifests carry a monthly or longer `refresh_cadence` stamp; the weekly lane ([.github/workflows/data-refresh-weekly.yml](../.github/workflows/data-refresh-weekly.yml), `0 12 * * 1`) handles the weekly cadence. Each run downloads canonical public files (NOAA climate data, NIST physical constants, NCEI WMM coefficients, FHFA conforming loan limits, HUD Fair Market Rents, manufacturer bulletins), parses them, produces sharded JSON in data/, writes per-dataset manifests with version and integrity hashes, appends a per-source stanza to [scripts/sources.md](../scripts/sources.md) `## Last-diff log` (spec-v12 §H.3), and commits the result via a pull request. The build script never runs in production.

Most of roughlogic's data is static and rarely changes (physical constants do not change; lumber properties update slowly; refrigerant data is stable). The tiered refresh cadence (per-shard `refresh_cadence` field on every manifest per spec-v12 §H.2) reflects how often each upstream actually moves.

## Discoverability shells (build time only)

[scripts/build-shells.mjs](../scripts/build-shells.mjs) runs as a step inside [scripts/build.mjs](../scripts/build.mjs) and emits one HTML shell per tile under `dist/tools/<id>/index.html`, one per group under `dist/groups/<slug>/index.html`, and regenerates `dist/sitemap.xml` to enumerate every shell URL plus home and changelog (per spec-v13 §10.1). Each shell carries title, meta description, canonical link, Open Graph + Twitter Card meta, a JSON-LD `WebApplication` + `BreadcrumbList` block (tile shells) or `CollectionPage` + `BreadcrumbList` + `ItemList` block (group shells), a breadcrumb, an h1, a "Run the calculator" link to the SPA hash form (`/#<id>`), a related-tiles block driven by the [scripts/related-tiles.mjs](../scripts/related-tiles.mjs) `RELATED` map (spec-v13 §5.2 / §9.1; a build-time-only module the SPA never sees), and the universal-disclaimer footer. The shells carry zero JavaScript; a search-engine visitor reads a static reference page and clicks one link to open the SPA. [scripts/check-shells.mjs](../scripts/check-shells.mjs) asserts shell presence, title / description caps, JSON-LD allowlist compliance, and the 6 KB / 12 KB gzip caps per spec-v13 §5.4 / §8.3. See [docs/seo.md](seo.md) for the full model.

## Integrity

A startup integrity check (integrity.js) verifies the SHA-256 hash of each per-folder data manifest matches the hash recorded in `data/integrity.json` (a build-time sidecar produced by `scripts/build-data.mjs`). Mismatch surfaces a non-blocking banner above main content naming the affected dataset(s); the calculators still render so the user can decide whether to trust them. The banner is the spec section 7 audit trail; the read-only-by-default posture means the worst case is degraded numeric accuracy, not silent corruption of writes.

## Persistence

There is no sessionStorage, cookies, or IndexedDB. localStorage is used by `theme.js` for a single key (`rl-theme`) holding the literal string `"light"`, `"dark"`, or `"high-contrast"` so the user's chosen theme survives reloads without a flash of incorrect color. No other client-side storage mechanism is used. Pinned tiles and calculator state live in the URL hash. (The Recents ring and the `rl-bigbuttons` localStorage key were retired in spec-v11.) The service worker cache is the only other client-side persistence and it holds only the same-origin static shell and shards.

## v2 module layout

The v2 expansion (spec-v2.md) added the first lazy-loaded module past
the original seven trade calc-* modules. The set has since grown
across v3-v12; the current inventory is in the v12 calc-* list above.

- `calc-electrical.js`, `calc-plumbing.js`, `calc-hvac.js`, `calc-restoration.js`, `calc-construction.js`, `calc-fire.js`, `calc-cross.js` (v1 originals; v2-v12 utilities appended in place)
- `calc-references.js` (v2 §H; knowledge references)
- `bundle.js` was added in v2 for the Project Bundle hash; **retired** in commit 5734d28 along with calc-meta and companion-strip (the bundle feature itself was rolled into the v11 surface-reduction posture - the URL hash and the per-tile pinned set continue to cover shareable / bookmarkable state).

Each calc-*.js module is dynamic-imported on first tool open, the same
pattern as v1. The home-view payload (index.html + styles.css + app.js +
integrity.js + theme.js + routing.js) gzips to ~55 KB at v12, well under
the 100 KB budget in spec.md section 11.1.

## v2 hash format

The home-view URL hash supports a multi-key form joined by `&`:

- `#p=<id1>,<id2>,...` - pinned tools
- `#b=<base64url-JSON>` (back-compat only; Project Bundle was retired in commit 5734d28 along with the bundle / calc-meta / companion-strip features) - resolves to home with no bundle surfaced
- `#r=<id1>,<id2>,...` (back-compat only; recents was removed in spec-v11) - resolves to home with no recents surfaced

Tool views remain `#tool` or `#tool?key=value&...`. The v2 `example=1`
parameter on a tool hash auto-clicks the renderer's "Test with example"
button after the renderer mounts.
