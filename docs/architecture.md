# Architecture

roughlogic.com is a single-page, offline-first static web application. Calculator
execution has no account, analytics, or telemetry and ships as same-origin static
assets. The sole hosted write path is a user-initiated calculator report endpoint:
a selectively routed Cloudflare Worker validates Turnstile and stores a bounded,
data-minimized reproduction record in D1.

Ordinary asset and calculator traffic never invokes that Worker code. Turnstile is
lazy-loaded only when the user opens **Report a problem**. See
[calculator-reports.md](calculator-reports.md) and
[spec-v1348](../specs/spec-v1348.md).

The report Worker is API-only and least-privileged: its sole public route is
`roughlogic.com/api/reports*`; `workers.dev` and version preview URLs are
disabled; it has only D1, four bounded public variables, and two encrypted
required secrets. It cannot read or serve the Pages asset tree.
Persisted invocation logs are disabled. Verified attempts and accepted reports
have separate daily ceilings, private controls are removed from the URL and
payload, and a daily cron deletes every report after 30 days.

## Runtime overview

The user navigates to roughlogic.com. The browser receives index.html, styles.css, and app.js. The application boots, registers a service worker for offline use, and renders the home view with a tile grid organized into twenty-one group sections (A through H, J through R, plus T, X, Y, and Z; the I letter is reserved per spec.md §5, and the v12-era Legal, Veterinary, EMS / Pre-hospital, and Aviation benches were retired in spec-v107). The header search bar is the only filter; it live-filters all tile names and descriptions across every group section. (The original v1 trade-audience chip row was retired in favor of search-only navigation; the trade/group filter parameters in `routing.toolMatches` remain in the routing layer for programmatic / test use.) When non-empty, the user-curated Pinned region appears above the group sections. (The auto-tracked Recents region that previously sat above Pinned was retired in spec-v11.)

Selecting a tile loads only the data shards relevant to that utility. No data is loaded eagerly. The largest shard is kept under one megabyte after gzip.

Most computation runs in the main thread. The simplified Manual J cooling and heating load estimators (utilities 21 and 22) and the duct sizing calculator (utility 23) run inside a Web Worker so the UI remains responsive on multi-zone inputs.

The service worker atomically caches the required application shell and data
manifests. A failed required fetch leaves the prior worker and known-good cache
active. Cache version is keyed to the build hash.

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
|  |   dynamic-import: 59 calc-* modules (the repo-root        | |
|  |   calc-*.js set, one per trade bench; each holds a        | |
|  |   documented gzip cap in check-module-sizes.mjs) plus     | |
|  |   citations / tile-meta / limitation-banner /             | |
|  |   search-discovery / hash-state / clipboard /             | |
|  |   cost-output / v5-platform                               | |
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

- A single index.html, styles.css, app.js, and sw.js at the repository root. `sw.js` precaches the app shell and the data manifests; it does **not** precache the **1844 static shells**. A shell URL opened offline therefore takes the navigation fallback, which redirects to the root and carries a tile id through as the hash (`/tools/ohms-law/` -> `/#ohms-law`). Serving index.html at the shell's own URL, as the fallback did until 2026-08-31, left every relative asset path resolving under `/tools/<id>/`, so the reader got an unstyled home view instead of the calculator they asked for.
- Per-trade data folders under data/, each with a manifest.json and one or more shard JSON files.
- Build-time scripts in scripts/ never run in production.
- Test fixtures and suites under test/.
- Documentation under docs/.

## Data pipeline (build time only)

scripts/build-data.mjs runs in CI on a tiered schedule per spec-v12 Phase H. The monthly lane ([.github/workflows/data-refresh.yml](../.github/workflows/data-refresh.yml), `0 12 1 * *`) refreshes shards whose manifests carry a monthly or longer `refresh_cadence` stamp; the weekly lane ([.github/workflows/data-refresh-weekly.yml](../.github/workflows/data-refresh-weekly.yml), `0 12 * * 1`) handles the weekly cadence. Each run downloads canonical public files (NOAA climate data, NIST physical constants, NCEI WMM coefficients, FHFA conforming loan limits, HUD Fair Market Rents, manufacturer bulletins), parses them, produces sharded JSON in data/, writes per-dataset manifests with version and integrity hashes, appends a per-source stanza to [scripts/sources.md](../scripts/sources.md) `## Last-diff log` (spec-v12 §H.3), and commits the result via a pull request. The build script never runs in production.

