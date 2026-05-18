# Performance Budget

roughlogic.com targets the same performance budget as encryptalotta and sophiewell, applied from v1. The build fails when any score drops below 95.

## Budget targets (Slow 4G in Chrome DevTools / Lighthouse mobile preset)

- First Contentful Paint (FCP) under 1.0 second
- Largest Contentful Paint (LCP) under 1.5 seconds
- Time to Interactive (TTI) under 1.5 seconds
- Total Blocking Time (TBT) under 100 milliseconds
- Cumulative Layout Shift (CLS) under 0.05
- Total transfer size under 100 KB for the home view
- Total transfer size under 250 KB for any utility view including its primary data shard

## Scores

- Lighthouse Performance score >= 95
- Lighthouse Accessibility score >= 95
- Lighthouse Best Practices score >= 95
- Lighthouse SEO score >= 95

## How the budget is enforced

`lighthouserc.json` configures Lighthouse CI with the assertions above. The GitHub Actions workflow `.github/workflows/ci.yml` runs Lighthouse CI on the home view and five representative utility views (Ohm's Law, Refrigerant P-T, Friction Loss, Color Codes, Service Load: picked to cover a v1 calculator, a Group H reference page, and a v2 dynamic-loaded calculator) on every push and pull request. The build fails if any assertion is violated.

The home-view payload budget (100 KB after gzip) is enforced separately by `scripts/check-home-payload.mjs`, wired into `npm run lint`. The script gzips index.html, styles.css, app.js, integrity.js, theme.js, and routing.js (the files actually loaded on first paint; calculator modules and support libs are dynamic-imported on first tool open) and fails the build if the total exceeds 102400 bytes. As of 2026-05-17 the home-view payload is **54,817 B** (53.5% of budget; +460 B from the 2026-05-17 inline-notice fix that added five v12 per-group NOTICE constants in app.js). Per spec-v10 §H.2 the per-asset sub-budgets are HTML 20 KB / CSS 25 KB / JS 45 KB; the JS sub-budget is the tightest at **98.9%** of cap (app.js + the entry shards), so the next non-trivial home-view JS addition needs a per-tile split or refactor.

## Page weight strategy

- Single index.html, single styles.css, single app.js. No bundler in the runtime path.
- Calculator modules (24 `calc-*.js` files at v12: electrical, plumbing, hvac, restoration, construction, fire, cross, references, trucking, mechanic, agriculture, water, stage, kitchen, field, historical, accounting, legal, lab, plus the v12 group modules vet, ems, aviation, realestate, edu) and their support libs (pure-math.js, hash-state.js, data-stamp.js, clipboard.js, ui-fields.js, ui-validity.js, tile-meta.js, limitation-banner.js, search-discovery.js, context-band.js, cost-output.js, v5-platform.js, standard-sizes.js, citations.js) are loaded via dynamic ES module imports inside renderToolView, never eagerly from the home view. Each module loads at most once (cached by promise + by the service worker) on first navigation to a tool that uses it. The home-view payload is index.html + styles.css + app.js + theme.js + integrity.js + routing.js. As of 2026-05-17 this gzips to **54,817 B** (53.5% of the 100 KB budget).
- Data shards under data/ load on demand only, never eagerly. The data pipeline currently produces **123 integrity-checked shards across 18 dataset folders** (electrical, plumbing, hvac, restoration, construction, fire, cross, trucking, lab, legal, accounting, historical, search, crosswalks, summaries, physical-constants, field, and the v12 realestate folder); only the manifest hashes (one per folder) are fetched at boot for the integrity check.
- The Manual J cooling and heating estimators and the duct sizing calculator run inside a Web Worker so they do not contribute to main-thread blocking time.

## v12 per-module budgets (spec-v12 §14.3)

Each calc-* module has a `gzip` cap enforced by `scripts/check-module-sizes.mjs`. The five v12 group modules:

- `calc-vet.js`: 28,000 B cap (current ~25.1 KB gzipped at 89.7 %; covers all 18 Group U tiles plus bundled vaccine, heartworm, and toxicity tables).
- `calc-ems.js`: 27,000 B cap (current ~25.0 KB gzipped at 92.7 %, WARN; covers all 20 Group V tiles plus bundled pediatric vitals ranges and the START / JumpSTART decision trees).
- `calc-aviation.js`: 27,000 B cap (current ~25.3 KB gzipped at 93.6 %, WARN; covers all 18 Group W tiles; the METAR / TAF decoder is the largest single piece at ~6 KB).
- `calc-realestate.js`: 22,000 B cap (current ~19.9 KB gzipped at 90.4 %, WARN; covers all 15 Group X tiles).
- `calc-edu.js`: 26,000 B cap (current ~23.1 KB gzipped at 88.9 %; covers all 15 Group Y tiles).

The §14.3 starter estimates (vet 22 KB / ems 25 KB / aviation 18 KB / realestate 12 KB / edu 14 KB) were planning targets; the as-shipped modules ran over those after the full §5-§9 inventories landed (the largest overruns are aviation +6 KB and realestate +7 KB, both driven by data-shard bundling, not by code growth). Caps were lifted to the actuals plus headroom; the home-view payload budget is unaffected because every group module is dynamic-imported on first tool open.

## v13 per-shell budgets (spec-v13 §12.1)

Spec-v13 added a build-time prerender step that emits one static HTML
shell per tile (`/tools/<id>/index.html`, 385 shells) and one per group
(`/groups/<slug>/index.html`, 24 shells). The shells are separate
documents from the SPA home view, served as static files by Cloudflare
Pages and reached primarily by search crawlers and direct deep links.

Per-shell targets:

- LCP under 0.8 s on simulated 4G (a single < 6 KB gzipped HTML document
  with one cached CSS load).
- FCP under 0.6 s.
- TBT 0 ms (shells carry zero JavaScript; the "Run the calculator" link
  is a plain anchor to the SPA hash route).
- CLS under 0.01 (shells render with a deterministic layout and no
  dynamic content).

Payload caps enforced by [../scripts/check-shells.mjs](../scripts/check-shells.mjs):

- Tile shell: 6 KB gzipped.
- Group shell: 12 KB gzipped.

Live measurements at v13 close: tile shells ~1.8 KB gzipped / ~5.4 KB
raw, group shells ~3.9 KB gzipped / ~15.2 KB raw; both well under cap.
Aggregate `dist/` growth from v12 → v13 is roughly 2.5 MB uncompressed
(385 tile shells + 24 group shells + sitemap expansion). The
`scripts/build-shells.mjs` step is build-time only and does not
contribute to the home-view payload; the home view's 100 KB-after-gzip
budget is unchanged.

[../lighthouserc.json](../lighthouserc.json) audits the home URL, five
SPA hash URLs, two tile shells (`wire-ampacity`, `friction-loss`), and
one group shell (`electrical`). The Performance / Accessibility / Best
Practices scores remain ≥ 95 across all targets; the SEO score is
asserted ≥ 100 on the shell URLs per spec-v13 §12.3.

## Periodic review

The maintainer re-runs Lighthouse CI on the live site after every release. If the budget is at risk, options in priority order:

1. Reduce the JS shipped on the home view (lazy-load more calculator modules behind dynamic import).
2. Pre-compress data shards and serve from same-origin cache.
3. Trim unused data fields in shards.
