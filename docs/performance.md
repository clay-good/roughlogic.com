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

`lighthouserc.json` configures Lighthouse CI with the assertions above. The GitHub Actions workflow `.github/workflows/ci.yml` runs Lighthouse CI on the home view and three representative utility views (Ohm's Law, Refrigerant P-T, Friction Loss) on every push and pull request. The build fails if any assertion is violated.

The home-view payload budget (100 KB after gzip) is enforced separately by `scripts/check-home-payload.mjs`, wired into `npm run lint`. The script gzips index.html, styles.css, app.js, integrity.js, theme.js, and routing.js (the files actually loaded on first paint; calculator modules and support libs are dynamic-imported on first tool open) and fails the build if the total exceeds 102400 bytes. As of 2026-05-12 the home-view payload is **48,788 B** (47.6% of budget). Per spec-v10 §H.2 the per-asset sub-budgets are HTML 20 KB / CSS 25 KB / JS 40 KB; the JS sub-budget is currently the tightest at 95.4% of cap (app.js + the entry shards), so the next non-trivial home-view JS addition needs a per-tile split or refactor.

## Page weight strategy

- Single index.html, single styles.css, single app.js. No bundler in the runtime path.
- Calculator modules (19 `calc-*.js` files: electrical, plumbing, hvac, restoration, construction, fire, cross, references, trucking, mechanic, agriculture, water, stage, kitchen, field, historical, accounting, legal, lab, plus the meta-utility composer calc-meta.js and the project-bundle helper bundle.js) and their support libs (pure-math.js, hash-state.js, data-stamp.js, clipboard.js, ui-fields.js, ui-validity.js, tile-meta.js, limitation-banner.js, search-discovery.js, context-band.js, cost-output.js, v5-platform.js, standard-sizes.js, citations.js) are loaded via dynamic ES module imports inside renderToolView, never eagerly from the home view. Each module loads at most once (cached by promise + by the service worker) on first navigation to a tool that uses it. The home-view payload is index.html + styles.css + app.js + theme.js + integrity.js + routing.js. As of 2026-05-12 this gzips to **48,788 B** (47.6% of the 100 KB budget).
- Data shards under data/ load on demand only, never eagerly. The data pipeline currently produces **120 integrity-checked shards across 17 dataset folders** (electrical, plumbing, hvac, restoration, construction, fire, cross, trucking, lab, legal, accounting, historical, search, crosswalks, summaries, physical-constants, field); only the manifest hashes (one per folder) are fetched at boot for the integrity check.
- The Manual J cooling and heating estimators and the duct sizing calculator run inside a Web Worker so they do not contribute to main-thread blocking time.

## Periodic review

The maintainer re-runs Lighthouse CI on the live site after every release. If the budget is at risk, options in priority order:

1. Reduce the JS shipped on the home view (lazy-load more calculator modules behind dynamic import).
2. Pre-compress data shards and serve from same-origin cache.
3. Trim unused data fields in shards.