Most of roughlogic's data is static and rarely changes (physical constants do not change; lumber properties update slowly; refrigerant data is stable). The tiered refresh cadence (per-shard `refresh_cadence` field on every manifest per spec-v12 §H.2) reflects how often each upstream actually moves.

## Discoverability shells (build time only)

[scripts/build-shells.mjs](../scripts/build-shells.mjs) runs as a step inside [scripts/build.mjs](../scripts/build.mjs) and emits one HTML shell per tile under `dist/tools/<id>/index.html`, one per group under `dist/groups/<slug>/index.html`, and regenerates `dist/sitemap.xml` to enumerate every shell URL plus home (per spec-v13 §10.1; the changelog page it once also listed was retired in the search-first home refactor). Each shell carries title, meta description (both built by [shell-meta.js](../shell-meta.js), the single implementation the SPA's `updateHeadForTool()` also imports -- see [docs/seo.md](seo.md) for why), canonical link, Open Graph + Twitter Card meta, a JSON-LD `WebApplication` + `BreadcrumbList` block (tile shells) or `CollectionPage` + `BreadcrumbList` + `ItemList` block (group shells), a breadcrumb, an h1, a "Run the calculator" link to the SPA hash form (`/#<id>`), the worked example -- or, on the 20 tiles that take no inputs, the reference content the tile computes on nothing, a related-tiles block driven by the [scripts/related-tiles.mjs](../scripts/related-tiles.mjs) `RELATED` map (spec-v13 §5.2 / §9.1; a build-time-only module the SPA never sees), with any tile the map leaves short filled out by ranking its own name against its group siblings through `rankTools`, then one catalog-wide pass (`relatedGraph`) that appends each tile receiving no link at all to the best-ranking sibling with room under the cap of six, so every tile but `historical-pricing` (the only tile in its group) is reachable from some other tile page, and the universal-disclaimer footer. The shells carry zero JavaScript; a search-engine visitor reads a static reference page and clicks one link to open the SPA. [scripts/check-shells.mjs](../scripts/check-shells.mjs) asserts shell presence, title / description caps, JSON-LD allowlist compliance, and the gzip caps per spec-v13 §5.4 / §8.3: **6144 B** per tile shell and **69632 B** per group hub. (This sentence said "6 KB / 12 KB" until 2026-09-01; the group cap has moved nine times since it was written, and the largest hub had been over 12 KB since 2026-06-24.) [scripts/check-shell-values.mjs](../scripts/check-shell-values.mjs) covers what those do not: the numbers on the page. `render-no-nan` drives every tile in a browser and asserts the LIVE app never renders NaN / Infinity / undefined, but nothing made the same assertion about the static pages -- which are what a crawler and a no-JS reader actually get. It fails on any rendered input or answer value that is NaN, Infinity, undefined, `[object Object]`, or empty. See [docs/seo.md](seo.md) for the full model.

## Agent door (local, build-time-free)

The catalog is reachable two ways, and the second one had no entry in this document until 2026-08-30. [mcp/server.mjs](../mcp/server.mjs) is a zero-dependency [MCP](https://modelcontextprotocol.io) server that an agent runs on the user's own machine over stdio -- no hosting, no network, no deployment surface. It exposes five tools (`search_calculators`, `describe_calculator`, `run_calculator`, `answer_query`, `run_calculators`) and reads the repo directly through [mcp/catalog.mjs](../mcp/catalog.mjs): `tools-data.js` for the catalog, `test/fixtures/compute-map.js` and `renderer-map.js` for the compute and renderer registries, `test/fixtures/worked-examples.json` for the publisher-verified examples, and the alias shard for search. There is no agent-side copy of the catalog, the compute registry, or the worked examples: both doors read the same files, so the *data* cannot drift. The surfaces can, and have. Rendering and phrasing are implemented per door, and the divergences that follow -- a fallback the two wrote separately, answers scaled differently on the shell and in the browser, input keys the agent advertised that a caller could not send -- were each found by a gate rather than prevented by the design. This sentence claimed the stronger thing ("cannot drift by construction") until 2026-09-01, one paragraph above the record of a fallback that disagreed on 287 of 500 queries.

Search is the one place the two doors run the same code rather than the same data, and the invariant is stated in code:

- **Ranking.** Both call `rankTools` in [search-discovery.js](../search-discovery.js) over the same catalog and alias rows (spec-v589).
- **Fallback.** `rankTools` deliberately returns nothing for a query whose tokens are all digit-led -- a value carries no coverage -- so code sections and trade shorthand ("240.21", "62.2", "12/2") are answered by `fallbackSearch` in the same module. Both doors call that too. Until 2026-08-30 each door wrote its own fallback and they disagreed on the first result for 287 of the 500 digit-led queries the alias file implies.

Three gates hold it: [scripts/check-both-doors.mjs](../scripts/check-both-doors.mjs) asserts every tile is reachable and runnable through both doors and that the input and answer keys the agent advertises are keys a caller can actually send; `test/unit/door-parity.test.js` runs the real `search()` over the whole digit-led corpus and asserts it equals the shared pass; `test/integration/door-parity.test.js` types the same queries into the real combobox in a real browser, because `searchTools` lives inside app.js's IIFE and a Node-side restatement of it would be a gate that passes while the product is broken.

## Integrity

A startup integrity check (integrity.js) verifies the SHA-256 hash of each per-folder data manifest matches the hash recorded in `data/integrity.json` (a build-time sidecar produced by `scripts/build-data.mjs`). Mismatch surfaces a non-blocking banner above main content naming the affected dataset(s); the calculators still render so the user can decide whether to trust them. The banner is the spec section 7 audit trail; the read-only-by-default posture means the worst case is degraded numeric accuracy, not silent corruption of writes.

## Persistence

There is no sessionStorage, cookies, or IndexedDB. localStorage is used by `theme.js` for a single key (`rl-theme`) holding the literal string `"light"`, `"dark"`, or `"high-contrast"` so the user's chosen theme survives reloads without a flash of incorrect color. No other client-side storage mechanism is used. Pinned tiles and calculator state live in the URL hash. (The Recents ring and the `rl-bigbuttons` localStorage key were retired in spec-v11.) The service worker cache is the only other client-side persistence and it holds only the same-origin static shell and shards.

## v2 module layout

The v2 expansion (spec-v2.md) added the first lazy-loaded module past
the original seven trade calc-* modules. The set has since grown to 59
modules; the authoritative current inventory is the
repo-root `calc-*.js` set, each with a documented gzip cap in
`scripts/check-module-sizes.mjs`.

- `calc-electrical.js`, `calc-plumbing.js`, `calc-hvac.js`, `calc-restoration.js`, `calc-construction.js`, `calc-fire.js`, `calc-cross.js` (v1 originals; v2-v12 utilities appended in place)
- `calc-references.js` (v2 §H; knowledge references)
- `bundle.js` was added in v2 for the Project Bundle hash; **retired** in commit 5734d28 along with calc-meta and companion-strip (the bundle feature itself was rolled into the v11 surface-reduction posture - the URL hash and the per-tile pinned set continue to cover shareable / bookmarkable state).

Each calc-*.js module is dynamic-imported on first tool open, the same
pattern as v1. The home-view payload (index.html + styles.css + app.js +
integrity.js + theme.js + routing.js) gzips to **45,008 B** as of
2026-08-27, well under the 100 KB budget in spec.md section 11.1.

Two registries that once lived inside `app.js` are dynamic-imported and
are therefore outside that payload: the `TOOLS` catalog registry in
`tools-data.js`, loaded on the first search keystroke or tile route, and
the `TOOL_MODULES` tile-id to renderer table in `tool-modules.js`, loaded
on the first tile open by `loadRenderer()`. Both grow by one entry per
tile, so keeping them out of the home view is what stops first paint from
getting slower every time the catalog grows.

## v2 hash format

The home-view URL hash supports a multi-key form joined by `&`:

- `#p=<id1>,<id2>,...` - pinned tools
- `#b=<base64url-JSON>` (back-compat only; Project Bundle was retired in commit 5734d28 along with the bundle / calc-meta / companion-strip features) - resolves to home with no bundle surfaced
- `#r=<id1>,<id2>,...` (back-compat only; recents was removed in spec-v11) - resolves to home with no recents surfaced

Tool views remain `#tool` or `#tool?key=value&...`. The v2 `example=1`
parameter on a tool hash auto-clicks the renderer's "Test with example"
button after the renderer mounts.
