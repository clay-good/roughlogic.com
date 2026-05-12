# Architecture

roughlogic.com is a single-page static web application. There is no server, no account, no analytics, no telemetry, and no runtime dependency. Everything ships as same-origin static assets.

## Runtime overview

The user navigates to roughlogic.com. The browser receives index.html, styles.css, and app.js. The application boots, registers a service worker for offline use, and renders the home view with a tile grid organized into nineteen group sections (A through H plus J through T; the I letter is reserved per spec.md §5). The header search bar is the only filter; it live-filters all tile names and descriptions across every group section. (The original v1 trade-audience chip row was retired in favor of search-only navigation; the trade/group filter parameters in `routing.toolMatches` remain in the routing layer for programmatic / test use.) When non-empty, the user-curated Pinned region appears above the group sections. (The auto-tracked Recents region that previously sat above Pinned was retired in spec-v11.)

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
|  |  | pinned     |  | bundle.js |  | offline / print (I) |   | |
|  |  +------------+  +-----------+  +---------------------+   | |
|  |   dynamic-import: calc-electrical, plumbing, hvac,        | |
|  |   restoration, construction, fire, cross, references      | |
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
|  |  electrical/  plumbing/  hvac/  restoration/              | |
|  |  construction/  fire/  physical-constants/                | |
|  |  crosswalks/  summaries/                                  | |
|  +-----------------------------------------------------------+ |
+----------------------------------------------------------------+
            ^
            | build only (CI)
            |
   scripts/build-data.mjs    (NIST, NOAA, manufacturer bulletins)
```

## File layout

The on-disk layout matches spec.md section 6 exactly. The key structural rules are:

- A single index.html, styles.css, app.js, and sw.js at the repository root.
- Per-trade data folders under data/, each with a manifest.json and one or more shard JSON files.
- Build-time scripts in scripts/ never run in production.
- Test fixtures and suites under test/.
- Documentation under docs/.

## Data pipeline (build time only)

scripts/build-data.mjs runs in CI on a monthly schedule. It downloads canonical public files (NOAA climate data, NIST physical constants), parses them, produces sharded JSON in data/, writes per-dataset manifests with version and integrity hashes, and commits the result via a pull request. The build script never runs in production.

Most of roughlogic's data is static and rarely changes (physical constants do not change; lumber properties update slowly; refrigerant data is stable). The data refresh job runs monthly to reflect this lower cadence.

## Integrity

A startup integrity check (integrity.js) verifies the SHA-256 hash of each per-folder data manifest matches the hash recorded in `data/integrity.json` (a build-time sidecar produced by `scripts/build-data.mjs`). Mismatch surfaces a non-blocking banner above main content naming the affected dataset(s); the calculators still render so the user can decide whether to trust them. The banner is the spec section 7 audit trail; the read-only-by-default posture means the worst case is degraded numeric accuracy, not silent corruption of writes.

## Persistence

There is no sessionStorage, cookies, or IndexedDB. localStorage is used by `theme.js` for a single key (`rl-theme`) holding the literal string `"light"`, `"dark"`, or `"high-contrast"` so the user's chosen theme survives reloads without a flash of incorrect color. No other client-side storage mechanism is used. Pinned tiles and calculator state live in the URL hash. (The Recents ring and the `rl-bigbuttons` localStorage key were retired in spec-v11.) The service worker cache is the only other client-side persistence and it holds only the same-origin static shell and shards.

## v2 module layout

The v2 expansion (spec-v2.md) adds two modules to the lazy-loaded set
plus the existing seven calc-*.js modules:

- `calc-electrical.js`, `calc-plumbing.js`, `calc-hvac.js`, `calc-restoration.js`, `calc-construction.js`, `calc-fire.js`, `calc-cross.js` (existing; v2 utilities appended in place)
- `calc-references.js` (new; Group H knowledge references, utilities 114-118)
- `bundle.js` (new; utility 121, encode/decode/sanitize for the Project Bundle hash + JSON download)

Each calc-*.js module is dynamic-imported on first tool open, the same
pattern as v1. The home-view payload (index.html + styles.css + app.js +
integrity.js + routing.js) gzips to ~20 KB, well under the 100 KB budget
in spec.md section 11.1.

## v2 hash format

The home-view URL hash supports a multi-key form joined by `&`:

- `#p=<id1>,<id2>,...` - pinned tools
- `#b=<base64url-JSON>` - encoded Project Bundle (replaced with the resolved `p=...` form after decoding)
- `#r=<id1>,<id2>,...` (back-compat only; recents was removed in spec-v11) - resolves to home with no recents surfaced

Tool views remain `#tool` or `#tool?key=value&...`. The v2 `example=1`
parameter on a tool hash auto-clicks the renderer's "Test with example"
button after the renderer mounts.
